import type { Message as UseChatMessage } from "ai";
import type {
  MessageConverterOptions,
  OpenCodeMessage,
  OpenCodeUserMessage,
  OpenCodeAssistantMessage,
  UseChatToolInvocation,
} from "./message-types";

export class MessageConverter {
  private options: MessageConverterOptions;

  constructor(options: MessageConverterOptions = {}) {
    this.options = {
      preserveIds: true,
      includeTimestamps: true,
      extractFileContent: false,
      ...options,
    };
  }

  openCodeToUseChat(message: OpenCodeMessage): UseChatMessage {
    const baseMessage: Partial<UseChatMessage> = {
      id: this.options.preserveIds ? message.id || this.generateId() : this.generateId(),
      role: this.mapOpenCodeRoleToUseChat(message.role),
      createdAt: this.options.includeTimestamps ? new Date(message.createdAt || Date.now()) : undefined,
    };

    if (message.role === "user") {
      const userMessage = message as OpenCodeUserMessage;
      return {
        ...baseMessage,
        content: this.extractContentFromParts(userMessage.parts || []),
        role: "user",
      } as UseChatMessage;
    }

    if (message.role === "assistant") {
      const assistantMessage = message as OpenCodeAssistantMessage;
      const { content, toolInvocations } = this.extractAssistantContent(assistantMessage.parts || []);
      
      const result: UseChatMessage = {
        ...baseMessage,
        content,
        role: "assistant",
      } as UseChatMessage;

      if (toolInvocations.length > 0) {
        (result as unknown as { toolInvocations: UseChatToolInvocation[] }).toolInvocations = toolInvocations;
      }

      return result;
    }

    return {
      ...baseMessage,
      content: message.content || "",
      role: baseMessage.role || "assistant",
    } as UseChatMessage;
  }

  useChatToOpenCode(message: UseChatMessage): OpenCodeMessage {
    const baseMessage = {
      id: this.options.preserveIds ? message.id : this.generateId(),
      role: message.role,
      createdAt: this.options.includeTimestamps 
        ? (message.createdAt?.toISOString() || new Date().toISOString())
        : new Date().toISOString(),
    };

    if (message.role === "user") {
      return {
        ...baseMessage,
        role: "user",
        parts: this.createPartsFromContent(message.content),
      } as OpenCodeUserMessage;
    }

    if (message.role === "assistant") {
      const parts: Array<{ type: string; [key: string]: unknown }> = [];
      
      if (message.content) {
        parts.push({
          type: "text",
          text: message.content,
        });
      }

      const toolInvocations = (message as UseChatMessage & { toolInvocations?: UseChatToolInvocation[] }).toolInvocations;
      if (toolInvocations && Array.isArray(toolInvocations)) {
        parts.push(...this.convertToolInvocations(toolInvocations));
      }

      return {
        ...baseMessage,
        role: "assistant",
        parts: parts as unknown as OpenCodeAssistantMessage["parts"],
      } as OpenCodeAssistantMessage;
    }

    return {
      ...baseMessage,
      content: message.content,
    } as OpenCodeMessage;
  }

  convertMessageArray(
    messages: OpenCodeMessage[],
    direction: "opencode-to-usechat"
  ): UseChatMessage[];
  convertMessageArray(
    messages: UseChatMessage[],
    direction: "usechat-to-opencode"
  ): OpenCodeMessage[];
  convertMessageArray(
    messages: OpenCodeMessage[] | UseChatMessage[],
    direction: "opencode-to-usechat" | "usechat-to-opencode"
  ): UseChatMessage[] | OpenCodeMessage[] {
    if (direction === "opencode-to-usechat") {
      return (messages as OpenCodeMessage[]).map(msg => this.openCodeToUseChat(msg));
    } else {
      return (messages as UseChatMessage[]).map(msg => this.useChatToOpenCode(msg));
    }
  }

  private mapOpenCodeRoleToUseChat(role: string): "user" | "assistant" | "system" {
    switch (role) {
      case "user":
        return "user";
      case "assistant":
        return "assistant";
      case "system":
        return "system";
      default:
        return "assistant";
    }
  }

