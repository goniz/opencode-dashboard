"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface SSEConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastHeartbeat: Date | null;
}

export interface SSEMessage {
  type: "workspace_update" | "heartbeat" | "error";
  data?: unknown;
  error?: string;
  timestamp: string;
}

export interface UseSSEConnectionReturn {
  connectionState: SSEConnectionState;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

export function useSSEConnection(
  url: string,
  onMessage: (message: SSEMessage) => void,
  options: {
    autoConnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
  } = {}
): UseSSEConnectionReturn {
  const {
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
  } = options;

  const [connectionState, setConnectionState] = useState<SSEConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastHeartbeat: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(true);

  const updateConnectionState = useCallback((updates: Partial<SSEConnectionState>) => {
    if (!mountedRef.current) return;
    setConnectionState((prev) => ({ ...prev, ...updates }));
  }, []);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return; // Already connected
    }

    cleanup();
    updateConnectionState({ isConnecting: true, error: null });

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("SSE connection opened");
        reconnectAttemptsRef.current = 0;
        updateConnectionState({
          isConnected: true,
          isConnecting: false,
          error: null,
        });
      };

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          
          if (message.type === "heartbeat") {
            updateConnectionState({ lastHeartbeat: new Date() });
          } else {
            onMessage(message);
          }
        } catch (error) {
          console.error("Error parsing SSE message:", error);
          updateConnectionState({
            error: "Failed to parse server message",
          });
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);
        
        updateConnectionState({
          isConnected: false,
          isConnecting: false,
          error: "Connection error",
        });

        // Attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, reconnectInterval);
        } else {
          updateConnectionState({
            error: `Failed to connect after ${maxReconnectAttempts} attempts`,
          });
        }
      };
    } catch (error) {
      console.error("Failed to create SSE connection:", error);
      updateConnectionState({
        isConnected: false,
        isConnecting: false,
        error: "Failed to establish connection",
      });
    }
  }, [url, onMessage, maxReconnectAttempts, reconnectInterval, cleanup, updateConnectionState]);

  const disconnect = useCallback(() => {
    cleanup();
    updateConnectionState({
      isConnected: false,
      isConnecting: false,
      error: null,
      lastHeartbeat: null,
    });
    reconnectAttemptsRef.current = 0;
  }, [cleanup, updateConnectionState]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, 100);
  }, [connect, disconnect]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [autoConnect, connect, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    connectionState,
    connect,
    disconnect,
    reconnect,
  };
}