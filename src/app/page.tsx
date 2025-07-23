"use client";

import { useState } from "react";
import FolderSelector from "@/components/folder-selector";

export default function Home() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const handleFolderSelect = (path: string) => {
    setSelectedFolder(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to OpenCode Dashboard
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Select a folder from your filesystem to get started
          </p>
        </div>

        {!selectedFolder ? (
          <FolderSelector onFolderSelect={handleFolderSelect} />
        ) : (
          <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Folder Selected!
              </h2>
              <div className="p-4 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded mb-4">
                <p className="text-green-800 dark:text-green-300 font-mono text-sm">
                  {selectedFolder}
                </p>
              </div>
              <button
                onClick={() => setSelectedFolder(null)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Select Different Folder
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
