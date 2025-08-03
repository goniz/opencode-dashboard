/**
 * OpenCode Chat Adapter
 * 
 * This adapter connects Assistant-UI's chat interface with OpenCode's streaming chat API.
 * It handles the conversion between Assistant-UI message formats and OpenCode's API format,
 * and manages streaming responses including text content and tool calls.
 * 
 * Key responsibilities:
 * - Converts Assistant-UI messages to OpenCode API format
 * - Handles streaming Server-Sent Events (SSE) from OpenCode
 * - Extracts and formats text content and tool calls from OpenCode responses
 * - Provides real-time message updates during generation
 * - Manages errors and connection issues during streaming
 */

import type { ChatModelAdapter, ChatModelRunOptions, ChatModelRunResult } from "@assistant-ui/react";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import { extractTextContent, extractToolCalls } from "@/lib/message-converter";

export class OpenCodeChatAdapter implements ChatModelAdapter {
  constructor(
    private sessionId: string,
    private model: string,
    private provider: string
  ) {}

  async *run({ messages, abortSignal }: ChatModelRunOptions): AsyncGenerator<ChatModelRunResult> {
    // Convert assistant-ui messages to OpenCode format
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      throw new Error("Last message must be from user");
    }

    // Extract text content from message
    const messageContent = Array.isArray(lastMessage.content)
      ? lastMessage.content.filter(c => c.type === "text").map(c => c.text).join(" ")
      : lastMessage.content;

    // Call OpenCode API with streaming
    const response = await fetch("/api/opencode-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: this.sessionId,
        messages: [{ role: "user", content: messageContent }],
        model: this.model,
        provider: this.provider,
        stream: true,
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`OpenCode API error: ${response.statusText}`);
    }

    // Parse SSE stream
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";
    let currentText = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === "message_part_updated" && data.part?.text) {
                currentText = data.part.text;
                yield {
                  content: [{ type: "text", text: currentText }],
                };
              } else if (data.type === "chat_completed" && data.message) {
                // Final message from OpenCode - extract both text and tool calls
                const finalText = extractTextContent(data.message);
                const toolCalls = extractToolCalls(data.message);
                
                const content: Array<{ type: "text"; text: string } | { type: "tool-call"; toolCallId: string; toolName: string; args: ReadonlyJSONObject; argsText: string; result?: unknown }> = [];
                
                if (finalText) {
                  content.push({ type: "text", text: finalText });
                }
                
                // Add tool calls as tool invocations
                toolCalls.forEach(tool => {
                  content.push({
                    type: "tool-call" as const,
                    toolCallId: tool.id,
                    toolName: tool.name,
                    args: tool.args as ReadonlyJSONObject,
                    argsText: JSON.stringify(tool.args),
                    result: tool.result,
                  });
                });
                
                yield {
                  content: content.length > 0 ? content : [{ type: "text", text: finalText }],
                };
                return;
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch {
              console.warn("Failed to parse SSE data:", line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}