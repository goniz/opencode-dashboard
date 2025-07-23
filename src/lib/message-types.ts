import type { Message as UseChatMessage } from "ai";

export interface MessageConverterOptions {
  preserveIds?: boolean;
  includeTimestamps?: boolean;
  extractFileContent?: boolean;
}

export interface OpenCodeMessageBase {
  id?: string;
  role: string;
  content?: string;
  createdAt?: string;
}

export interface OpenCodeTextPart {
  type: "text";
  text: string;
}

export interface OpenCodeFilePart {
  type: "file";
  path: string;
  content?: string;
}

export interface OpenCodeToolPart {
  type: "tool";
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  state?: "pending" | "running" | "completed" | "error";
}

export interface OpenCodeSnapshotPart {
  type: "snapshot";
  data: Record<string, unknown>;
}

export interface OpenCodeStepPart {
  type: "step-start" | "step-finish";
  step: string;
}

export type OpenCodePart = 
  | OpenCodeTextPart 
  | OpenCodeFilePart 
  | OpenCodeToolPart 
  | OpenCodeSnapshotPart 
  | OpenCodeStepPart;

export interface OpenCodeUserMessage extends OpenCodeMessageBase {
  role: "user";
  parts: OpenCodePart[];
}

export interface OpenCodeAssistantMessage extends OpenCodeMessageBase {
  role: "assistant";
  parts: OpenCodePart[];
}

export interface OpenCodeSystemMessage extends OpenCodeMessageBase {
  role: "system";
  content: string;
}

export type OpenCodeMessage = 
  | OpenCodeUserMessage 
  | OpenCodeAssistantMessage 
  | OpenCodeSystemMessage;

export interface UseChatToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export type ExtendedUseChatMessage = UseChatMessage & {
  toolInvocations?: UseChatToolInvocation[];
};

export interface MessageConversionResult {
  opencode: OpenCodeMessage;
  usechat: UseChatMessage;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface FileAttachment {
  path: string;
  content?: string;
}

export type MessageType = "text" | "tool" | "file" | "mixed";

export interface MessageAnalysis {
  type: MessageType;
  hasText: boolean;
  hasTools: boolean;
  hasFiles: boolean;
  textContent: string;
  toolCalls: ToolCall[];
  fileAttachments: FileAttachment[];
}

export interface CreateMessageOptions {
  id?: string;
  timestamp?: Date;
  textContent?: string;
}

export interface CreateToolMessageOptions extends CreateMessageOptions {
  textContent?: string;
}

export type ConversionDirection = "opencode-to-usechat" | "usechat-to-opencode";

export interface MessageConverterConfig {
  defaultOptions?: MessageConverterOptions;
  enableValidation?: boolean;
  strictTypeChecking?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MessageMetadata {
  id: string;
  role: string;
  timestamp: Date;
  size: number;
  hasAttachments: boolean;
  hasToolCalls: boolean;
}

export type MessageRole = "user" | "assistant" | "system";

export interface MessageFilter {
  role?: MessageRole;
  hasText?: boolean;
  hasTools?: boolean;
  hasFiles?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ConversionStats {
  totalMessages: number;
  successfulConversions: number;
  failedConversions: number;
  warnings: string[];
  errors: string[];
}