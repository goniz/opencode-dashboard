"use client";

import { useState, useEffect } from "react";
import { AlertTriangleIcon, CheckCircleIcon, XCircleIcon, RefreshCwIcon } from "lucide-react";

interface OpenCodeConnectionStatusProps {
  sessionId: string;
}

interface ConnectionStatus {
  connected: boolean;
  source: "opencode" | "error" | "loading";
  message?: string;
  toolCount: number;
}

export function OpenCodeConnectionStatus({ sessionId }: OpenCodeConnectionStatusProps) {
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    source: "loading",
    toolCount: 0
  });

  const checkConnection = async () => {
    try {
      setStatus(prev => ({ ...prev, source: "loading" }));
      
      const response = await fetch(`/api/opencode/tools?sessionId=${sessionId}`);
      const data = await response.json();
      
      setStatus({
        connected: data.source === "opencode",
        source: data.source,
        message: data.message,
        toolCount: data.tools?.length || 0
      });
    } catch {
      setStatus({
        connected: false,
        source: "error",
        message: "Failed to check OpenCode connection",
        toolCount: 0
      });
    }
  };

  useEffect(() => {
    checkConnection();
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusIcon = () => {
    switch (status.source) {
      case "loading":
        return <RefreshCwIcon className="h-4 w-4 animate-spin text-blue-500" />;
      case "opencode":
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangleIcon className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status.source) {
      case "opencode":
        return "border-green-200 bg-green-50 text-green-800";
      case "error":
        return "border-red-200 bg-red-50 text-red-800";
      case "loading":
        return "border-blue-200 bg-blue-50 text-blue-800";
      default:
        return "border-yellow-200 bg-yellow-50 text-yellow-800";
    }
  };

  const getStatusText = () => {
    switch (status.source) {
      case "loading":
        return "Checking OpenCode connection...";
      case "opencode":
        return `Connected to OpenCode (${status.toolCount} tools available)`;
      case "error":
        return status.message || "OpenCode connection failed";
      default:
        return "Unknown connection status";
    }
  };

  // Don't show anything if connected and working
  if (status.connected && status.source === "opencode") {
    return null;
  }

  return (
    <div className={`border rounded-lg p-3 mb-4 ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">
            {getStatusText()}
          </span>
        </div>
        
        {status.source === "error" && (
          <button
            onClick={checkConnection}
            className="text-xs px-2 py-1 bg-white/50 hover:bg-white/70 rounded border"
          >
            Retry
          </button>
        )}
      </div>
      
      {status.source === "error" && (
        <div className="mt-2 text-xs opacity-75">
          <p>Make sure OpenCode is running and accessible. Tools will not be available until the connection is restored.</p>
          {process.env.NODE_ENV === "development" && (
            <p className="mt-1">
              Expected OpenCode at: {process.env.OPENCODE_HOST || "localhost"}:{process.env.OPENCODE_PORT || "8080"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}