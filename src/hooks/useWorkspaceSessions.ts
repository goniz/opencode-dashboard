import { useState, useCallback } from "react";
import type { ChatSession } from "@/lib/opencode-workspace";

export interface UseWorkspaceSessionsReturn {
  sessions: ChatSession[];
  activeSessionId: string | null;
  createSession: (workspaceId: string, model: string) => Promise<ChatSession>;
  deleteSession: (workspaceId: string, sessionId: string) => Promise<void>;
  setActiveSession: (sessionId: string | null) => void;
  refreshSessions: (workspaceId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useWorkspaceSessions(): UseWorkspaceSessionsReturn {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSessions = useCallback(async (targetWorkspaceId: string) => {
    if (!targetWorkspaceId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/workspaces/${targetWorkspaceId}/sessions`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.statusText}`);
      }
      
      const fetchedSessions = await response.json();
      setSessions(fetchedSessions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch sessions";
      setError(errorMessage);
      console.error("Error fetching sessions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSession = useCallback(async (targetWorkspaceId: string, model: string): Promise<ChatSession> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/workspaces/${targetWorkspaceId}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }
      
      const newSession = await response.json();
      setSessions(prev => [...prev, newSession]);
      setActiveSessionId(newSession.id);
      
      return newSession;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create session";
      setError(errorMessage);
      console.error("Error creating session:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSession = useCallback(async (targetWorkspaceId: string, sessionId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/workspaces/${targetWorkspaceId}/sessions/${sessionId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.statusText}`);
      }
      
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete session";
      setError(errorMessage);
      console.error("Error deleting session:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [activeSessionId]);

  const setActiveSession = useCallback((sessionId: string | null) => {
    setActiveSessionId(sessionId);
  }, []);

  return {
    sessions,
    activeSessionId,
    createSession,
    deleteSession,
    setActiveSession,
    refreshSessions,
    loading,
    error,
  };
}