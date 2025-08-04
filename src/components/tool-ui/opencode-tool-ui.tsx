"use client";

import { useState } from "react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { 
  FileTextIcon, 
  EditIcon, 
  TerminalIcon, 
  FolderIcon, 
  SearchIcon,
  CheckCircleIcon,
  XCircleIcon,
  LoaderIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from "lucide-react";

// Dynamic tool configuration based on tool name patterns
function getToolConfig(toolName: string) {
  const name = toolName.toLowerCase();
  const title = toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  // File operations
  if (name.includes('read') || name.includes('get') || name.includes('fetch')) {
    return {
      icon: FileTextIcon,
      title,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    };
  }
  
  // Write/edit operations
  if (name.includes('write') || name.includes('edit') || name.includes('create') || name.includes('save')) {
    return {
      icon: EditIcon,
      title,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    };
  }
  
  // Command/execution operations
  if (name.includes('execute') || name.includes('run') || name.includes('bash') || name.includes('shell') || name.includes('command')) {
    return {
      icon: TerminalIcon,
      title,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    };
  }
  
  // List/directory operations
  if (name.includes('list') || name.includes('ls') || name.includes('dir') || name.includes('glob')) {
    return {
      icon: FolderIcon,
      title,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    };
  }
  
  // Search operations
  if (name.includes('search') || name.includes('find') || name.includes('grep') || name.includes('query')) {
    return {
      icon: SearchIcon,
      title,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200"
    };
  }
  
  // Default configuration
  return {
    icon: TerminalIcon,
    title,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200"
  };
}

interface OpenCodeToolUIProps {
  toolName: string;
  args: Record<string, unknown>;
  result?: string;
  isError?: boolean;
  status: "running" | "complete" | "error";
}

function OpenCodeToolUIComponent({ toolName, args, result, isError, status }: OpenCodeToolUIProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const config = getToolConfig(toolName);
  const Icon = config.icon;

  const getStatusIcon = () => {
    switch (status) {
      case "running":
        return <LoaderIcon className="h-4 w-4 animate-spin text-blue-500" />;
      case "complete":
        return isError 
          ? <XCircleIcon className="h-4 w-4 text-red-500" />
          : <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const formatArgValue = (value: unknown): string => {
    if (typeof value === 'string') {
      return value.length > 100 ? `${value.slice(0, 100)}...` : value;
    }
    if (value === null || value === undefined) {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const formatResult = (result: string): string => {
    if (result.length > 500) {
      return `${result.slice(0, 500)}...`;
    }
    return result;
  };

  return (
    <div className={`border rounded-lg p-3 mb-2 ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.color}`} />
          <span className={`font-medium text-sm ${config.color}`}>
            {config.title}
          </span>
          {getStatusIcon()}
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-white/50 rounded"
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Show primary argument dynamically */}
      <div className="mt-2 text-xs text-gray-600">
        {(() => {
          // Find the most relevant argument to display
          const primaryArg = 
            args.filePath || args.path || args.file || 
            args.command || args.cmd ||
            args.pattern || args.query || args.search ||
            args.name || args.id ||
            Object.values(args)[0]; // fallback to first argument

          if (typeof primaryArg === 'string' && primaryArg) {
            return (
              <span className="font-mono bg-gray-100 px-1 rounded text-xs">
                {primaryArg}
              </span>
            );
          }
          
          return null;
        })()}
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {/* Full arguments */}
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-1">Parameters:</h4>
            <div className="bg-white/70 rounded p-2 text-xs font-mono">
              {Object.entries(args).map(([key, value]) => (
                <div key={key} className="mb-1">
                  <span className="text-gray-600">{key}:</span>{" "}
                  <span className="text-gray-900">{formatArgValue(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-1">
                {isError ? "Error:" : "Result:"}
              </h4>
              <div className={`rounded p-2 text-xs font-mono ${
                isError 
                  ? "bg-red-50 text-red-800 border border-red-200" 
                  : "bg-white/70 text-gray-900"
              }`}>
                {formatResult(result)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Create a generic tool UI that can handle any OpenCode tool
export const OpenCodeGenericToolUI = makeAssistantToolUI<
  Record<string, unknown>,
  unknown
>({
  toolName: "*", // This will match any tool name
  render: ({ toolName, args, result, status }) => {
    const toolStatus = status.type === "complete" 
      ? "complete"
      : status.type === "incomplete" 
        ? "error" 
        : "running";

    const isError = status.type === "incomplete";
    
    return (
      <OpenCodeToolUIComponent
        toolName={toolName}
        args={args}
        result={typeof result === 'string' ? result : JSON.stringify(result)}
        isError={isError}
        status={toolStatus}
      />
    );
  },
});

// Export individual tool UIs for specific tools
export const BashToolUI = makeAssistantToolUI<
  { command: string; description?: string },
  string
>({
  toolName: "bash",
  render: ({ args, result, status }) => {
    const toolStatus = status.type === "complete" 
      ? "complete"
      : status.type === "incomplete" 
        ? "error" 
        : "running";

    const isError = status.type === "incomplete";
    
    return (
      <OpenCodeToolUIComponent
        toolName="bash"
        args={args}
        result={result}
        isError={isError}
        status={toolStatus}
      />
    );
  },
});

export const ReadToolUI = makeAssistantToolUI<
  { filePath: string; offset?: number; limit?: number },
  string
>({
  toolName: "read",
  render: ({ args, result, status }) => {
    const toolStatus = status.type === "complete" 
      ? "complete"
      : status.type === "incomplete" 
        ? "error" 
        : "running";

    const isError = status.type === "incomplete";
    
    return (
      <OpenCodeToolUIComponent
        toolName="read"
        args={args}
        result={result}
        isError={isError}
        status={toolStatus}
      />
    );
  },
});

export const EditToolUI = makeAssistantToolUI<
  { filePath: string; oldString: string; newString: string },
  string
>({
  toolName: "edit",
  render: ({ args, result, status }) => {
    const toolStatus = status.type === "complete" 
      ? "complete"
      : status.type === "incomplete" 
        ? "error" 
        : "running";

    const isError = status.type === "incomplete";
    
    return (
      <OpenCodeToolUIComponent
        toolName="edit"
        args={args}
        result={result}
        isError={isError}
        status={toolStatus}
      />
    );
  },
});