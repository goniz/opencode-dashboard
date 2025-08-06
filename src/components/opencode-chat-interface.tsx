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
    <div className={cn("flex h-full bg-black text-white", className)}>
      <div className="hidden md:block w-80 border-r border-white/10 bg-black">
        <OpenCodeThreadManager />
      </div>
      <div className="flex-1 flex flex-col">
        {!activeSessionId ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-sm">
              <MessageSquareIcon className="h-16 w-16 mx-auto mb-4 text-white/30" />
              <h3 className="text-lg font-medium mb-2">Select a Thread</h3>
              <p className="text-sm text-white/60 mb-4">Choose an OpenCode session to start chatting.</p>
              <p className="text-xs text-white/40">
                {workspaces.length === 0
                  ? "No workspaces available. Create a new workspace to get started."
                  : "Expand a workspace to see available sessions."}
              </p>
            </div>
          </div>
        ) : validationError ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-sm">
              <AlertTriangleIcon className="h-16 w-16 mx-auto mb-4 text-red-400/60" />
              <h3 className="text-lg font-medium text-red-400 mb-2">Configuration Error</h3>
              <p className="text-sm text-red-300/80 mb-4">{validationError}</p>
              <p className="text-xs text-white/40">Please check the session configuration and try again.</p>
            </div>
          </div>
        ) : currentSession && parsedModel ? (
          <>
            <div className="sticky top-0 z-10 border-b border-white/10 p-3 bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-black/60">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">OpenCode</h3>
                  <p className="text-xs text-white/50">
                    {currentSession.workspaceFolder.split("/").pop()} • {currentSession.workspaceModel}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    active
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <Thread />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-sm">
              <ServerIcon className="h-16 w-16 mx-auto mb-4 text-white/30" />
              <h3 className="text-lg font-medium mb-2">Loading Session</h3>
              <p className="text-sm text-white/60">Preparing your OpenCode session...</p>
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