  private extractContentFromParts(parts: Array<{ type: string; text?: string; path?: string; content?: string }>): string {
    const textParts = parts
      .filter(part => part.type === "text")
      .map(part => part.text || "");

    if (this.options.extractFileContent) {
      const fileParts = parts
        .filter(part => part.type === "file")
        .map(part => `[File: ${part.path || "unknown"}]${part.content ? `\n${part.content}` : ""}`);
      
      textParts.push(...fileParts);
    }

    return textParts.join("\n").trim();
  }

  private extractAssistantContent(parts: Array<{ type: string; text?: string; toolCallId?: string; toolName?: string; args?: Record<string, unknown>; result?: unknown }>): {
    content: string;
    toolInvocations: UseChatToolInvocation[];
  } {
    const textContent = this.extractContentFromParts(parts);
    const toolInvocations: UseChatToolInvocation[] = [];

    const toolParts = parts.filter(part => part.type === "tool");
    
    for (const toolPart of toolParts) {
      toolInvocations.push({
        toolCallId: toolPart.toolCallId || this.generateId(),
        toolName: toolPart.toolName || "unknown",
        args: toolPart.args || {},
        result: toolPart.result,
      });
    }

    return { content: textContent, toolInvocations };
  }

  private createPartsFromContent(content: string): Array<{ type: string; text: string }> {
    if (!content.trim()) {
      return [];
    }

    return [{
      type: "text",
      text: content,
    }];
  }

