"use client";

import type { Message as UseChatMessage } from "ai";
import type { OpenCodeMessage } from "./message-types";
import { messageConverter } from "./message-converter";
import type { OpenCodeSession } from "./opencode-session";

export interface MessageSyncState {
  lastSyncTimestamp: number;
  messageHashes: Set<string>;
  pendingSync: boolean;
}

export interface SyncResult {
  success: boolean;
  syncedMessages: UseChatMessage[];
  errors: string[];
  stats: {
    total: number;
    fromOpenCode: number;
    skipped: number;
  };
}

export interface MessageSyncOptions {
  enableRealTimeSync?: boolean;
  syncInterval?: number;
  maxRetries?: number;
  deduplicationEnabled?: boolean;
}

export class MessageSynchronizer {
  private syncStates = new Map<string, MessageSyncState>();
  private eventListeners = new Map<string, AbortController>();
  private options: Required<MessageSyncOptions>;

  constructor(options: MessageSyncOptions = {}) {
    this.options = {
      enableRealTimeSync: true,
      syncInterval: 2000,
      maxRetries: 3,
      deduplicationEnabled: true,
      ...options,
    };
  }

  /**
   * Initialize synchronization for a session
   */
  initializeSync(sessionId: string, initialMessages: UseChatMessage[] = []): MessageSyncState {
    const state: MessageSyncState = {
      lastSyncTimestamp: Date.now(),
      messageHashes: new Set(initialMessages.map(msg => this.generateMessageHash(msg))),
      pendingSync: false,
    };

    this.syncStates.set(sessionId, state);

    if (this.options.enableRealTimeSync) {
      this.startRealTimeSync(sessionId);
    }

    return state;
  }

  /**
   * Sync messages from OpenCode (OpenCode is always the source of truth)
   */
  async synchronizeMessages(
    sessionId: string,
    session: OpenCodeSession
  ): Promise<SyncResult> {
    const state = this.syncStates.get(sessionId);
    if (!state) {
      throw new Error(`Sync state not initialized for session ${sessionId}`);
    }

    if (state.pendingSync) {
      return {
        success: false,
        syncedMessages: [],
        errors: ["Sync already in progress"],
        stats: { total: 0, fromOpenCode: 0, skipped: 0 },
      };
    }

    state.pendingSync = true;

    try {
      // Get latest messages from OpenCode (the authoritative source)
      const openCodeMessages = await this.getOpenCodeMessages(session);
      
      // Convert OpenCode messages to useChat format
      const convertedMessages = openCodeMessages.map(msg => 
        messageConverter.openCodeToUseChat(msg)
      );

      // Filter out duplicates if deduplication is enabled
      let syncedMessages = convertedMessages;
      let skipped = 0;

      if (this.options.deduplicationEnabled) {
        const newMessages: UseChatMessage[] = [];
        
        for (const message of convertedMessages) {
          const messageHash = this.generateMessageHash(message);
          if (!state.messageHashes.has(messageHash)) {
            newMessages.push(message);
            state.messageHashes.add(messageHash);
          } else {
            skipped++;
          }
        }
        
        syncedMessages = newMessages;
      }

      // Sort messages by timestamp to maintain order
      syncedMessages.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });

      // Update sync state
      state.lastSyncTimestamp = Date.now();

