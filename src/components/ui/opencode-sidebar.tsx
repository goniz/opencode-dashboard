"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import { useTaskContext } from "@/contexts/TaskContext";
import { 
  PlusIcon, 
  SearchIcon, 
  FolderIcon, 
  BrainIcon, 
  BookIcon,
  UsersIcon,
  SettingsIcon
} from "lucide-react";

interface OpenCodeSidebarProps {
  className?: string;
  onOpenWorkspace?: (workspaceId: string) => void;
  onCreateNewWorkspace?: () => void;
}

export function OpenCodeSidebar({ 
  className, 
  onOpenWorkspace,
  onCreateNewWorkspace
}: OpenCodeSidebarProps) {
  const { tasks, currentTask, codebases, isLoading } = useTaskContext();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter tasks based on search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter(task => 
      task.title.toLowerCase().includes(query) ||
      task.folder.toLowerCase().includes(query) ||
      task.model.toLowerCase().includes(query)
    );
  }, [tasks, searchQuery]);

  // Filter codebases based on search query
  const filteredCodebases = useMemo(() => {
    if (!searchQuery) return codebases;
    const query = searchQuery.toLowerCase();
    return codebases.filter(codebase => 
      codebase.name.toLowerCase().includes(query) ||
      codebase.path.toLowerCase().includes(query)
    );
  }, [codebases, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "text-green-500";
      case "in-progress":
        return "text-amber-500";
      case "completed":
        return "text-green-500";
      case "failed":
        return "text-red-500";
      case "pending":
        return "text-blue-500";
      case "starting":
        return "text-amber-500";
      case "stopped":
        return "text-gray-500";
      case "error":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-gray-900 text-white border-r border-gray-700",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">OpenCode</h1>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCreateNewWorkspace}
            className="p-2 rounded-full hover:bg-gray-800"
            aria-label="Create new workspace"
          >
            <PlusIcon className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
      </div>

      {/* Workspaces Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Workspaces</h2>
            <span className="text-xs text-gray-400">{filteredTasks.length}</span>
          </div>
          
          {isLoading ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-sm">
              {searchQuery ? "No matching workspaces" : "No workspaces yet"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onOpenWorkspace?.(task.id)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-colors",
                    "hover:bg-gray-800",
                    currentTask?.id === task.id ? "bg-gray-800 border border-purple-600/50" : "bg-gray-800/50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium truncate">{task.title}</h3>
                        <div className={cn("w-2 h-2 rounded-full", getStatusColor(task.status))} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <FolderIcon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{task.folder.split("/").pop()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                        <BrainIcon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{task.model}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Codebases Section */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Codebases</h2>
            <span className="text-xs text-gray-400">{filteredCodebases.length}</span>
          </div>
          
          {filteredCodebases.length === 0 ? (
            <div className="text-center py-2 text-gray-400 text-sm">
              {searchQuery ? "No matching codebases" : "No codebases"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCodebases.map((codebase) => (
                <div
                  key={codebase.id}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
                >
                  <FolderIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{codebase.name}</p>
                    <p className="text-xs text-gray-400 truncate">{codebase.path}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="p-4 border-t border-gray-800">
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <BookIcon className="w-4 h-4" />
            <span>Documentation</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <UsersIcon className="w-4 h-4" />
            <span>Community</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </Button>
        </div>
      </div>
    </div>
  );
}