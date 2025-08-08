"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import { PlusIcon } from "lucide-react";
import ModelSelector from "./model-selector";

interface SessionCreatorProps {
  workspaceId: string;
  onSessionCreate: (model: string) => Promise<void>;
  className?: string;
  disabled?: boolean;
}

type CreationState = "idle" | "selecting" | "creating";

export default function SessionCreator({
  workspaceId: _workspaceId, // eslint-disable-line @typescript-eslint/no-unused-vars
  onSessionCreate,
  className,
  disabled = false,
}: SessionCreatorProps) {
  const [creationState, setCreationState] = useState<CreationState>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleCreateClick = () => {
    setCreationState("selecting");
    setError(null);
  };

  const handleModelSelect = async (model: string) => {
    setCreationState("creating");
    setError(null);

    try {
      await onSessionCreate(model);
      setCreationState("idle");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create session";
      setError(errorMessage);
      setCreationState("selecting");
    }
  };

  const handleCancel = () => {
    setCreationState("idle");
    setError(null);
  };

  if (creationState === "selecting") {
    return (
      <div className={cn("w-full", className)}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Create New Chat Session</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Choose an AI model for your new conversation
            </p>
          </div>
          <Button variant="outline" onClick={handleCancel} disabled={creationState !== "selecting"}>
            Cancel
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <ModelSelector
          folderPath=""
          onModelSelect={handleModelSelect}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        onClick={handleCreateClick}
        disabled={disabled || creationState === "creating"}
        size="sm"
        className="flex items-center gap-2"
      >
        {creationState === "creating" ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
            Creating...
          </>
        ) : (
          <>
            <PlusIcon className="w-4 h-4" />
            New Session
          </>
        )}
      </Button>
    </div>
  );
}