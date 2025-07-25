"use client";

import { useState } from "react";
import { Button } from "../../button";
import { cn } from "@/lib/utils";
import { AlertTriangleIcon, CheckCircleIcon, FolderIcon, BrainIcon, ServerIcon, MessageSquareIcon, XIcon } from "lucide-react";
import SessionManager from "./session-manager";

interface WorkspaceData {
  workspaceId: string;
  port: number;
  folder: string;
  model: string;
}

interface WorkspaceDashboardProps {
  workspaceData: WorkspaceData;
  onWorkspaceStop: () => void;
  onOpenChat: () => void;
  className?: string;
}

export default function WorkspaceDashboard({ workspaceData, onWorkspaceStop, onOpenChat, className }: WorkspaceDashboardProps) {
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSessionManager, setShowSessionManager] = useState(false);

  const handleStopWorkspace = async () => {
    setIsStopping(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${workspaceData.workspaceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to stop workspace");
      }

      onWorkspaceStop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsStopping(false);
    }
  };

  const openInBrowser = () => {
    window.open(`http://localhost:${workspaceData.port}`, "_blank");
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto p-8 bg-background rounded-2xl shadow-2xl border border-border/50", className)}>
      <div className="text-center">
        <div className="flex items-center justify-center mb-4 text-foreground">
          <CheckCircleIcon className="w-7 h-7 text-green-500 mr-3" />
          <h2 className="text-3xl font-bold">
            OpenCode Workspace Running
          </h2>
        </div>
        
        <p className="text-muted-foreground mb-8">
          Your OpenCode server is active and ready to use.
        </p>

        <div className="space-y-4 mb-8 text-left">
          <InfoCard icon={<ServerIcon />} label="Server URL">
            <a 
              href={`http://localhost:${workspaceData.port}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-primary hover:underline"
            >
              http://localhost:{workspaceData.port}
            </a>
          </InfoCard>
          
          <InfoCard icon={<FolderIcon />} label="Project Folder">
            <p className="font-mono text-sm text-foreground">{workspaceData.folder}</p>
          </InfoCard>
          
          <InfoCard icon={<BrainIcon />} label="Model">
            <p className="font-mono text-sm text-foreground">{workspaceData.model}</p>
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

        <div className="flex gap-4 justify-center mb-6">
          <Button
            onClick={() => setShowSessionManager(true)}
            size="lg"
            className="flex-1 bg-primary/90 hover:bg-primary"
          >
            <MessageSquareIcon className="w-5 h-5 mr-2" />
            Manage Sessions
          </Button>
          
          <Button
            onClick={handleStopWorkspace}
            disabled={isStopping}
            variant="outline"
            size="lg"
            className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {isStopping ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                Deleting...
              </>
            ) : (
              "Delete Workspace"
            )}
          </Button>
        </div>

        <div className="text-center">
          <Button
            onClick={openInBrowser}
            variant="outline"
            size="lg"
            className="w-full max-w-md"
          >
            <ServerIcon className="w-5 h-5 mr-2" />
            Open in Browser
          </Button>
        </div>

        <div className="mt-6 text-xs text-muted-foreground/80">
          <p>Workspace ID: <span className="font-mono">{workspaceData.workspaceId}</span></p>
        </div>
      </div>

      {/* Session Management Modal */}
      {showSessionManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 border border-border max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Manage Sessions</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Workspace: {workspaceData.folder.split("/").pop()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSessionManager(false)}
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>
            <SessionManager
              workspaceId={workspaceData.workspaceId}
              onOpenChat={(sessionId) => {
                console.log("Opening chat for session:", sessionId);
                setShowSessionManager(false);
                onOpenChat();
              }}
            />
          </div>
        </div>
      )}
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