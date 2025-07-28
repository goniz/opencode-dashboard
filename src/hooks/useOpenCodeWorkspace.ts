"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSSEConnection, type SSEMessage } from "./useSSEConnection";

export interface OpenCodeSessionConfig {
  folder: string;
  model: string;
}

export interface OpenCodeSession {
  id: string;
  folder: string;
  model: string;
  port: number;
  status: "starting" | "running" | "stopped" | "error";
  sessions?: Array<{
    id: string;
    workspaceId: string;
    model: string;
    createdAt: string;
    lastActivity: string;
    status: "active" | "inactive";
  }>;
}

export interface SessionError {
  message: string;
  recoverySuggestion?: string;
}

export interface SessionState {
  sessions: OpenCodeSession[];
  currentSession: OpenCodeSession | null;
  isLoading: boolean;
  error: SessionError | null;
}

export interface UseOpenCodeSessionReturn {
  // State
  sessions: OpenCodeSession[];
  currentSession: OpenCodeSession | null;
  isLoading: boolean;
  error: SessionError | null;
  isConnected: boolean;
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";

  // Actions
  loadSessions: () => Promise<void>;
  createSession: (config: OpenCodeSessionConfig) => Promise<OpenCodeSession>;
  switchToSession: (sessionId: string) => Promise<void>;
  stopSession: (sessionId: string) => Promise<void>;
  refreshSession: (sessionId: string) => Promise<void>;
  loadSessionMessages: (sessionId: string) => Promise<unknown[]>;
  clearError: () => void;
  reconnectSSE: () => void;
}

