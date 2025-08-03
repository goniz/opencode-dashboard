import { makeAssistantTool } from "@assistant-ui/react";

export interface OpenCodeToolArgs {
  sessionId: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, {
      type: "string" | "number" | "boolean" | "array" | "object";
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

// Create a dynamic tool from MCP tool definition
export function createDynamicTool(tool: MCPTool, args: OpenCodeToolArgs) {
  return makeAssistantTool({
    toolName: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
    execute: async (parameters: Record<string, unknown>) => {
      // OpenCode handles approval logic internally
      const response = await fetch("/api/opencode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: args.sessionId,
          toolName: tool.name,
          parameters
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to execute ${tool.name}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.result || result;
    }
  });
}