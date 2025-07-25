"use client";

import { useState, useEffect, useCallback } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Button } from "../../button";
import { Thread } from "../../thread";
import { useOpenCodeSessionContext } from "@/contexts/OpenCodeWorkspaceContext";
import { cn } from "@/lib/utils";
import { PlusIcon, PlayIcon, StopCircleIcon, FolderIcon, BrainIcon, ServerIcon, RotateCwIcon, AlertTriangleIcon } from "lucide-react";
import type { OpenCodeSession } from "@/hooks/useOpenCodeWorkspace";
import { messageConverter } from "@/lib/message-converter";
import type { Message as UseChatMessage } from "ai";
import type { OpenCodeMessage } from "@/lib/message-types";

interface OpenCodeChatInterfaceProps {
  className?: string;
}

export default function OpenCodeChatInterface({ className }: OpenCodeChatInterfaceProps) {
  const {
    sessions,
    currentSession,
    isLoading,
    error,
    switchToSession,
    stopSession,

    clearError,
  } = useOpenCodeSessionContext();

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const [initialMessages, setInitialMessages] = useState<Array<UseChatMessage & { role: "user" | "assistant" | "system" }>>([]);

  // Simple sync state for loading indicator
  const [isSyncing, setIsSyncing] = useState(false);

  // Function to load messages directly from OpenCode API
  const loadMessagesFromOpenCode = useCallback(async (sessionId: string) => {
    if (!sessionId || !currentSession) return [];
    
    setIsSyncing(true);
    try {
      // For now, use the old endpoint until we have proper workspace/session separation
      const response = await fetch(`/api/opencode-chat?sessionId=${sessionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch messages from OpenCode");
      }
      
      const data = await response.json();
      const messages = data.messages || [];
      
      // Convert OpenCode messages to useChat format
      const convertedMessages = messages
        .map((msg: unknown) => messageConverter.openCodeToUseChat(msg as OpenCodeMessage))
        .filter((msg: UseChatMessage): msg is UseChatMessage & { role: "user" | "assistant" | "system" } => 
          msg.role === "user" || msg.role === "assistant" || msg.role === "system"
        ) as Array<UseChatMessage & { role: "user" | "assistant" | "system" }>;
      
      return convertedMessages;
    } catch (error) {
      console.warn(`Error loading messages from OpenCode session ${sessionId}:`, error);
      return [];
    } finally {
      setIsSyncing(false);
    }
  }, [currentSession]);



  // Update selected session when current session changes
  useEffect(() => {
    if (currentSession) {
      setSelectedSessionId(currentSession.id);
    }
  }, [currentSession]);

  // Load messages when session changes (always from OpenCode)
  useEffect(() => {
    if (selectedSessionId && currentSession?.status === "running") {
      loadMessagesFromOpenCode(selectedSessionId).then(messages => {
        setInitialMessages(messages);
      });
    } else {
      setInitialMessages([]);
    }
  }, [selectedSessionId, currentSession?.status, loadMessagesFromOpenCode]);

  // Create chat runtime for the selected session
  // Always require a session ID - error out if none is selected
  if (!selectedSessionId) {
    throw new Error("No OpenCode session selected. Please select a session to continue.");
  }

  const runtime = useChatRuntime({
    api: `/api/opencode-chat?sessionId=${selectedSessionId}`,
    initialMessages: initialMessages.length > 0 ? initialMessages : undefined,
  });

  const handleSessionSelect = async (session: OpenCodeSession) => {
    setSelectedSessionId(session.id);
    await switchToSession(session.id);
    
    // Load messages from OpenCode (the authoritative source)
    if (session.status === "running") {
      const messages = await loadMessagesFromOpenCode(session.id);
      setInitialMessages(messages);
    }
  };

  const handleStopSession = async (sessionId: string) => {
    try {
      await stopSession(sessionId);
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
    } catch (err) {
      console.error("Failed to stop session:", err);
    }
  };

  return (
    <div className={cn("flex h-full bg-background", className)}>
      {/* Session Sidebar */}
      <div className="w-80 border-r border-border bg-muted/30 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Active Workspaces</h2>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => window.location.href = "/"}
              title="Create New Workspace"
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
          
          {error && (
            <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangleIcon className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-destructive">Error</p>
                  <p className="text-sm text-destructive/80 mt-1">{error.message}</p>
                  {error.recoverySuggestion && (
                    <p className="text-xs text-muted-foreground mt-2">{error.recoverySuggestion}</p>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs mt-2 hover:bg-destructive/20"
                    onClick={clearError}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading && sessions.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ServerIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No active workspaces</p>
              <p className="text-xs mt-1">Create a new workspace to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isSelected={selectedSessionId === session.id}
                  onSelect={() => handleSessionSelect(session)}
                  onStop={() => handleStopSession(session.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedSessionId && currentSession ? (
          <AssistantRuntimeProvider runtime={runtime}>
            {/* Chat Header */}
            <div className="border-b border-border p-4 bg-background">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">
                    Chat with OpenCode
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Workspace: {currentSession.folder.split("/").pop()} • Session: {currentSession.model}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {currentSession.folder}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs"
                    onClick={async () => {
                      if (currentSession && selectedSessionId) {
                        const messages = await loadMessagesFromOpenCode(selectedSessionId);
                        setInitialMessages(messages);
                      }
                    }}
                    disabled={isSyncing || !currentSession}
                  >
                    <RotateCwIcon className={cn("h-3 w-3", isSyncing && "animate-spin")} />
                    Sync from OpenCode
                  </Button>
                  
                  {isSyncing && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <RotateCwIcon className="h-3 w-3 animate-spin" />
                      Syncing from OpenCode...
                    </div>
                  )}
                  
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    currentSession.status === "running" && "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
                    currentSession.status === "starting" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
                    currentSession.status === "stopped" && "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400",
                    currentSession.status === "error" && "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                  )}>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      currentSession.status === "running" && "bg-green-500 animate-pulse",
                      currentSession.status === "starting" && "bg-yellow-500 animate-pulse",
                      currentSession.status === "stopped" && "bg-gray-500",
                      currentSession.status === "error" && "bg-red-500"
                    )} />
                    {currentSession.status}
                  </div>
                </div>
              </div>
            </div>

            {/* Thread Component */}
            <div className="flex-1">
              {isSyncing ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-3"></div>
                    <p className="text-sm text-muted-foreground">Loading messages from OpenCode...</p>
                  </div>
                </div>
              ) : (
                <Thread />
              )}
            </div>
          </AssistantRuntimeProvider>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/10">
            <div className="text-center">
              <ServerIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Workspace Selected
              </h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                Select an active OpenCode workspace from the sidebar to start chatting, or go back to create a new workspace.
              </p>
              <Button
                onClick={() => window.location.href = "/"}
                className="gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Go Back to Main
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface SessionCardProps {
  session: OpenCodeSession;
  isSelected: boolean;
  onSelect: () => void;
  onStop: () => void;
}

function SessionCard({ session, isSelected, onSelect, onStop }: SessionCardProps) {
  const getStatusColor = (status: OpenCodeSession["status"]) => {
    switch (status) {
      case "running":
        return "text-green-600 dark:text-green-400";
      case "starting":
        return "text-yellow-600 dark:text-yellow-400";
      case "stopped":
        return "text-gray-600 dark:text-gray-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: OpenCodeSession["status"]) => {
    switch (status) {
      case "running":
        return <PlayIcon className="h-3 w-3" />;
      case "starting":
        return <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />;
      case "stopped":
        return <StopCircleIcon className="h-3 w-3" />;
      case "error":
        return <StopCircleIcon className="h-3 w-3" />;
      default:
        return <StopCircleIcon className="h-3 w-3" />;
    }
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-background hover:border-border/80"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FolderIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">
              {session.folder.split("/").pop() || session.folder}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <BrainIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {session.model}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-2">
          <div className={cn("flex items-center gap-1 text-xs", getStatusColor(session.status))}>
            {getStatusIcon(session.status)}
            <span className="capitalize">{session.status}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Port: {session.port}
        </div>
        
        {session.status === "running" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onStop();
            }}
          >
            Stop
          </Button>
        )}
      </div>
    </div>
  );
}