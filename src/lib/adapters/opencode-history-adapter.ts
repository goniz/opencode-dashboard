import type { ThreadHistoryAdapter, ThreadMessage } from "@assistant-ui/react";

export class OpenCodeHistoryAdapter implements ThreadHistoryAdapter {
  constructor(private _sessionId: string) {}

  async load(): Promise<{ messages: Array<{ message: ThreadMessage; parentId: string | null }>; headId?: string | null } & { unstable_resume?: boolean }> {
    // For now, return empty messages - the LocalRuntime will handle message loading differently
    // This adapter is mainly for persistence, not initial loading
    return { messages: [] };
  }

  async append(item: { message: ThreadMessage; parentId: string | null }): Promise<void> {
    // OpenCode handles message persistence automatically
    // No need to manually save messages as they're stored in OpenCode session
    console.log("Message appended to OpenCode session:", item.message.id);
  }
}