"use client";

import { useState, useEffect } from "react";
import { Button } from "../../button";
import { cn } from "@/lib/utils";
import { FolderIcon, BrainIcon, ClockIcon, RocketIcon, FileIcon, CodeIcon, DatabaseIcon, GlobeIcon } from "lucide-react";
import FolderSelector from "./folder-selector";
import ModelSelector from "./model-selector";

interface RecentFolder {
  path: string;
  name: string;
  lastUsedModel: string;
  lastUsed: Date;
  projectType?: string;
}

interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  defaultModel: string;
  folderPattern?: string;
  quickActions?: string[];
}

interface QuickStartProps {
  onWorkspaceCreated: (workspaceData: { folder: string; model: string; autoOpenChat?: boolean }) => void;
  className?: string;
}

const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: "react",
    name: "React/Next.js",
    description: "Modern React applications with TypeScript",
    icon: <CodeIcon className="w-5 h-5" />,
    defaultModel: "claude-3-5-sonnet-20241022",
    folderPattern: "package.json",
    quickActions: ["Component creation", "State management", "API integration"]
  },
  {
    id: "python",
    name: "Python",
    description: "Python projects with Django/Flask support",
    icon: <DatabaseIcon className="w-5 h-5" />,
    defaultModel: "claude-3-5-sonnet-20241022",
    folderPattern: "requirements.txt",
    quickActions: ["Script writing", "Data analysis", "API development"]
  },
  {
    id: "nodejs",
    name: "Node.js",
    description: "Backend services and Express applications",
    icon: <GlobeIcon className="w-5 h-5" />,
    defaultModel: "claude-3-5-sonnet-20241022",
    folderPattern: "package.json",
    quickActions: ["API endpoints", "Database integration", "Middleware"]
  },
  {
    id: "generic",
    name: "General",
    description: "Any project type with flexible configuration",
    icon: <FileIcon className="w-5 h-5" />,
    defaultModel: "claude-3-5-sonnet-20241022",
    quickActions: ["Code review", "Documentation", "Debugging"]
  }
];

