"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { 
  PlusIcon, 
  MessageSquareIcon, 
  FolderIcon, 
  BrainIcon, 
  ClockIcon,
  ChevronRightIcon,
  ChevronDownIcon 
} from "lucide-react";
import { useOpenCodeSessionManager } from "@/components/providers/opencode-multi-session-provider";


interface OpenCodeThreadManagerProps {
  className?: string;
  onSessionSelect?: (sessionId: string) => void;
}

export function OpenCodeThreadManager({ 
  className, 
  onSessionSelect 
}: OpenCodeThreadManagerProps) {
  const { 
    sessions: workspaces, 
    activeSessionId, 
    switchToSession, 
    threadListAdapter 
  } = useOpenCodeSessionManager();

  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
  const [threadList, setThreadList] = useState<Array<{
    id: string;
    title: string;
    workspaceId: string;
    model: string;
    createdAt: string;
    lastActivity: string;
  }>>([]);

  // Load thread list from adapter
  const loadThreads = useCallback(async () => {
    try {
      const result = await threadListAdapter.list();
      const threads = result.threads.map((thread: { status: "regular" | "archived"; remoteId: string; title?: string; metadata?: { workspaceId?: string; model?: string; createdAt?: string; lastActivity?: string } }) => ({
        id: thread.remoteId,
        title: thread.title || 'Untitled',
        workspaceId: thread.metadata?.workspaceId || '',
        model: thread.metadata?.model || '',
        createdAt: thread.metadata?.createdAt || '',
        lastActivity: thread.metadata?.lastActivity || '',
      }));
      setThreadList(threads);
    } catch (error) {
      console.error("Failed to load threads:", error);
    }
  }, [threadListAdapter]);

  // Load threads when component mounts or workspaces change
  useEffect(() => {
    loadThreads();
  }, [loadThreads, workspaces]);

  // Toggle workspace expansion
  const toggleWorkspaceExpansion = useCallback((workspaceId: string) => {
    setExpandedWorkspaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workspaceId)) {
        newSet.delete(workspaceId);
      } else {
        newSet.add(workspaceId);
      }
      return newSet;
    });
  }, []);

  // Handle thread selection
  const handleThreadSelect = useCallback((sessionId: string) => {
    try {
      switchToSession(sessionId);
      onSessionSelect?.(sessionId);
    } catch (error) {
      console.error("Failed to switch to session:", error);
    }
  }, [switchToSession, onSessionSelect]);

  // Group threads by workspace
  const threadsByWorkspace = threadList.reduce((acc, thread) => {
    if (!acc[thread.workspaceId]) {
      acc[thread.workspaceId] = [];
    }
    acc[thread.workspaceId].push(thread);
    return acc;
  }, {} as Record<string, typeof threadList>);

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground">OpenCode Threads</h2>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            title="Create New Thread"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {threadList.length} session{threadList.length !== 1 ? 's' : ''} across {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {workspaces.length === 0 ? (
          <div className="text-center py-8 px-4">
            <FolderIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No workspaces available</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {workspaces.map((workspace) => {
              const workspaceThreads = threadsByWorkspace[workspace.id] || [];
              const isExpanded = expandedWorkspaces.has(workspace.id);
              
              return (
                <div key={workspace.id} className="space-y-1">
                  {/* Workspace Header */}
                  <div
                    className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleWorkspaceExpansion(workspace.id)}
                  >
                    {isExpanded ? (
                      <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                    <FolderIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium text-foreground truncate">
                      {workspace.folder.split("/").pop() || workspace.folder}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {workspaceThreads.length}
                    </span>
                  </div>

                  {/* Thread List for this workspace */}
                  {isExpanded && (
                    <div className="ml-6 space-y-1">
                      {workspaceThreads.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">
                          No active sessions in this workspace
                        </div>
                      ) : (
                        workspaceThreads.map((thread) => (
                          <ThreadItem
                            key={thread.id}
                            thread={thread}
                            isActive={activeSessionId === thread.id}
                            onSelect={() => handleThreadSelect(thread.id)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface ThreadItemProps {
  thread: {
    id: string;
    title: string;
    model: string;
    createdAt: string;
    lastActivity: string;
  };
  isActive: boolean;
  onSelect: () => void;
}

function ThreadItem({ thread, isActive, onSelect }: ThreadItemProps) {
  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return "unknown";
    }
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg cursor-pointer transition-all border",
        isActive
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-transparent bg-background hover:bg-muted/50 hover:border-border"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <MessageSquareIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground truncate">
              {thread.title}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <BrainIcon className="h-3 w-3" />
              <span className="truncate">{thread.model}</span>
            </div>
            <div className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              <span>{formatRelativeTime(thread.lastActivity)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}