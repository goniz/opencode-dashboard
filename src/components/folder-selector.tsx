"use client";

import { useState, useEffect } from "react";
import { Button } from "../../button";
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
    <div className={cn("w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg", className)}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Select a Folder</h2>
        <div className="flex items-center gap-2 mb-4">
          <Button
            onClick={goUp}
            variant="outline"
            size="sm"
            disabled={loading || currentPath === "/"}
          >
            ↑ Up
          </Button>
          <div className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
            {currentPath || "Loading..."}
          </div>
          <Button
            onClick={handleSelectCurrent}
            disabled={loading || !currentPath}
          >
            Select This Folder
          </Button>
        </div>
      </div>

      {recentDirs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Recent Directories</h3>
          <div className="flex flex-wrap gap-2">
            {recentDirs.map((dir, index) => (
              <Button
                key={index}
                onClick={() => handleRecentClick(dir)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {dir.split("/").pop() || dir}
              </Button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading folders...</div>
        ) : folders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No folders found</div>
        ) : (
          folders.map((folder) => (
            <button
              key={folder.path}
              onClick={() => handleFolderClick(folder)}
              className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-blue-500">📁</span>
                <span className="font-medium">{folder.name}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}