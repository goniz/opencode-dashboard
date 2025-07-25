"use client";

import { useState, useEffect } from "react";
import { Button } from "../../button";
import { cn } from "@/lib/utils";
import { useWorkspaceSessions } from "@/hooks/useWorkspaceSessions";
import { PlusIcon, TrashIcon, MessageSquareIcon, BrainIcon } from "lucide-react";
import ModelSelector from "./model-selector";

interface SessionManagerProps {
  workspaceId: string;
  folderPath?: string;
  defaultModel?: string;
  className?: string;
  onOpenChat?: (sessionId: string) => void;
}

type CreateSessionState = "idle" | "model-selection" | "creating";

export default function SessionManager({ workspaceId, folderPath, defaultModel, className, onOpenChat }: SessionManagerProps) {
  const {
    sessions,
    activeSessionId,
    loading: isLoading,
    error,
    createSession,
    deleteSession,
    setActiveSession,
    refreshSessions,
  } = useWorkspaceSessions();

  const [createSessionState, setCreateSessionState] = useState<CreateSessionState>("idle");
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Load sessions when workspace ID changes
  useEffect(() => {
    if (workspaceId) {
      refreshSessions(workspaceId);
    }
  }, [workspaceId, refreshSessions]);

  const handleCreateSessionClick = () => {
    setCreateSessionState("model-selection");
  };

  const handleModelSelect = async (model: string) => {
    setCreateSessionState("creating");

    try {
      await createSession(workspaceId, model);
      setCreateSessionState("idle");
    } catch (error) {
      console.error("Failed to create session:", error);
      setCreateSessionState("model-selection");
    }
  };

  const handleCancelCreate = () => {
    setCreateSessionState("idle");
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(workspaceId, sessionId);
      setSessionToDelete(null);
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const formatSessionName = (session: typeof sessions[0]) => {
    return `Chat Session (${session.model})`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-100 border-green-200";
      case "inactive":
        return "text-gray-600 bg-gray-100 border-gray-200";
      default:
        return "text-gray-600 bg-gray-100 border-gray-200";
    }
  };

  if (createSessionState === "model-selection") {
    return (
      <div className={cn("w-full", className)}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Create New Session</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Select an AI model for this chat session
            </p>
          </div>
          <Button variant="outline" onClick={handleCancelCreate}>
            Cancel
          </Button>
        </div>
        <ModelSelector folderPath={folderPath || ""} defaultModel={defaultModel} onModelSelect={handleModelSelect} />
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Chat Sessions</h3>
          <Button
            onClick={handleCreateSessionClick}
            disabled={isLoading || createSessionState === "creating"}
            size="sm"
            className="flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            {createSessionState === "creating" ? "Creating..." : "New Session"}
          </Button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <div className="text-left flex-1">
              <p className="font-semibold text-destructive text-sm">Error</p>
              <p className="text-xs text-destructive/80 mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8 bg-muted/50 rounded-lg border border-border/50">
          <MessageSquareIcon className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-foreground mb-2">No Chat Sessions</h4>
          <p className="text-muted-foreground text-xs mb-4">
            Create your first chat session to start conversations.
          </p>
          <Button onClick={handleCreateSessionClick} size="sm" className="flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Create Session
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "p-4 bg-background rounded-lg border border-border/50 shadow-sm",
                activeSessionId === session.id && "ring-2 ring-primary/20 border-primary/30"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      {formatSessionName(session)}
                    </h4>
                    <span
                      className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full border",
                        getStatusColor(session.status)
                      )}
                    >
                      {session.status}
                    </span>
                    {activeSessionId === session.id && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BrainIcon className="w-3 h-3" />
                    <span>{session.model}</span>
                    <span>•</span>
                    <span>Created {new Date(session.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveSession(session.id);
                      onOpenChat?.(session.id);
                    }}
                  >
                    <MessageSquareIcon className="w-4 h-4" />
                  </Button>
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
              Are you sure you want to delete this chat session? This action cannot be undone and will remove all conversation history.
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