import { makeAssistantTool } from "@assistant-ui/react";

export interface OpenCodeToolArgs {
  sessionId: string;
  onApprovalRequired?: (toolName: string, args: Record<string, unknown>) => Promise<boolean>;
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

// List of tool names that require user approval before execution
const DESTRUCTIVE_TOOLS = [
  "write",
  "edit", 
  "create",
  "delete",
  "remove",
  "execute",
  "run",
  "bash",
  "shell",
  "command",
  "git_commit",
  "git_push"
];

function requiresApproval(toolName: string): boolean {
  return DESTRUCTIVE_TOOLS.some(destructive => 
    toolName.toLowerCase().includes(destructive)
  );
}

// Fetch available tools from OpenCode
export async function fetchOpenCodeTools(sessionId: string): Promise<MCPTool[]> {
  try {
    const response = await fetch(`/api/opencode/tools?sessionId=${sessionId}`);
    if (!response.ok) {
      console.warn("Failed to fetch tools from OpenCode, using fallback");
      return [];
    }
    
    const data = await response.json();
    
    // Log the source of tools for debugging
    if (data.source === "error") {
      console.warn("OpenCode tools unavailable:", data.message);
    } else if (data.source === "opencode") {
      console.info(`Successfully loaded ${data.tools?.length || 0} tools from OpenCode`);
    }
    
    return data.tools || [];
  } catch (error) {
    console.error("Error fetching OpenCode tools:", error);
    return [];
  }
}

// Create a dynamic tool from MCP tool definition
export function createDynamicTool(tool: MCPTool, args: OpenCodeToolArgs) {
  return makeAssistantTool({
    toolName: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
    execute: async (parameters: Record<string, unknown>) => {
      // Check for approval if tool is potentially destructive
      if (requiresApproval(tool.name) && args.onApprovalRequired) {
        const approved = await args.onApprovalRequired(tool.name, parameters);
        if (!approved) {
          throw new Error(`${tool.name} operation cancelled by user`);
        }
      }

      const response = await fetch("/api/opencode/tools", {
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

// Create all available OpenCode tools dynamically
export async function createOpenCodeTools(args: OpenCodeToolArgs) {
  const mcpTools = await fetchOpenCodeTools(args.sessionId);
  
  return mcpTools.map(tool => createDynamicTool(tool, args));
}