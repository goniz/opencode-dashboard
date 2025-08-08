"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/button";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  folderPath: string;
  defaultModel?: string;
  onModelSelect: (model: string) => void;
  className?: string;
}

interface ModelsByProvider {
  [provider: string]: string[];
}

export default function ModelSelector({
  folderPath,
  defaultModel,
  onModelSelect,
  className,
}: ModelSelectorProps) {
  const [modelsByProvider, setModelsByProvider] = useState<ModelsByProvider>({});
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (folderPath) {
      loadModels();
    }
  }, [folderPath]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (defaultModel) {
      const [provider, model] = defaultModel.split("/");
      if (provider && model && modelsByProvider[provider]?.includes(model)) {
        setSelectedProvider(provider);
        setSelectedModel(model);
      }
    }
  }, [defaultModel, modelsByProvider]);

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
      const parsedModels: ModelsByProvider = {};
      data.models.forEach((model: string) => {
        const [provider, ...modelParts] = model.split("/");
        const modelName = modelParts.join("/");
        if (provider && modelName) {
          if (!parsedModels[provider]) {
            parsedModels[provider] = [];
          }
          parsedModels[provider].push(modelName);
        }
      });
      setModelsByProvider(parsedModels);

      const providers = Object.keys(parsedModels);
      if(providers.length > 0 && !selectedProvider) {
        const firstProvider = providers[0];
        setSelectedProvider(firstProvider);
        if (parsedModels[firstProvider].length > 0) {
            const firstModel = parsedModels[firstProvider][0];
            setSelectedModel(firstModel);
            onModelSelect(`${firstProvider}/${firstModel}`);
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value;
    setSelectedProvider(provider);
    const newModels = modelsByProvider[provider];
    if (newModels && newModels.length > 0) {
      const newModel = newModels[0];
      setSelectedModel(newModel);
      onModelSelect(`${provider}/${newModel}`);
    } else {
      setSelectedModel(null);
      onModelSelect("");
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value;
    setSelectedModel(model);
    if (selectedProvider) {
      onModelSelect(`${selectedProvider}/${model}`);
    }
  };

  const providers = Object.keys(modelsByProvider);
  const modelsForSelectedProvider = selectedProvider
    ? modelsByProvider[selectedProvider] || []
    : [];

  return (
    <div
      className={cn(
        "w-full max-w-2xl mx-auto p-4 md:p-6 bg-background rounded-lg shadow-lg border border-border",
        className
      )}
    >
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          Select a Model
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Choose a provider and a model
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

      {loading ? (
        <div className="text-center py-6 md:py-8 text-muted-foreground">
          Loading models...
        </div>
      ) : providers.length === 0 && !error ? (
        <div className="text-center py-6 md:py-8 text-muted-foreground">
          No models found in this folder
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <label htmlFor="provider-select" className="block text-sm font-medium text-muted-foreground mb-1">Provider</label>
            <select
              id="provider-select"
              value={selectedProvider || ""}
              onChange={handleProviderChange}
              className="w-full p-2 rounded border bg-input text-foreground border-border"
              disabled={providers.length === 0}
            >
              <option value="" disabled>Select a provider</option>
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="model-select" className="block text-sm font-medium text-muted-foreground mb-1">Model</label>
            <select
              id="model-select"
              value={selectedModel || ""}
              onChange={handleModelChange}
              className="w-full p-2 rounded border bg-input text-foreground border-border"
              disabled={!selectedProvider}
            >
              <option value="" disabled>Select a model</option>
              {modelsForSelectedProvider.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {selectedProvider && selectedModel && (
        <div className="mt-4 md:mt-6 p-3 md:p-4 bg-primary/10 border border-primary/20 rounded">
          <p className="text-primary font-medium text-sm md:text-base">
            Selected model: {selectedProvider}/{selectedModel}
          </p>
        </div>
      )}
    </div>
  );
}