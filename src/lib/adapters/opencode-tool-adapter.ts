/**
 * OpenCode Tool Adapter
 * 
 * This adapter enables dynamic tool creation for OpenCode MCP (Model Context Protocol) tools
 * within the Assistant-UI framework. It creates Assistant-UI compatible tools from MCP tool
 * definitions and handles their execution through OpenCode's API.
 * 
 * Key responsibilities:
 * - Converts MCP tool definitions to Assistant-UI tool format
 * - Manages tool execution through OpenCode's tool API endpoint
 * - Handles tool approval workflow (managed by OpenCode internally)
 * - Provides error handling and result processing for tool calls
 * 
 * The MCP (Model Context Protocol) is a standard for AI model integrations that allows
 * tools to be defined with standardized schemas and executed in a controlled environment.
 * This adapter bridges MCP tools with Assistant-UI's tool calling system.
 */

import { makeAssistantTool } from "@assistant-ui/react";

export interface OpenCodeToolArgs {
  sessionId: string;
}

/**
 * Represents an MCP (Model Context Protocol) tool definition
 * MCP tools are standardized tool definitions that can be dynamically loaded
 * and executed within AI model contexts.
 */
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

/**
 * Creates a dynamic Assistant-UI tool from an MCP tool definition.
 * 
 * This function converts MCP tool schemas into Assistant-UI compatible tools
 * that can be used within the chat interface. The resulting tool will:
 * 1. Use the MCP tool's name, description, and parameter schema
 * 2. Execute the tool through OpenCode's API when called
 * 3. Handle approval workflow and error management
 * 
 * @param tool - The MCP tool definition to convert
 * @param args - OpenCode session arguments (sessionId for tool execution context)
 * @returns An Assistant-UI compatible tool that can execute the MCP tool
 */
export function createDynamicTool(tool: MCPTool, args: OpenCodeToolArgs) {
  return makeAssistantTool({
    toolName: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
    execute: async (parameters: Record<string, unknown>) => {
      // Execute the MCP tool through OpenCode's API endpoint
      // OpenCode handles the tool approval workflow, security checks, and actual execution
      const response = await fetch("/api/opencode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: args.sessionId,  // Associates tool execution with specific OpenCode session
          toolName: tool.name,        // Identifies which MCP tool to execute
          parameters                  // User-provided parameters for the tool
        })
      });

      // Handle API errors gracefully
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to execute ${tool.name}: ${response.statusText}`);
      }

      // Return the tool execution result
      // OpenCode may return either { result: ... } or the result directly
      const result = await response.json();
      return result.result || result;
    }
  });
}