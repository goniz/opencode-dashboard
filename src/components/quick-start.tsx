"use client";

import { useState, useEffect } from "react";
import { Button } from "../../button";
import { cn } from "@/lib/utils";
import { FolderIcon, BrainIcon, ClockIcon, RocketIcon, PlayIcon, Square } from "lucide-react";
import FolderSelector from "./folder-selector";
import ModelSelector from "./model-selector";
import { useOpenCodeSessionContext } from "@/contexts/OpenCodeWorkspaceContext";

interface RecentFolder {
  path: string;
  name: string;
  lastUsedModel: string;
  lastUsed: Date;
  projectType?: string;
}



interface QuickStartProps {
  onWorkspaceCreated: (workspaceData: { folder: string; model: string; autoOpenChat?: boolean }) => void;
  onWorkspaceOpen?: (workspaceId: string) => void;
  className?: string;
}



export default function QuickStart({ onWorkspaceCreated, onWorkspaceOpen, className }: QuickStartProps) {
  const { sessions, switchToSession, stopSession } = useOpenCodeSessionContext();
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

  const runningWorkspaces = sessions.filter(session => session.status === "running");

  const handleOpenWorkspace = async (sessionId: string) => {
    await switchToSession(sessionId);
    if (onWorkspaceOpen) {
      onWorkspaceOpen(sessionId);
    }
  };

  const handleStopWorkspace = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await stopSession(sessionId);
  };

  return (
    <div className={cn("w-full max-w-5xl mx-auto px-4", className)}>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-3">Quick Start</h1>
        <p className="text-xl text-muted-foreground">
          Get coding in seconds with your recent folder + model combinations
        </p>
      </div>

      {/* Running Workspaces */}
      {runningWorkspaces.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <PlayIcon className="w-6 h-6 text-green-500" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">Running Workspaces</h2>
              <p className="text-muted-foreground">Continue working on your active projects</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {runningWorkspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="p-6 bg-background rounded-xl border border-border hover:border-green-500/30 hover:bg-muted/50 hover:shadow-md transition-all duration-200 text-left group relative overflow-hidden cursor-pointer"
                onClick={() => handleOpenWorkspace(workspace.id)}
              >
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <FolderIcon className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate text-lg">
                          {workspace.folder.split("/").pop() || workspace.folder}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">{workspace.folder}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <div
                        onClick={(e) => handleStopWorkspace(workspace.id, e)}
                        className="p-1 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Stop workspace"
                      >
                        <Square className="w-4 h-4 text-red-500" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <BrainIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">{workspace.model}</span>
                  </div>
                  
                  <div className="mt-3 flex items-center gap-2">
                    <div className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                      Port {workspace.port}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-2 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <RocketIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Click to open chat</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Folder+Model Combinations */}
      {recentFolders.length > 0 ? (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <ClockIcon className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">Recent Combinations</h2>
              <p className="text-muted-foreground">Continue where you left off with your recent folder + model combinations</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentFolders.map((folder, index) => (
              <button
                key={index}
                onClick={() => handleRecentFolderSelect(folder)}
                disabled={isCreating}
                className="p-6 bg-background rounded-xl border border-border hover:border-primary/30 hover:bg-muted/50 hover:shadow-md transition-all duration-200 text-left group relative overflow-hidden"
              >
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FolderIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate text-lg">{folder.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{folder.path}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full whitespace-nowrap">
                      {formatTimeAgo(folder.lastUsed)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <BrainIcon className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">{folder.lastUsedModel}</span>
                  </div>
                  
                  {folder.projectType && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        folder.projectType === 'react' ? 'bg-blue-500' :
                        folder.projectType === 'python' ? 'bg-green-500' :
                        folder.projectType === 'nodejs' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`} />
                      <span className="text-xs text-muted-foreground capitalize">{folder.projectType} project</span>
                    </div>
                  )}
                  
                  <div className="mt-4 flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <RocketIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Click to start coding</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-8 text-center py-12">
          <div className="p-4 bg-muted/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <ClockIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Recent Projects</h3>
          <p className="text-muted-foreground mb-6">Create your first workspace to see recent combinations here</p>
        </div>
      )}



      {/* Create New Workspace */}
      <div className="text-center">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">Create New Workspace</h2>
          <p className="text-muted-foreground">Start a new project or work with a different folder</p>
        </div>
        <Button
          onClick={() => setShowCustomCreation(true)}
          disabled={isCreating}
          size="lg"
          className="px-8 py-4 text-lg"
        >
          <FolderIcon className="w-5 h-5 mr-3" />
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