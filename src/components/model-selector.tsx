"use client";

import { useState, useEffect } from "react";
import { Button } from "../../button";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  folderPath: string;
  defaultModel?: string;
  onModelSelect: (model: string) => void;
  className?: string;
}

export default function ModelSelector({ folderPath, defaultModel, onModelSelect, className }: ModelSelectorProps) {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(defaultModel || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (folderPath) {
      loadModels();
    }
  }, [folderPath]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Set the default model when models are loaded
  useEffect(() => {
    if (defaultModel && models.includes(defaultModel)) {
      setSelectedModel(defaultModel);
    }
  }, [defaultModel, models]);

  const loadModels = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = new URL("/api/models", window.location.origin);
      url.searchParams.set("folder", folderPath);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to load models");
      }
      
      const data = await response.json();
      setModels(data.models);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
    onModelSelect(model);
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg", className)}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Select a Model
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Choose from available models in the selected folder
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded text-red-700 dark:text-red-300">
          {error}
          <Button
            onClick={loadModels}
            variant="outline"
            size="sm"
            className="ml-2"
          >
            Retry
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading models...</div>
        ) : models.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No models found in this folder
          </div>
        ) : (
          models.map((model) => (
            <button
              key={model}
              onClick={() => handleModelSelect(model)}
              className={cn(
                "w-full text-left p-3 rounded border transition-colors",
                selectedModel === model
                  ? "bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-purple-500">🤖</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {model}
                </span>
                {selectedModel === model && (
                  <span className="ml-auto text-blue-500">✓</span>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {selectedModel && (
        <div className="mt-6 p-4 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded">
          <p className="text-green-800 dark:text-green-300 font-medium">
            Selected model: {selectedModel}
          </p>
        </div>
      )}
    </div>
  );
}