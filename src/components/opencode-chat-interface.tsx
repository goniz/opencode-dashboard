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
  // Use a placeholder sessionId if none is selected to avoid hook rule violations
  const runtime = useChatRuntime({
    api: `/api/opencode-chat?sessionId=${selectedSessionId || 'placeholder'}`,
    initialMessages: initialMessages.length > 0 ? initialMessages : undefined,
  });

  // Show loading state if no session is selected yet
  if (!selectedSessionId) {
    return (
      <div className={cn("flex h-full bg-background items-center justify-center", className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Connecting to OpenCode session...</p>
        </div>
      </div>
    );
  }

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
    <div className={cn("flex flex-col lg:flex-row h-full bg-background", className)}>
      {/* Session Sidebar */}
      <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border bg-muted/30 flex flex-col max-h-[40vh] lg:max-h-none">
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base md:text-lg font-semibold text-foreground">Active Workspaces</h2>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 min-h-[44px] min-w-[44px] lg:h-8 lg:w-8 lg:min-h-0 lg:min-w-0"
              onClick={() => window.location.href = "/"}
              title="Create New Workspace"
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
          
          {error && (
            <div className="mb-3 p-2 md:p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-2 md:gap-3">
                <AlertTriangleIcon className="h-4 w-4 md:h-5 md:w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-destructive text-sm md:text-base">Error</p>
                  <p className="text-xs md:text-sm text-destructive/80 mt-1 break-words">{error.message}</p>
                  {error.recoverySuggestion && (
                    <p className="text-xs text-muted-foreground mt-2 break-words">{error.recoverySuggestion}</p>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs mt-2 hover:bg-destructive/20 min-h-[44px] lg:min-h-0"
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
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {isLoading && sessions.length === 0 ? (
            <div className="flex items-center justify-center py-6 md:py-8">
              <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-b-2 border-primary"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-6 md:py-8 text-muted-foreground px-2">
              <ServerIcon className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 opacity-50" />
              <p className="text-xs md:text-sm">No active workspaces</p>
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
            <div className="border-b border-border p-3 md:p-4 bg-background">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground text-sm md:text-base">
                    Chat with OpenCode
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground break-words">
                    Workspace: {currentSession.folder.split("/").pop()} • Session: {currentSession.model}
                  </p>
                  <p className="text-xs text-muted-foreground/70 break-all">
                    {currentSession.folder}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs min-h-[44px] lg:min-h-0"
                    onClick={async () => {
                      if (currentSession && selectedSessionId) {
                        const messages = await loadMessagesFromOpenCode(selectedSessionId);
                        setInitialMessages(messages);
                      }
                    }}
                    disabled={isSyncing || !currentSession}
                  >
                    <RotateCwIcon className={cn("h-3 w-3", isSyncing && "animate-spin")} />
                    <span className="ml-1">Sync from OpenCode</span>
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
          <div className="flex-1 flex items-center justify-center bg-muted/10 p-4">
            <div className="text-center max-w-sm">
              <ServerIcon className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-base md:text-lg font-medium text-foreground mb-2">
                No Workspace Selected
              </h3>
              <p className="text-sm md:text-base text-muted-foreground mb-4">
                Select an active OpenCode workspace from the sidebar to start chatting, or go back to create a new workspace.
              </p>
              <Button
                onClick={() => window.location.href = "/"}
                className="gap-2 min-h-[44px] w-full sm:w-auto"
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
        "p-2 md:p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 touch-manipulation",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-background hover:border-border/80"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FolderIcon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs md:text-sm font-medium text-foreground truncate">
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
            <span className="capitalize hidden sm:inline">{session.status}</span>
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
            className="h-6 px-2 text-xs hover:bg-destructive/10 hover:text-destructive min-h-[44px] lg:min-h-0"
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