export default function QuickStart({ onWorkspaceCreated, className }: QuickStartProps) {
  const [recentFolders, setRecentFolders] = useState<RecentFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCustomCreation, setShowCustomCreation] = useState(false);
  const [showFolderSelector, setShowFolderSelector] = useState(false);

  // Load recent folders from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentWorkspaceFolders");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentFolders(parsed.map((item: { path: string; name: string; lastUsedModel: string; lastUsed: string; projectType?: string }) => ({
          ...item,
          lastUsed: new Date(item.lastUsed)
        })));
      } catch (error) {
        console.error("Failed to parse recent folders:", error);
      }
    }
  }, []);



  const saveRecentFolder = (folder: string, model: string) => {
    const folderName = folder.split("/").pop() || folder;
    const newRecentFolder: RecentFolder = {
      path: folder,
      name: folderName,
      lastUsedModel: model,
      lastUsed: new Date(),
      projectType: detectProjectType(folder)
    };

    const updatedRecent = [
      newRecentFolder,
      ...recentFolders.filter(rf => rf.path !== folder)
    ].slice(0, 5);

    setRecentFolders(updatedRecent);
    localStorage.setItem("recentWorkspaceFolders", JSON.stringify(updatedRecent));
  };

  const detectProjectType = (folderPath: string): string => {
    // This would ideally check the folder contents, but for now we'll use simple heuristics
    const folderName = folderPath.toLowerCase();
    if (folderName.includes("react") || folderName.includes("next")) return "react";
    if (folderName.includes("python") || folderName.includes("django")) return "python";
    if (folderName.includes("node") || folderName.includes("express")) return "nodejs";
    return "generic";
  };

  const handleRecentFolderSelect = async (recentFolder: RecentFolder) => {
    setSelectedFolder(recentFolder.path);
    setSelectedModel(recentFolder.lastUsedModel);
    
    // Create workspace immediately for recent folders
    setIsCreating(true);
    try {
      saveRecentFolder(recentFolder.path, recentFolder.lastUsedModel);
      onWorkspaceCreated({
        folder: recentFolder.path,
        model: recentFolder.lastUsedModel,
        autoOpenChat: true
      });
    } catch (error) {
      console.error("Failed to create workspace:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleTemplateSelect = async (template: WorkspaceTemplate) => {
    // For templates, we need to let user select a folder
    setSelectedModel(template.defaultModel);
    setShowCustomCreation(true);
  };

  const handleCustomFolderSelect = () => {
    setShowFolderSelector(true);
  };

  const handleFolderSelected = (folderPath: string) => {
    setSelectedFolder(folderPath);
    setShowFolderSelector(false);
    setShowCustomCreation(true);
  };

  const handleCreateWorkspace = async () => {
    if (!selectedFolder || !selectedModel) return;

    setIsCreating(true);
    try {
      saveRecentFolder(selectedFolder, selectedModel);
      onWorkspaceCreated({
        folder: selectedFolder,
        model: selectedModel,
        autoOpenChat: true
      });
    } catch (error) {
      console.error("Failed to create workspace:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (showFolderSelector) {
    return (
      <div className={cn("w-full max-w-4xl mx-auto px-4", className)}>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Select Project Folder</h2>
            <Button variant="outline" onClick={() => setShowFolderSelector(false)}>
              Back to Quick Start
            </Button>
          </div>
        </div>
        <FolderSelector onFolderSelect={handleFolderSelected} />
      </div>
    );
  }

  if (showCustomCreation) {
    return (
      <div className={cn("w-full max-w-4xl mx-auto px-4", className)}>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Create Custom Workspace</h2>
            <Button variant="outline" onClick={() => setShowCustomCreation(false)}>
              Back to Quick Start
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Folder Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Select Folder</h3>
            <Button
              variant="outline"
              onClick={handleCustomFolderSelect}
              className="w-full h-20 flex flex-col items-center justify-center gap-2"
            >
              <FolderIcon className="w-6 h-6" />
              <span>Browse for Folder</span>
            </Button>
            {selectedFolder && (
              <div className="p-3 bg-muted rounded text-sm font-mono">
                {selectedFolder}
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Select Model</h3>
            {selectedFolder ? (
              <ModelSelector 
                folderPath={selectedFolder} 
                defaultModel={selectedModel || undefined}
                onModelSelect={setSelectedModel}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Please select a folder first
              </div>
            )}
          </div>
        </div>

        {selectedFolder && selectedModel && (
          <div className="mt-6 flex justify-center">
            <Button
              onClick={handleCreateWorkspace}
              disabled={isCreating}
              className="px-8 py-3 text-lg"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Workspace...
                </>
              ) : (
                <>
                  <RocketIcon className="w-4 h-4 mr-2" />
                  Create & Open Chat
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-full max-w-4xl mx-auto px-4", className)}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Quick Start</h1>
        <p className="text-lg text-muted-foreground">
          Get coding in seconds with your recent projects or templates
        </p>
      </div>

      {/* Recent Folders */}
      {recentFolders.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <ClockIcon className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Recent Projects</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {recentFolders.map((folder, index) => (
              <button
                key={index}
                onClick={() => handleRecentFolderSelect(folder)}
                disabled={isCreating}
                className="p-4 bg-background rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors text-left group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FolderIcon className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground truncate">{folder.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatTimeAgo(folder.lastUsed)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BrainIcon className="w-3 h-3" />
                  <span className="truncate">{folder.lastUsedModel}</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground font-mono truncate">
                  {folder.path}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Workspace Templates */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">Project Templates</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {WORKSPACE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              disabled={isCreating}
              className="p-4 bg-background rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="text-primary">{template.icon}</div>
                <span className="font-medium text-foreground">{template.name}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
              <div className="text-xs text-muted-foreground">
                Default: {template.defaultModel.split("-").slice(0, 2).join("-")}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Creation */}
      <div className="text-center">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-foreground mb-2">Custom Workspace</h2>
          <p className="text-muted-foreground">Need something different? Create a custom workspace</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowCustomCreation(true)}
          disabled={isCreating}
          className="px-6 py-3"
        >
          <FolderIcon className="w-4 h-4 mr-2" />
          Browse for Folder
        </Button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg border border-border shadow-lg text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-foreground font-medium">Creating workspace...</p>
            <p className="text-sm text-muted-foreground mt-1">This will open chat automatically</p>
          </div>
        </div>
      )}
    </div>
  );
}