export function useOpenCodeSession(): UseOpenCodeSessionReturn {
  const [state, setState] = useState<SessionState>({
    sessions: [],
    currentSession: null,
    isLoading: false,
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateState = useCallback((updates: Partial<SessionState>) => {
    if (!mountedRef.current) return;
    console.log("🔄 updateState called with:", updates);
    setState((prev) => {
      const newState = { ...prev, ...updates };
      console.log("📊 State updated from:", prev, "to:", newState);
      return newState;
    });
  }, []);

  const setError = useCallback(
    (error: Error | SessionError | string | null) => {
      if (!error) {
        updateState({ error: null, isLoading: false });
        return;
      }

      let sessionError: SessionError;
      if (typeof error === "string") {
        sessionError = { message: error };
      } else if (error && typeof error === "object" && "recoverySuggestion" in error) {
        sessionError = {
          message: error.message,
          recoverySuggestion: error.recoverySuggestion as string,
        };
      } else {
        sessionError = { message: error.message || "An unknown error occurred" };
      }

      updateState({ error: sessionError, isLoading: false });
    },
    [updateState]
  );

  // Handle SSE messages
  const handleSSEMessage = useCallback((message: SSEMessage) => {
    if (message.type === "workspace_update" && message.data) {
      const sessions = message.data as OpenCodeSession[];
      
      setState((prevState) => {
        // Preserve currentSession if it still exists in the updated sessions list
        const currentSessionId = prevState.currentSession?.id;
        const updatedCurrentSession = currentSessionId 
          ? sessions.find((s: OpenCodeSession) => s.id === currentSessionId) || null
          : null;
        
        return {
          ...prevState,
          sessions,
          currentSession: updatedCurrentSession,
          isLoading: false,
        };
      });
    } else if (message.type === "error") {
      setError(message.error || "SSE connection error");
    }
  }, [setError]);

  // Set up SSE connection
  const { connectionState, reconnect } = useSSEConnection(
    "/api/workspaces/stream",
    handleSSEMessage,
    {
      autoConnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
    }
  );

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const loadSessions = useCallback(async () => {
    updateState({ isLoading: true, error: null });
    
    try {
      const response = await fetch("/api/workspaces");
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      
      const data = await response.json();
      const sessions: OpenCodeSession[] = data.map((workspace: {
        id: string;
        folder: string;
        model: string;
        port: number;
        status: string;
        sessions?: unknown[];
      }) => ({
        id: workspace.id,
        folder: workspace.folder,
        model: workspace.model,
        port: workspace.port,
        status: workspace.status,
        sessions: workspace.sessions || [],
      }));
      
      // Preserve currentSession if it still exists in the updated sessions list
      const currentSessionId = state.currentSession?.id;
      const updatedCurrentSession = currentSessionId 
        ? sessions.find((s: OpenCodeSession) => s.id === currentSessionId) || null
        : null;
      
      updateState({
        sessions,
        currentSession: updatedCurrentSession,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to load sessions:", error);
      setError(error instanceof Error ? error.message : "Failed to load sessions");
    }
  }, [updateState, setError, state.currentSession]);

  const createSession = useCallback(async (config: OpenCodeSessionConfig): Promise<OpenCodeSession> => {
    updateState({ isLoading: true, error: null });
    
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create session");
      }
      
      const sessionData = await response.json();
      const session: OpenCodeSession = {
        id: sessionData.id,
        folder: config.folder,
        model: config.model,
        port: sessionData.port,
        status: sessionData.status,
      };
      
      // Refresh sessions list first to ensure consistency
      await loadSessions();
      
      // Then set current session
      updateState({
        currentSession: session,
        isLoading: false,
      });
      
      return session;
    } catch (error) {
      console.error("Failed to create session:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create session";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [updateState, setError, loadSessions]);

  const switchToSession = useCallback(async (sessionId: string): Promise<void> => {
    console.log("🔄 switchToSession called with ID:", sessionId);
    console.log("📋 Available sessions:", state.sessions.map(s => ({ id: s.id, status: s.status })));
    const session = state.sessions.find(s => s.id === sessionId);
    if (session) {
      console.log("✅ Found session, switching to:", session);
      updateState({ currentSession: session });
      console.log("🎯 updateState called with session:", session.id);
      
      // Wait for the next tick to ensure state has updated
      await new Promise(resolve => setTimeout(resolve, 0));
      console.log("⏰ State update should be complete now");
    } else {
      console.log("❌ Session not found in available sessions");
      setError(`Session ${sessionId} not found`);
    }
  }, [updateState, setError, state.sessions]);

  const stopSession = useCallback(async (sessionId: string) => {
    updateState({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/workspaces/${sessionId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to stop session");
      }
      
      // Refresh sessions list
      await loadSessions();
      const wasCurrentSession = state.currentSession?.id === sessionId;
      
      updateState({
        currentSession: wasCurrentSession ? null : state.currentSession,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to stop session:", error);
      setError(error instanceof Error ? error.message : "Failed to stop session");
    }
  }, [updateState, setError, state.currentSession, loadSessions]);

  const refreshSession = useCallback(async (sessionId: string) => {
    updateState({ isLoading: true, error: null });
    
    try {
      // Refresh sessions list to get updated status
      await loadSessions();
      const updatedSession = state.sessions.find(s => s.id === sessionId);
      
      updateState({
        currentSession: state.currentSession?.id === sessionId ? updatedSession || null : state.currentSession,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to refresh session:", error);
      setError(error instanceof Error ? error.message : "Failed to refresh session");
    }
  }, [updateState, setError, state.currentSession, state.sessions, loadSessions]);

  const loadSessionMessages = useCallback(async (sessionId: string): Promise<unknown[]> => {
    try {
      const session = state.sessions.find(s => s.id === sessionId);
      if (!session || session.status !== "running") {
        console.warn(`Session ${sessionId} is not running`);
        return [];
      }

      // For now, return empty array as message loading will be handled by the chat interface
      // This can be implemented later with a proper API endpoint
      return [];
    } catch (error) {
      console.error(`Failed to load messages for session ${sessionId}:`, error);
      return [];
    }
  }, [state.sessions]);

  // Determine connection status based on SSE state
  const getConnectionStatus = (): "connecting" | "connected" | "disconnected" | "error" => {
    if (connectionState.error) return "error";
    if (connectionState.isConnecting) return "connecting";
    if (connectionState.isConnected) return "connected";
    return "disconnected";
  };

  return {
    sessions: state.sessions,
    currentSession: state.currentSession,
    isLoading: state.isLoading,
    error: state.error,
    isConnected: connectionState.isConnected,
    connectionStatus: getConnectionStatus(),
    loadSessions,
    createSession,
    switchToSession,
    stopSession,
    refreshSession,
    loadSessionMessages,
    clearError,
    reconnectSSE: reconnect,
  };
}
