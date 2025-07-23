"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  onModelSelect: (model: string) => void;
  className?: string;
}

const AVAILABLE_MODELS = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "Anthropic" },
  { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash", provider: "Google" },
];

export default function ModelSelector({ onModelSelect, className }: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const handleModelClick = (modelId: string) => {
    setSelectedModel(modelId);
    onModelSelect(modelId);
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg", className)}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Select AI Model</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Choose the AI model you want to use for your OpenCode session
        </p>
      </div>

      <div className="grid gap-3">
        {AVAILABLE_MODELS.map((model) => (
          <button
            key={model.id}
            onClick={() => handleModelClick(model.id)}
            className={cn(
              "w-full text-left p-4 rounded-lg border transition-all duration-200",
              "hover:bg-gray-50 dark:hover:bg-gray-800",
              selectedModel === model.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20"
                : "border-gray-200 dark:border-gray-700"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {model.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {model.provider}
                </p>
              </div>
              {selectedModel === model.id && (
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {selectedModel && (
        <div className="mt-6 p-4 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded">
          <p className="text-green-800 dark:text-green-300 text-sm">
            ✓ Model selected: {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name}
          </p>
        </div>
      )}
    </div>
  );
}