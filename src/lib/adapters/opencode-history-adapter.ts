import type { ThreadHistoryAdapter, ThreadMessage } from "@assistant-ui/react";
import { messageConverter } from "@/lib/message-converter";
import type { OpenCodeMessage } from "@/lib/message-types";

export class OpenCodeHistoryAdapter implements ThreadHistoryAdapter {
  constructor(private sessionId: string) {}

  async load(): Promise<{ messages: ThreadMessage[] }> {
    try {
      const response = await fetch(`/api/opencode-chat?sessionId=${this.sessionId}`);
      if (!response.ok) {
        console.warn("Failed to load messages from OpenCode");
        return { messages: [] };
      }

      const data = await response.json();
      const openCodeMessages: OpenCodeMessage[] = data.messages || [];

      // Convert OpenCode messages to assistant-ui ThreadMessage format
      const messages: ThreadMessage[] = openCodeMessages.map((msg) => {
        const converted = messageConverter.openCodeToUseChat(msg);
        return {
          id: converted.id,
          role: converted.role,
          content: Array.isArray(converted.content) 
            ? converted.content 
            : [{ type: "text", text: converted.content }],
          createdAt: converted.createdAt || new Date(),
        };
      });

      return { messages };
    } catch (error) {
      console.error("Error loading OpenCode messages:", error);
      return { messages: [] };
    }
  }

  async append(message: ThreadMessage): Promise<void> {
    // OpenCode handles message persistence automatically
    // No need to manually save messages as they're stored in OpenCode session
    console.log("Message appended to OpenCode session:", message.id);
  }
}