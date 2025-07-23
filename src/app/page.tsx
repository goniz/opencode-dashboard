"use client";

import { useState } from "react";
import FolderSelector from "@/components/folder-selector";
import ModelSelector from "@/components/model-selector";

export default function Home() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const handleFolderSelect = (path: string) => {
    setSelectedFolder(path);
    setSelectedModel(null); // Reset model selection when folder changes
  };

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
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
        ) : !selectedModel ? (
          <div className="space-y-6">
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
            <ModelSelector 
              folderPath={selectedFolder} 
              onModelSelect={handleModelSelect} 
            />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Ready to Start!
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded">
                  <p className="text-green-800 dark:text-green-300 font-mono text-sm">
                    Folder: {selectedFolder}
                  </p>
                </div>
                <div className="p-4 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded">
                  <p className="text-blue-800 dark:text-blue-300 font-mono text-sm">
                    Model: {selectedModel}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-center mt-6">
                <button
                  onClick={() => setSelectedModel(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Change Model
                </button>
                <button
                  onClick={() => setSelectedFolder(null)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Change Folder
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
