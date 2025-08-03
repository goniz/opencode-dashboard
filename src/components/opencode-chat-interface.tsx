"use client";

import { useState, useEffect } from "react";
import { Thread } from "@/components/thread";
import { cn, parseModelString } from "@/lib/utils";
import { AlertTriangleIcon, MessageSquareIcon, ServerIcon } from "lucide-react";
import { OpenCodeMultiSessionProvider, useOpenCodeSessionManager } from "@/components/providers/opencode-multi-session-provider";
import { OpenCodeThreadManager } from "./opencode-thread-manager";
import { useOpenCodeSessionContext } from "@/contexts/OpenCodeWorkspaceContext";

interface OpenCodeChatInterfaceProps {
  className?: string;
}

// Inner component that uses the session manager
function ChatInterfaceContent({ className }: OpenCodeChatInterfaceProps) {
  const { 
    activeSessionId, 
    currentSession, 
    sessions: workspaces 
  } = useOpenCodeSessionManager();

  const [validationError, setValidationError] = useState<string | null>(null);
  const [parsedModel, setParsedModel] = useState<{ modelID: string; providerID: string } | null>(null);

  // Validate session and model when activeSessionId or currentSession changes
  useEffect(() => {
    if (!activeSessionId) {
      setValidationError("No session selected");
      setParsedModel(null);
      return;
    }

    if (!currentSession) {
      setValidationError("Session not found");
      setParsedModel(null);
      return;
    }

    if (!currentSession.workspaceModel) {
      setValidationError("Session model is required");
      setParsedModel(null);
      return;
    }

    try {
      const parsed = parseModelString(currentSession.workspaceModel);
      if (!parsed.modelID) {
        setValidationError("Valid model ID is required");
        setParsedModel(null);
      } else if (!parsed.providerID) {
        setValidationError("Valid provider ID is required");
        setParsedModel(null);
      } else {
        setValidationError(null);
        setParsedModel(parsed);
      }
    } catch (error) {
      setValidationError(`Invalid model format: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setParsedModel(null);
    }
  }, [activeSessionId, currentSession]);

  return (
    <div className={cn("flex h-full bg-background", className)}>
      {/* Thread Manager Sidebar */}
      <div className="w-80 border-r border-border bg-muted/30">
        <OpenCodeThreadManager />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {!activeSessionId ? (
          <div className="flex-1 flex items-center justify-center bg-muted/10 p-4">
            <div className="text-center max-w-sm">
              <MessageSquareIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Select a Thread
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose an OpenCode session from the sidebar to start chatting.
              </p>
              <p className="text-xs text-muted-foreground">
                {workspaces.length === 0 
                  ? "No workspaces available. Create a new workspace to get started."
                  : "Expand a workspace to see available sessions."
                }
              </p>
            </div>
          </div>
        ) : validationError ? (
          <div className="flex-1 flex items-center justify-center bg-muted/10 p-4">
            <div className="text-center max-w-sm">
              <AlertTriangleIcon className="h-16 w-16 mx-auto mb-4 text-destructive/50" />
              <h3 className="text-lg font-medium text-destructive mb-2">
                Configuration Error
              </h3>
              <p className="text-sm text-destructive/80 mb-4">
                {validationError}
              </p>
              <p className="text-xs text-muted-foreground">
                Please check the session configuration and try again.
              </p>
            </div>
          </div>
        ) : currentSession && parsedModel ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-border p-4 bg-background">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground">
                    Chat with OpenCode
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Workspace: {currentSession.workspaceFolder.split("/").pop()} • Model: {currentSession.workspaceModel}
                  </p>
                  <p className="text-xs text-muted-foreground/70 truncate">
                    {currentSession.workspaceFolder}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    active
                  </div>
                </div>
              </div>
            </div>

            {/* Thread Component */}
            <div className="flex-1">
              <Thread />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/10 p-4">
            <div className="text-center max-w-sm">
              <ServerIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Loading Session
              </h3>
              <p className="text-sm text-muted-foreground">
                Preparing your OpenCode session...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main component that provides the multi-session context
export default function OpenCodeChatInterface({ className }: OpenCodeChatInterfaceProps) {
  const { currentSession } = useOpenCodeSessionContext();
  
  // Determine initial session ID from current workspace's first session
  const initialSessionId = currentSession?.sessions?.[0]?.id;

  return (
    <OpenCodeMultiSessionProvider currentSessionId={initialSessionId}>
      <ChatInterfaceContent className={className} />
    </OpenCodeMultiSessionProvider>
  );
}