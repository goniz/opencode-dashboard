"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  OpenCodeSession,
  OpenCodeSessionConfig,
} from "@/lib/opencode-session";
import { sessionManager, OpenCodeSessionError } from "@/lib/opencode-session";
import { OpenCodeError } from "@/lib/opencode-client";

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
    setState((prev) => ({ ...prev, ...updates }));
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
      } else if (error instanceof OpenCodeSessionError) {
        sessionError = {
          message: error.message,
          recoverySuggestion: error.recoverySuggestion,
        };
      } else if (error instanceof OpenCodeError) {
        sessionError = { message: error.message };
      } else {
        sessionError = { message: error.message };
      }

      updateState({ error: sessionError, isLoading: false });
    },
    [updateState]
  );

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const handleApiCall = async <T>(
    apiCall: () => Promise<T>,
    successHandler: (result: T) => void,
    errorHandler?: (error: Error) => void
  ) => {
    updateState({ isLoading: true, error: null });
    try {
      const result = await apiCall();
      successHandler(result);
    } catch (error) {
      console.error("API call failed:", error);
      setError(error as Error);
      if (errorHandler) {
        errorHandler(error as Error);
      }
    } finally {
      if (mountedRef.current) {
        updateState({ isLoading: false });
      }
    }
  };

  const loadSessions = useCallback(async () => {
    await handleApiCall(
      () => sessionManager.getAllSessions(),
      (localSessions) => {
        updateState({
          sessions: localSessions,
        });
      }
    );
  }, [updateState]);

  const createSession = useCallback(
    async (config: OpenCodeSessionConfig): Promise<OpenCodeSession> => {
      let session: OpenCodeSession | null = null;
      await handleApiCall(
        async () => {
          session = await sessionManager.startSession(config);
          return session;
        },
        () => {
          const allSessions = sessionManager.getAllSessions();
          updateState({
            sessions: allSessions,
            currentSession: session,
          });
        },
        (error) => {
          throw error; // Re-throw to be caught by the caller
        }
      );
      if (!session) {
        throw new Error("Session creation failed, but no error was thrown.");
      }
      return session;
    },
    [updateState]
  );

  const switchToSession = useCallback(
    (sessionId: string) => {
      const session = sessionManager.getSession(sessionId);
      if (session) {
        updateState({ currentSession: session });
      } else {
        setError(`Session ${sessionId} not found`);
      }
    },
    [updateState, setError]
  );

  const stopSession = useCallback(
    async (sessionId: string) => {
      await handleApiCall(
        () => sessionManager.stopSession(sessionId),
        () => {
          const allSessions = sessionManager.getAllSessions();
          const wasCurrentSession = state.currentSession?.id === sessionId;
          updateState({
            sessions: allSessions,
            currentSession: wasCurrentSession ? null : state.currentSession,
          });
        }
      );
    },
    [updateState, state.currentSession]
  );

  const refreshSession = useCallback(
    async (sessionId: string) => {
      await handleApiCall(
        () => sessionManager.getSession(sessionId),
        (session) => {
          if (!session) {
            throw new Error(`Session ${sessionId} not found`);
          }
          const allSessions = sessionManager.getAllSessions();
          const updatedSession = allSessions.find((s) => s.id === sessionId);
          updateState({
            sessions: allSessions,
            currentSession:
              state.currentSession?.id === sessionId
                ? updatedSession || null
                : state.currentSession,
          });
        }
      );
    },
    [updateState, state.currentSession]
  );

  const loadSessionMessages = useCallback(
    async (sessionId: string): Promise<unknown[]> => {
      try {
        const session = sessionManager.getSession(sessionId);
        if (!session || session.status !== "running" || !session.client) {
          console.warn(
            `Session ${sessionId} is not running or client not available`
          );
          return [];
        }

        const messages = await session.client.session.messages(sessionId);
        return messages || [];
      } catch (error) {
        console.error(`Failed to load messages for session ${sessionId}:`, error);
        setError(error as OpenCodeError);
        return [];
      }
    },
    [setError]
  );

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
_   stopSession,
    refreshSession,
    loadSessionMessages,
    clearError,
  };
}
