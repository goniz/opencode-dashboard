"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import { 
  PlusIcon, 
  FolderIcon, 
  ChevronLeftIcon,
  Loader2Icon
} from "lucide-react";
import FolderSelector from "@/components/folder-selector";
import { useTaskContext } from "@/contexts/TaskContext";

interface NewWorkspaceFormProps {
  className?: string;
  onBackToSidebar?: () => void;
  onWorkspaceCreated?: (workspaceId: string) => void;
}

export function NewWorkspaceForm({ 
  className, 
  onBackToSidebar,
  onWorkspaceCreated
}: NewWorkspaceFormProps) {
  const { createTask, isLoading } = useTaskContext();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFolderSelected = (folderPath: string) => {
    setSelectedFolder(folderPath);
    setShowFolderSelector(false);
  };

  const handleCreateWorkspace = async () => {
    if (!selectedFolder) {
      setError("Please select a folder");
      return;
    }

    try {
      setError(null);
      // Create workspace with a default model, user will select model when creating tasks
      const task = await createTask(selectedFolder, "openai/gpt-4o");
      onWorkspaceCreated?.(task.id);
    } catch (err) {
      console.error("Failed to create workspace:", err);
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    }
  };

  if (showFolderSelector) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="p-4 border-b border-gray-700">
          <Button 
            variant="ghost" 
            onClick={() => setShowFolderSelector(false)}
            className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-gray-800 mb-4"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Back
          </Button>
          <h2 className="text-lg font-semibold text-white">Select Folder</h2>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <FolderSelector onFolderSelect={handleFolderSelected} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={onBackToSidebar}
            className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-lg font-semibold text-white">New Workspace</h1>
          <div className="w-8" /> {/* Spacer for alignment */}
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-md mx-auto space-y-6">
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Folder Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FolderIcon className="w-5 h-5 text-purple-500" />
              <label className="text-sm font-medium text-gray-300">Project Folder</label>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFolderSelector(true)}
              className="w-full h-12 flex items-center justify-between px-4 py-2 bg-gray-800 border-gray-700 hover:bg-gray-700 text-left"
            >
              <span className="text-sm truncate">
                {selectedFolder ? selectedFolder.split("/").pop() : "Select folder"}
              </span>
              <PlusIcon className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
            </Button>
            {selectedFolder && (
              <div className="text-xs text-gray-400 truncate px-2">
                {selectedFolder}
              </div>
            )}
          </div>

          {/* Info about model selection */}
          <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <p className="text-sm text-gray-300">
              You will select the AI model when creating tasks in your workspace.
            </p>
          </div>

          {/* Create Button */}
          <div className="pt-4">
            <Button
              onClick={handleCreateWorkspace}
              disabled={!selectedFolder || isLoading}
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                  Creating Workspace...
                </>
              ) : (
                "Create Workspace"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}