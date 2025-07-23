"use client";

import { useState } from "react";
import { Button } from "../../button";
import { cn } from "@/lib/utils";
import { AlertTriangleIcon, CheckCircleIcon, FolderIcon, BrainIcon, ServerIcon } from "lucide-react";

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
    <div className={cn("w-full max-w-2xl mx-auto p-8 bg-background rounded-2xl shadow-2xl border border-border/50", className)}>
      <div className="text-center">
        <div className="flex items-center justify-center mb-4 text-foreground">
          <CheckCircleIcon className="w-7 h-7 text-green-500 mr-3" />
          <h2 className="text-3xl font-bold">
            OpenCode Session Running
          </h2>
        </div>
        
        <p className="text-muted-foreground mb-8">
          Your OpenCode server is active and ready to use.
        </p>

        <div className="space-y-4 mb-8 text-left">
          <InfoCard icon={<ServerIcon />} label="Server URL">
            <a 
              href={`http://localhost:${sessionData.port}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-primary hover:underline"
            >
              http://localhost:{sessionData.port}
            </a>
          </InfoCard>
          
          <InfoCard icon={<FolderIcon />} label="Project Folder">
            <p className="font-mono text-sm text-foreground">{sessionData.folder}</p>
          </InfoCard>
          
          <InfoCard icon={<BrainIcon />} label="Model">
            <p className="font-mono text-sm text-foreground">{sessionData.model}</p>
          </InfoCard>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertTriangleIcon className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="font-semibold text-destructive">Error</p>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <Button
            onClick={openInBrowser}
            size="lg"
            className="flex-1 bg-primary/90 hover:bg-primary"
          >
            Open Dashboard
          </Button>
          
          <Button
            onClick={handleStopSession}
            disabled={isStopping}
            variant="outline"
            size="lg"
            className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {isStopping ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                Stopping...
              </>
            ) : (
              "Stop Session"
            )}
          </Button>
        </div>

        <div className="mt-6 text-xs text-muted-foreground/80">
          <p>Session ID: <span className="font-mono">{sessionData.sessionId}</span></p>
        </div>
      </div>
    </div>
  );
}

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function InfoCard({ icon, label, children }: InfoCardProps) {
  return (
    <div className="p-4 bg-muted/50 border border-border/50 rounded-lg flex items-center gap-4">
      <div className="w-8 h-8 flex items-center justify-center text-muted-foreground bg-background rounded-md border border-border/50">
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        {children}
      </div>
    </div>
  )
}