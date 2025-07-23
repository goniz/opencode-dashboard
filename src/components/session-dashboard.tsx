"use client";

import { useState } from "react";
import { Button } from "../../button";
import { cn } from "@/lib/utils";

interface SessionData {
  sessionId: string;
  port: number;
  folder: string;
  model: string;
}

interface SessionDashboardProps {
  sessionData: SessionData;
  onSessionStop: () => void;
  className?: string;
}

export default function SessionDashboard({ sessionData, onSessionStop, className }: SessionDashboardProps) {
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStopSession = async () => {
    setIsStopping(true);
    setError(null);

    try {
      const response = await fetch(`/api/opencode?sessionId=${sessionData.sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to stop session");
      }

      onSessionStop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsStopping(false);
    }
  };

  const openInBrowser = () => {
    window.open(`http://localhost:${sessionData.port}`, "_blank");
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg", className)}>
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            OpenCode Session Running
          </h2>
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded">
            <p className="text-sm text-green-600 dark:text-green-400">Server URL:</p>
            <p className="font-mono text-sm text-green-800 dark:text-green-300">
              http://localhost:{sessionData.port}
            </p>
          </div>
          
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400">Folder:</p>
            <p className="font-mono text-sm text-gray-900 dark:text-white">{sessionData.folder}</p>
          </div>
          
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400">Model:</p>
            <p className="font-mono text-sm text-gray-900 dark:text-white">{sessionData.model}</p>
          </div>

          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400">Session ID:</p>
            <p className="font-mono text-xs text-gray-900 dark:text-white">{sessionData.sessionId}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button
            onClick={openInBrowser}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600"
          >
            Open in Browser
          </Button>
          
          <Button
            onClick={handleStopSession}
            disabled={isStopping}
            variant="outline"
            className="px-6 py-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            {isStopping ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                Stopping...
              </>
            ) : (
              "Stop Session"
            )}
          </Button>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <p>Your OpenCode server is running and ready to use!</p>
          <p>Click &quot;Open in Browser&quot; to access the OpenCode interface.</p>
        </div>
      </div>
    </div>
  );
}