      return {
        success: true,
        syncedMessages,
        errors: [],
        stats: {
          total: syncedMessages.length,
          fromOpenCode: convertedMessages.length,
          skipped,
        },
      };
    } catch (error) {
      return {
        success: false,
        syncedMessages: [],
        errors: [error instanceof Error ? error.message : "Unknown sync error"],
        stats: { total: 0, fromOpenCode: 0, skipped: 0 },
      };
    } finally {
      state.pendingSync = false;
    }
  }

  /**
   * Get all messages from OpenCode and return them as useChat messages
   */
  async getMessagesFromOpenCode(
    sessionId: string,
    session: OpenCodeSession
  ): Promise<UseChatMessage[]> {
    try {
      const openCodeMessages = await this.getOpenCodeMessages(session);
      const convertedMessages = openCodeMessages.map(msg => 
        messageConverter.openCodeToUseChat(msg)
      );

      // Sort by timestamp
      return convertedMessages.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });
    } catch (error) {
      console.warn(`Failed to get messages from OpenCode session ${sessionId}:`, error);
      return [];
    }
  }

  /**
   * Handle real-time message updates from OpenCode
   */
  private startRealTimeSync(sessionId: string): void {
    // Clean up existing listener
    this.stopRealTimeSync(sessionId);

    const controller = new AbortController();
    this.eventListeners.set(sessionId, controller);

    // Set up periodic sync
    const interval = setInterval(async () => {
      if (controller.signal.aborted) {
        clearInterval(interval);
        return;
      }

      // Trigger sync event for listeners
      this.notifyRealTimeUpdate(sessionId);
    }, this.options.syncInterval);

    controller.signal.addEventListener("abort", () => {
      clearInterval(interval);
    });
  }

  /**
   * Stop real-time synchronization for a session
   */
  stopRealTimeSync(sessionId: string): void {
    const controller = this.eventListeners.get(sessionId);
    if (controller) {
      controller.abort();
      this.eventListeners.delete(sessionId);
    }
  }

  /**
   * Clean up synchronization state for a session
   */
  cleanup(sessionId: string): void {
    this.stopRealTimeSync(sessionId);
    this.syncStates.delete(sessionId);
  }

  /**
   * Get synchronization state for a session
   */
  getSyncState(sessionId: string): MessageSyncState | undefined {
    return this.syncStates.get(sessionId);
  }

  /**
   * Generate a hash for message deduplication
   */
  private generateMessageHash(message: UseChatMessage): string {
    const content = `${message.role}:${message.content}:${message.createdAt?.getTime() || 0}`;
    return btoa(content).replace(/[^a-zA-Z0-9]/g, "").substring(0, 16);
  }

  /**
   * Get messages from OpenCode session
   */
  private async getOpenCodeMessages(session: OpenCodeSession): Promise<OpenCodeMessage[]> {
    if (!session.client || session.status !== "running") {
      return [];
    }

    try {
      const messages = await session.client.session.messages(session.id);
      if (!Array.isArray(messages)) {
        return [];
      }
      
      // Convert raw session messages to OpenCodeMessage format
      return messages.map((msg: unknown) => {
        const rawMsg = msg as Record<string, unknown>;
        const role = rawMsg.role as string || "assistant";
        
        if (role === "system") {
          return {
            id: rawMsg.id as string || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            role: "system",
            content: rawMsg.content as string || "",
            createdAt: rawMsg.createdAt as string || new Date().toISOString(),
          } as OpenCodeMessage;
        }
        
        return {
          id: rawMsg.id as string || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          role: role as "user" | "assistant",
          createdAt: rawMsg.createdAt as string || new Date().toISOString(),
          parts: (rawMsg.parts as Array<unknown>) || [],
        } as OpenCodeMessage;
      });
    } catch (error) {
      console.warn(`Failed to get messages from OpenCode session ${session.id}:`, error);
      return [];
    }
  }

  /**
   * Notify listeners of real-time updates
   */
  private notifyRealTimeUpdate(sessionId: string): void {
    // Emit custom event for real-time sync
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("opencode-sync-update", {
        detail: { sessionId, timestamp: Date.now() }
      }));
    }
  }
}

// Export singleton instance
export const messageSynchronizer = new MessageSynchronizer();

// Export utility functions
export function createMessageSynchronizer(options?: MessageSyncOptions): MessageSynchronizer {
  return new MessageSynchronizer(options);
}

export function isMessageSyncEnabled(): boolean {
  return typeof window !== "undefined" && "addEventListener" in window;
}