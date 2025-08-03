"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/button";
import { cn } from "@/lib/utils";

interface Folder {
  name: string;
  path: string;
}

interface FolderSelectorProps {
  onFolderSelect: (path: string) => void;
  className?: string;
}

export default function FolderSelector({ onFolderSelect, className }: FolderSelectorProps) {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentDirs, setRecentDirs] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("recentDirectories");
    if (saved) {
      setRecentDirs(JSON.parse(saved));
    }
    loadFolders();
  }, []);

  const loadFolders = async (path?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = new URL("/api/folders", window.location.origin);
      if (path) {
        url.searchParams.set("path", path);
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to load folders");
      }
      
      const data = await response.json();
      setCurrentPath(data.currentPath);
      setFolders(data.folders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder: Folder) => {
    loadFolders(folder.path);
  };

  const handleSelectCurrent = () => {
    const updatedRecent = [currentPath, ...recentDirs.filter(dir => dir !== currentPath)].slice(0, 5);
    setRecentDirs(updatedRecent);
    localStorage.setItem("recentDirectories", JSON.stringify(updatedRecent));
    onFolderSelect(currentPath);
  };

  const handleRecentClick = (path: string) => {
    loadFolders(path);
  };

  const goUp = () => {
    const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/";
    loadFolders(parentPath);
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto p-4 md:p-6 bg-background rounded-lg shadow-lg border border-border", className)}>
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Select a Folder</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
          <Button
            onClick={goUp}
            variant="outline"
            size="sm"
            disabled={loading || currentPath === "/"}
            className="w-full sm:w-auto min-h-[44px] lg:min-h-0"
          >
            ↑ Up
          </Button>
          <div className="flex-1 px-3 py-2 bg-muted rounded text-xs md:text-sm font-mono break-all">
            {currentPath || "Loading..."}
          </div>
          <Button
            onClick={handleSelectCurrent}
            disabled={loading || !currentPath}
            className="w-full sm:w-auto min-h-[44px] lg:min-h-0"
          >
            <span className="hidden sm:inline">Select This Folder</span>
            <span className="sm:hidden">Select</span>
          </Button>
        </div>
      </div>

      {recentDirs.length > 0 && (
        <div className="mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-semibold mb-2">Recent Directories</h3>
          <div className="flex flex-wrap gap-2">
            {recentDirs.map((dir, index) => (
              <Button
                key={index}
                onClick={() => handleRecentClick(dir)}
                variant="outline"
                size="sm"
                className="text-xs min-h-[44px] lg:min-h-0"
              >
                {dir.split("/").pop() || dir}
              </Button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm break-words">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-6 md:py-8 text-muted-foreground">Loading folders...</div>
        ) : folders.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-muted-foreground">No folders found</div>
        ) : (
          folders.map((folder) => (
            <button
              key={folder.path}
              onClick={() => handleFolderClick(folder)}
              className="w-full text-left p-3 hover:bg-muted/50 rounded border border-border transition-colors touch-manipulation min-h-[44px] flex items-center"
            >
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="text-primary text-lg">📁</span>
                <span className="font-medium text-sm md:text-base truncate">{folder.name}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}