"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { OpenCodeSession, OpenCodeSessionConfig } from "@/lib/opencode-session";
import { sessionManager } from "@/lib/opencode-session";

export interface SessionState {
  sessions: OpenCodeSession[];
  currentSession: OpenCodeSession | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseOpenCodeSessionReturn {
  // State
  sessions: OpenCodeSession[];
  currentSession: OpenCodeSession | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadSessions: () => Promise<void>;
  createSession: (config: OpenCodeSessionConfig) => Promise<OpenCodeSession>;
  switchToSession: (sessionId: string) => void;
  stopSession: (sessionId: string) => Promise<void>;
  refreshSession: (sessionId: string) => Promise<void>;
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
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setError = useCallback((error: string | null) => {
    updateState({ error, isLoading: false });
  }, [updateState]);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const loadSessions = useCallback(async () => {
    updateState({ isLoading: true, error: null });
    
    try {
      // Get local sessions from session manager
      const localSessions = sessionManager.getAllSessions();
      
      updateState({
        sessions: localSessions,
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
      const session = await sessionManager.startSession(config);
      
      // Refresh sessions list
      const allSessions = sessionManager.getAllSessions();
      updateState({
        sessions: allSessions,
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
  }, [updateState, setError]);

  const switchToSession = useCallback((sessionId: string) => {
    const session = sessionManager.getSession(sessionId);
    if (session) {
      updateState({ currentSession: session });
    } else {
      setError(`Session ${sessionId} not found`);
    }
  }, [updateState, setError]);

  const stopSession = useCallback(async (sessionId: string) => {
    updateState({ isLoading: true, error: null });
    
    try {
      await sessionManager.stopSession(sessionId);
      
      // Refresh sessions list
      const allSessions = sessionManager.getAllSessions();
      const wasCurrentSession = state.currentSession?.id === sessionId;
      
      updateState({
        sessions: allSessions,
        currentSession: wasCurrentSession ? null : state.currentSession,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to stop session:", error);
      setError(error instanceof Error ? error.message : "Failed to stop session");
    }
  }, [updateState, setError, state.currentSession]);

  const refreshSession = useCallback(async (sessionId: string) => {
    updateState({ isLoading: true, error: null });
    
    try {
      const session = sessionManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Refresh sessions list to get updated status
      const allSessions = sessionManager.getAllSessions();
      const updatedSession = allSessions.find(s => s.id === sessionId);
      
      updateState({
        sessions: allSessions,
        currentSession: state.currentSession?.id === sessionId ? updatedSession || null : state.currentSession,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to refresh session:", error);
      setError(error instanceof Error ? error.message : "Failed to refresh session");
    }
  }, [updateState, setError, state.currentSession]);

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
    clearError,
  };
}