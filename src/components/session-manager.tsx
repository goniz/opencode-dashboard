"use client";

import { useState } from "react";
import { Button } from "../../button";
import { cn } from "@/lib/utils";
import { useOpenCodeSession } from "@/hooks/useOpenCodeSession";
import { PlusIcon, TrashIcon, PlayIcon, FolderIcon, BrainIcon, ServerIcon } from "lucide-react";
import FolderSelector from "./folder-selector";
import ModelSelector from "./model-selector";

interface SessionManagerProps {
  className?: string;
  onOpenChat?: () => void;
}

type CreateSessionState = "idle" | "folder-selection" | "model-selection" | "creating";

export default function SessionManager({ className, onOpenChat }: SessionManagerProps) {
  const {
    sessions,
    currentSession,
    isLoading,
    error,
    createSession,
    stopSession,
    switchToSession,
    clearError,
  } = useOpenCodeSession();

  const [createSessionState, setCreateSessionState] = useState<CreateSessionState>("idle");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [, setSelectedModel] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const handleCreateSessionClick = () => {
    setCreateSessionState("folder-selection");
    setSelectedFolder(null);
    setSelectedModel(null);
  };

  const handleFolderSelect = (path: string) => {
    setSelectedFolder(path);
    setCreateSessionState("model-selection");
  };

  const handleModelSelect = async (model: string) => {
    setSelectedModel(model);
    setCreateSessionState("creating");

    try {
      await createSession({
        folder: selectedFolder!,
        model,
      });
      setCreateSessionState("idle");
      setSelectedFolder(null);
      setSelectedModel(null);
    } catch (error) {
      console.error("Failed to create session:", error);
      setCreateSessionState("model-selection");
    }
  };

  const handleCancelCreate = () => {
    setCreateSessionState("idle");
    setSelectedFolder(null);
    setSelectedModel(null);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await stopSession(sessionId);
      setSessionToDelete(null);
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const formatSessionName = (session: typeof sessions[0]) => {
    const folderName = session.folder.split("/").pop() || session.folder;
    return `${folderName} (${session.model})`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "text-green-600 bg-green-100 border-green-200";
      case "starting":
        return "text-yellow-600 bg-yellow-100 border-yellow-200";
      case "stopped":
        return "text-gray-600 bg-gray-100 border-gray-200";
      case "error":
        return "text-red-600 bg-red-100 border-red-200";
      default:
        return "text-gray-600 bg-gray-100 border-gray-200";
    }
  };

  if (createSessionState === "folder-selection") {
    return (
      <div className={cn("w-full max-w-4xl mx-auto", className)}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Select Project Folder</h2>
          <Button variant="outline" onClick={handleCancelCreate}>
            Cancel
          </Button>
        </div>
        <FolderSelector onFolderSelect={handleFolderSelect} />
      </div>
    );
  }

  if (createSessionState === "model-selection" && selectedFolder) {
    return (
      <div className={cn("w-full max-w-4xl mx-auto", className)}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Select AI Model</h2>
            <p className="text-muted-foreground mt-1">
              Folder: <span className="font-mono text-sm">{selectedFolder}</span>
            </p>
          </div>
          <Button variant="outline" onClick={handleCancelCreate}>
            Cancel
          </Button>
        </div>
        <ModelSelector folderPath={selectedFolder} onModelSelect={handleModelSelect} />
      </div>
    );
  }

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)}>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-foreground">OpenCode Sessions</h1>
          <Button
            onClick={handleCreateSessionClick}
            disabled={isLoading || createSessionState === "creating"}
            className="flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            {createSessionState === "creating" ? "Creating..." : "New Session"}
          </Button>
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <div className="text-left flex-1">
              <p className="font-semibold text-destructive">Error</p>
              <p className="text-sm text-destructive/80 mt-1">{error.message}</p>
              {error.recoverySuggestion && (
                <p className="text-sm text-destructive/70 mt-2">{error.recoverySuggestion}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={clearError}>
              ×
            </Button>
          </div>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg border border-border/50">
          <ServerIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Sessions</h3>
          <p className="text-muted-foreground mb-4">
            Create your first OpenCode session to get started.
          </p>
          <Button onClick={handleCreateSessionClick} className="flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Create Session
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "p-6 bg-background rounded-lg border border-border/50 shadow-sm",
                currentSession?.id === session.id && "ring-2 ring-primary/20 border-primary/30"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-foreground">
                      {formatSessionName(session)}
                    </h3>
                    <span
                      className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full border",
                        getStatusColor(session.status)
                      )}
                    >
                      {session.status}
                    </span>
                    {currentSession?.id === session.id && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FolderIcon className="w-4 h-4" />
                      <span className="font-mono truncate">{session.folder}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BrainIcon className="w-4 h-4" />
                      <span>{session.model}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ServerIcon className="w-4 h-4" />
                      <span className="font-mono">localhost:{session.port}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {session.status === "running" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log("🚀 Open Chat clicked for session:", session.id);
                        switchToSession(session.id);
                        console.log("📞 Calling onOpenChat callback");
                        onOpenChat?.();
                      }}
                    >
                      Open Chat
                    </Button>
                  )}
                  {session.status === "running" && currentSession?.id !== session.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => switchToSession(session.id)}
                      title="Set as active session"
                    >
                      <PlayIcon className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSessionToDelete(session.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {sessionToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-xl max-w-md w-full mx-4 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Session</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this session? This action cannot be undone and will stop the running server.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setSessionToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteSession(sessionToDelete)}
                disabled={isLoading}
              >
                {isLoading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}