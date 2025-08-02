"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useCallback } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type LocalRuntimeOptions,
} from "@assistant-ui/react";
import { OpenCodeChatAdapter } from "@/lib/adapters/opencode-chat-adapter";
import { OpenCodeHistoryAdapter } from "@/lib/adapters/opencode-history-adapter";
import { OpenCodeThreadListAdapter } from "@/lib/adapters/opencode-thread-list-adapter";
import { useOpenCodeSessionContext } from "@/contexts/OpenCodeWorkspaceContext";
import { parseModelString } from "@/lib/utils";

interface OpenCodeMultiSessionProviderProps {
  children: ReactNode;
  currentSessionId?: string;
}

export function OpenCodeMultiSessionProvider({ 
  children, 
  currentSessionId 
}: OpenCodeMultiSessionProviderProps) {
  const { sessions: workspaces } = useOpenCodeSessionContext();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(currentSessionId || null);

  // Find the current session details
  const currentSession = useMemo(() => {
    if (!activeSessionId) return null;
    
    for (const workspace of workspaces) {
      if (workspace.sessions) {
        const session = workspace.sessions.find(s => s.id === activeSessionId);
        if (session) {
          return {
            ...session,
            workspaceFolder: workspace.folder,
            workspaceModel: workspace.model,
          };
        }
      }
    }
    return null;
  }, [workspaces, activeSessionId]);

  // Create thread list adapter
  const threadListAdapter = useMemo(() => {
    return new OpenCodeThreadListAdapter(() => workspaces);
  }, [workspaces]);

  // Switch to a different session
  const switchToSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  // Create chat adapter for current session
  const chatAdapter = useMemo(() => {
    if (!currentSession) return null;
    
    const { providerID, modelID } = parseModelString(currentSession.workspaceModel);
    return new OpenCodeChatAdapter(currentSession.id, modelID, providerID);
  }, [currentSession]);

  // Create history adapter for current session
  const historyAdapter = useMemo(() => {
    if (!currentSession) return null;
    return new OpenCodeHistoryAdapter(currentSession.id);
  }, [currentSession]);

  // Create runtime options
  const runtimeOptions: LocalRuntimeOptions = useMemo(() => ({
    adapters: {
      history: historyAdapter || undefined,
    },
  }), [historyAdapter]);

  // Create runtime
  const runtime = useLocalRuntime(chatAdapter, runtimeOptions);

  // Context value for session management
  const sessionContext = useMemo(() => ({
    activeSessionId,
    currentSession,
    sessions: workspaces,
    threadListAdapter,
    switchToSession,
  }), [activeSessionId, currentSession, workspaces, threadListAdapter, switchToSession]);

  return (
    <OpenCodeSessionManagerContext.Provider value={sessionContext}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </OpenCodeSessionManagerContext.Provider>
  );
}

// Context for managing session state across components
import { createContext, useContext } from "react";
import type { OpenCodeSession } from "@/hooks/useOpenCodeWorkspace";

interface SessionManagerContextValue {
  activeSessionId: string | null;
  currentSession: (OpenCodeSession['sessions'] extends (infer U)[] ? U : never) & {
    workspaceFolder: string;
    workspaceModel: string;
  } | null;
  sessions: OpenCodeSession[];
  threadListAdapter: OpenCodeThreadListAdapter;
  switchToSession: (sessionId: string) => void;
}

const OpenCodeSessionManagerContext = createContext<SessionManagerContextValue | null>(null);

export function useOpenCodeSessionManager(): SessionManagerContextValue {
  const context = useContext(OpenCodeSessionManagerContext);
  if (!context) {
    throw new Error("useOpenCodeSessionManager must be used within an OpenCodeMultiSessionProvider");
  }
  return context;
}