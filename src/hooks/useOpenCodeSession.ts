"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface OpenCodeSessionConfig {
  folder: string;
  model: string;
  port?: number;
}

export interface OpenCodeSession {
  id: string;
  folder: string;
  model: string;
  port: number;
  status: "starting" | "running" | "stopped" | "error";
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

  // Actions
  loadSessions: () => Promise<void>;
  createSession: (config: OpenCodeSessionConfig) => Promise<OpenCodeSession>;
  switchToSession: (sessionId: string) => void;
  stopSession: (sessionId: string) => Promise<void>;
  refreshSession: (sessionId: string) => Promise<void>;
  loadSessionMessages: (sessionId: string) => Promise<unknown[]>;
  clearError: () => void;
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

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const loadSessions = useCallback(async () => {
    updateState({ isLoading: true, error: null });
    
    try {
      const response = await fetch("/api/opencode");
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      
      const data = await response.json();
      const sessions = data.sessions || [];
      
      updateState({
        sessions,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to load sessions:", error);
      setError(error instanceof Error ? error.message : "Failed to load sessions");
    }
  }, [updateState, setError]);

  const createSession = useCallback(async (config: OpenCodeSessionConfig): Promise<OpenCodeSession> => {
    updateState({ isLoading: true, error: null });
    
    try {
      const response = await fetch("/api/opencode", {
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
        id: sessionData.sessionId,
        folder: config.folder,
        model: config.model,
        port: sessionData.port,
        status: sessionData.status,
      };
      
      // Refresh sessions list
      await loadSessions();
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

  const switchToSession = useCallback((sessionId: string) => {
    console.log("🔄 switchToSession called with ID:", sessionId);
    console.log("📋 Available sessions:", state.sessions.map(s => ({ id: s.id, status: s.status })));
    const session = state.sessions.find(s => s.id === sessionId);
    if (session) {
      console.log("✅ Found session, switching to:", session);
      updateState({ currentSession: session });
      console.log("🎯 updateState called with session:", session.id);
    } else {
      console.log("❌ Session not found in available sessions");
      setError(`Session ${sessionId} not found`);
    }
  }, [updateState, setError, state.sessions]);

  const stopSession = useCallback(async (sessionId: string) => {
    updateState({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/opencode?sessionId=${sessionId}`, {
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

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Set up polling for session status updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!state.isLoading) {
        loadSessions();
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [loadSessions, state.isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Note: We don't automatically stop all sessions on unmount
      // as they might be used by other components or persist across page reloads
    };
  }, []);

  return {
    sessions: state.sessions,
    currentSession: state.currentSession,
    isLoading: state.isLoading,
    error: state.error,
    loadSessions,
    createSession,
    switchToSession,
    stopSession,
    refreshSession,
    loadSessionMessages,
    clearError,
  };
}
