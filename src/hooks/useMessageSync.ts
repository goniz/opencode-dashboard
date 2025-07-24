"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Message as UseChatMessage } from "ai";
import type { OpenCodeSession } from "@/lib/opencode-session";
import { 
  messageSynchronizer, 
  type MessageSyncState, 
  type SyncResult,
  type MessageSyncOptions 
} from "@/lib/message-sync";

export interface UseMessageSyncOptions extends MessageSyncOptions {
  autoSync?: boolean;
  syncOnSessionChange?: boolean;
  onSyncComplete?: (result: SyncResult) => void;
  onError?: (error: string) => void;
}

export interface UseMessageSyncReturn {
  // State
  syncState: MessageSyncState | null;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  
  // Actions
  initializeSync: (sessionId: string, initialMessages?: UseChatMessage[]) => void;
  synchronizeMessages: () => Promise<SyncResult>;
  getMessagesFromOpenCode: () => Promise<UseChatMessage[]>;
  cleanup: () => void;
}

export function useMessageSync(
  session: OpenCodeSession | null,
  options: UseMessageSyncOptions = {}
): UseMessageSyncReturn {
  const [syncState, setSyncState] = useState<MessageSyncState | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  
  const optionsRef = useRef(options);
  const sessionRef = useRef(session);
  
  // Update refs when props change
  useEffect(() => {
    optionsRef.current = options;
    sessionRef.current = session;
  }, [options, session]);

  // Initialize synchronization for a session
  const initializeSync = useCallback((sessionId: string, initialMessages: UseChatMessage[] = []) => {
    try {
      const state = messageSynchronizer.initializeSync(sessionId, initialMessages);
      setSyncState(state);
      setLastSyncResult(null);
    } catch (error) {
      console.error("Failed to initialize sync:", error);
      optionsRef.current.onError?.(error instanceof Error ? error.message : "Failed to initialize sync");
    }
  }, []);

  // Synchronize messages from OpenCode (OpenCode is always the source of truth)
  const synchronizeMessages = useCallback(async (): Promise<SyncResult> => {
    if (!session || !session.id) {
      const errorResult: SyncResult = {
        success: false,
        syncedMessages: [],
        errors: ["No active session"],
        stats: { total: 0, fromOpenCode: 0, skipped: 0 },
      };
      return errorResult;
    }

    setIsSyncing(true);
    
    try {
      const result = await messageSynchronizer.synchronizeMessages(session.id, session);
      
      setLastSyncResult(result);
      
      if (!result.success && result.errors.length > 0) {
        optionsRef.current.onError?.(result.errors.join(", "));
      } else {
        optionsRef.current.onSyncComplete?.(result);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Sync failed";
      optionsRef.current.onError?.(errorMessage);
      
      const errorResult: SyncResult = {
        success: false,
        syncedMessages: [],
        errors: [errorMessage],
        stats: { total: 0, fromOpenCode: 0, skipped: 0 },
      };
      
      setLastSyncResult(errorResult);
      return errorResult;
    } finally {
      setIsSyncing(false);
    }
  }, [session]);

  // Get all messages from OpenCode
  const getMessagesFromOpenCode = useCallback(async (): Promise<UseChatMessage[]> => {
    if (!session || !session.id) {
      return [];
    }

    try {
      return await messageSynchronizer.getMessagesFromOpenCode(session.id, session);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to get messages from OpenCode";
      optionsRef.current.onError?.(errorMessage);
      return [];
    }
  }, [session]);

  // Cleanup synchronization
  const cleanup = useCallback(() => {
    if (session?.id) {
      messageSynchronizer.cleanup(session.id);
    }
    setSyncState(null);
    setLastSyncResult(null);
    setIsSyncing(false);
  }, [session?.id]);

  // Auto-sync when session changes
  useEffect(() => {
    if (options.syncOnSessionChange && session?.id && syncState) {
      // Trigger sync when session changes
      const timer = setTimeout(() => {
        if (sessionRef.current?.id === session.id) {
          // Only sync if session hasn't changed again
          synchronizeMessages();
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [session?.id, options.syncOnSessionChange, syncState, synchronizeMessages]);

  // Set up real-time sync listener
  useEffect(() => {
    if (!options.enableRealTimeSync || !session?.id) {
      return;
    }

    const handleRealTimeUpdate = (event: CustomEvent) => {
      if (event.detail.sessionId === session.id && options.autoSync) {
        // Debounce real-time updates
        const timer = setTimeout(() => {
          if (sessionRef.current?.id === session.id && !isSyncing) {
            synchronizeMessages();
          }
        }, 500);

        return () => clearTimeout(timer);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("opencode-sync-update", handleRealTimeUpdate as EventListener);
      
      return () => {
        window.removeEventListener("opencode-sync-update", handleRealTimeUpdate as EventListener);
      };
    }
  }, [session?.id, options.enableRealTimeSync, options.autoSync, isSyncing, synchronizeMessages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    syncState,
    isSyncing,
    lastSyncResult,
    initializeSync,
    synchronizeMessages,
    getMessagesFromOpenCode,
    cleanup,
  };
}