  private convertToolInvocations(toolInvocations: UseChatToolInvocation[]): Array<{ type: string; toolCallId: string; toolName: string; args: Record<string, unknown>; result?: unknown; state: string }> {
    return toolInvocations.map(invocation => ({
      type: "tool",
      toolCallId: invocation.toolCallId,
      toolName: invocation.toolName,
      args: invocation.args,
      result: invocation.result,
      state: invocation.result ? "completed" : "pending",
    }));
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

export const messageConverter = new MessageConverter();

export function openCodeToUseChat(
  message: OpenCodeMessage,
  options?: MessageConverterOptions
): UseChatMessage {
  const converter = new MessageConverter(options);
  return converter.openCodeToUseChat(message);
}

export function useChatToOpenCode(
  message: UseChatMessage,
  options?: MessageConverterOptions
): OpenCodeMessage {
  const converter = new MessageConverter(options);
  return converter.useChatToOpenCode(message);
}

export function convertMessageArray(
  messages: OpenCodeMessage[] | UseChatMessage[],
  direction: "opencode-to-usechat" | "usechat-to-opencode",
  options?: MessageConverterOptions
): UseChatMessage[] | OpenCodeMessage[] {
  const converter = new MessageConverter(options);
  if (direction === "opencode-to-usechat") {
    return converter.convertMessageArray(messages as OpenCodeMessage[], direction);
  } else {
    return converter.convertMessageArray(messages as UseChatMessage[], direction);
  }
}

export function extractTextContent(message: OpenCodeMessage | UseChatMessage): string {
  if ("content" in message && typeof message.content === "string") {
    return message.content;
  }
  
  if ("parts" in message && Array.isArray((message as { parts: unknown }).parts)) {
    const parts = (message as { parts: Array<{ type: string; text?: string }> }).parts;
    return parts
      .filter(part => part.type === "text")
      .map(part => part.text || "")
      .join("\n") || "";
  }
  
  return "";
}

export function extractFileAttachments(message: OpenCodeMessage): Array<{ path: string; content?: string }> {
  if (!("parts" in message) || !Array.isArray((message as { parts: unknown }).parts)) {
    return [];
  }
  
  const parts = (message as { parts: Array<{ type: string; path?: string; content?: string }> }).parts;
  return parts
    .filter(part => part.type === "file")
    .map(part => ({
      path: part.path || "unknown",
      content: part.content,
    }));
}

export function extractToolCalls(message: OpenCodeMessage | UseChatMessage): Array<{
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}> {
  if ("toolInvocations" in message && Array.isArray((message as { toolInvocations: unknown }).toolInvocations)) {
    const toolInvocations = (message as { toolInvocations: Array<{ toolCallId: string; toolName: string; args: Record<string, unknown>; result?: unknown }> }).toolInvocations;
    return toolInvocations.map(invocation => ({
      id: invocation.toolCallId,
      name: invocation.toolName,
      args: invocation.args,
      result: invocation.result,
    }));
  }
  
  if ("parts" in message && Array.isArray((message as { parts: unknown }).parts)) {
    const parts = (message as { parts: Array<{ type: string; toolCallId?: string; toolName?: string; args?: Record<string, unknown>; result?: unknown }> }).parts;
    return parts
      .filter(part => part.type === "tool")
      .map(part => ({
        id: part.toolCallId || "unknown",
        name: part.toolName || "unknown",
        args: part.args || {},
        result: part.result,
      })) || [];
  }
  
  return [];
}

export function hasToolCalls(message: OpenCodeMessage | UseChatMessage): boolean {
  return extractToolCalls(message).length > 0;
}

export function hasFileAttachments(message: OpenCodeMessage): boolean {
  return extractFileAttachments(message).length > 0;
}

export function getMessageType(message: OpenCodeMessage | UseChatMessage): "text" | "tool" | "file" | "mixed" {
  const hasText = extractTextContent(message).trim().length > 0;
  const hasTools = hasToolCalls(message);
  const hasFiles = "parts" in message && hasFileAttachments(message as OpenCodeMessage);
  
  const typeCount = [hasText, hasTools, hasFiles].filter(Boolean).length;
  
  if (typeCount > 1) return "mixed";
  if (hasTools) return "tool";
  if (hasFiles) return "file";
  return "text";
}

export function createTextMessage(
  role: "user" | "assistant" | "system",
  content: string,
  options?: { id?: string; timestamp?: Date }
): { opencode: OpenCodeMessage; usechat: UseChatMessage } {
  const id = options?.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const timestamp = options?.timestamp || new Date();
  
  const opencode = {
    id,
    role,
    createdAt: timestamp.toISOString(),
    parts: role === "user" || role === "assistant" ? [{ type: "text", text: content }] : undefined,
    content: role === "system" ? content : undefined,
  } as OpenCodeMessage;
  
  const usechat: UseChatMessage = {
    id,
    role,
    content,
    createdAt: timestamp,
  };
  
  return { opencode, usechat };
}

export function createToolMessage(
  role: "assistant",
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result?: unknown }>,
  options?: { id?: string; timestamp?: Date; textContent?: string }
): { opencode: OpenCodeMessage; usechat: UseChatMessage } {
  const id = options?.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const timestamp = options?.timestamp || new Date();
  
  const parts: Array<{ type: string; [key: string]: unknown }> = [];
  const toolInvocations: UseChatToolInvocation[] = [];
  
  if (options?.textContent) {
    parts.push({ type: "text", text: options.textContent });
  }
  
  toolCalls.forEach((tool, index) => {
    const toolCallId = `tool_${id}_${index}`;
    
    parts.push({
      type: "tool",
      toolCallId,
      toolName: tool.name,
      args: tool.args,
      result: tool.result,
      state: tool.result ? "completed" : "pending",
    });
    
    toolInvocations.push({
      toolCallId,
      toolName: tool.name,
      args: tool.args,
      result: tool.result,
    });
  });
  
  const opencode: OpenCodeMessage = {
    id,
    role,
    createdAt: timestamp.toISOString(),
    parts: parts as unknown as OpenCodeAssistantMessage["parts"],
  };
  
  const usechat: UseChatMessage = {
    id,
    role,
    content: options?.textContent || "",
    createdAt: timestamp,
  } as UseChatMessage;
  
  if (toolInvocations.length > 0) {
    (usechat as unknown as { toolInvocations: UseChatToolInvocation[] }).toolInvocations = toolInvocations;
  }
  
  return { opencode, usechat };
}