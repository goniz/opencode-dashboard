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
    <div className={cn("w-full max-w-2xl mx-auto p-4 md:p-6 bg-background rounded-lg shadow-lg border border-border", className)}>
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          Select a Model
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Choose from available models in the selected folder
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm break-words">
          {error}
          <Button
            onClick={loadModels}
            variant="outline"
            size="sm"
            className="ml-2 min-h-[44px] lg:min-h-0"
          >
            Retry
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-6 md:py-8 text-muted-foreground">Loading models...</div>
        ) : models.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-muted-foreground">
            No models found in this folder
          </div>
        ) : (
          models.map((model) => (
            <button
              key={model}
              onClick={() => handleModelSelect(model)}
              className={cn(
                "w-full text-left p-3 rounded border transition-colors touch-manipulation min-h-[44px] flex items-center",
                selectedModel === model
                  ? "bg-primary/10 border-primary/30 ring-2 ring-primary/20"
                  : "hover:bg-muted/50 border-border"
              )}
            >
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="text-primary text-lg">🤖</span>
                <span className="font-medium text-foreground text-sm md:text-base truncate">
                  {model}
                </span>
                {selectedModel === model && (
                  <span className="ml-auto text-primary text-lg">✓</span>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {selectedModel && (
        <div className="mt-4 md:mt-6 p-3 md:p-4 bg-primary/10 border border-primary/20 rounded">
          <p className="text-primary font-medium text-sm md:text-base">
            Selected model: {selectedModel}
          </p>
        </div>
      )}
    </div>
  );
}