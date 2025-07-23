"use client";

import { useState } from "react";
import { Button } from "../../button";
import { cn } from "@/lib/utils";

interface SessionStarterProps {
  folder: string;
  model: string;
  onSessionStart: (sessionData: { sessionId: string; port: number }) => void;
  className?: string;
}

export default function SessionStarter({ folder, model, onSessionStart, className }: SessionStarterProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartSession = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch("/api/opencode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folder, model }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start session");
      }

      const data = await response.json();
      onSessionStart({
        sessionId: data.sessionId,
        port: data.port,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg", className)}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Ready to Start OpenCode Session
        </h2>
        
        <div className="space-y-3 mb-6">
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400">Folder:</p>
            <p className="font-mono text-sm text-gray-900 dark:text-white">{folder}</p>
          </div>
          
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400">Model:</p>
            <p className="font-mono text-sm text-gray-900 dark:text-white">{model}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <Button
          onClick={handleStartSession}
          disabled={isStarting}
          className="px-6 py-3 text-lg"
        >
          {isStarting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Starting OpenCode Session...
            </>
          ) : (
            "Start OpenCode Session"
          )}
        </Button>

        {isStarting && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            This may take a few moments while we launch the OpenCode server...
          </p>
        )}
      </div>
    </div>
  );
}