"use client";

import { useState } from "react";
import { Button } from "../../button";
import { cn } from "@/lib/utils";
import { AlertTriangleIcon, CheckCircleIcon, FolderIcon, BrainIcon, ServerIcon, MessageSquareIcon } from "lucide-react";
import SessionManager from "./session-manager";
import ResponsiveSidebar from "./responsive-sidebar";

interface WorkspaceData {
  workspaceId: string;
  port: number;
  folder: string;
  model: string;
}

interface WorkspaceDashboardProps {
  workspaceData: WorkspaceData;
  onWorkspaceStop: () => void;
  onOpenChat: (sessionId?: string) => void;
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



  return (
    <div className={cn("w-full max-w-2xl mx-auto p-4 md:p-6 lg:p-8 bg-background rounded-lg md:rounded-2xl shadow-lg md:shadow-2xl border border-border/50", className)}>
      <div className="text-center">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-3 mb-4 text-foreground">
          <CheckCircleIcon className="w-6 h-6 md:w-7 md:h-7 text-green-500 mx-auto sm:mx-0" />
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold">
            OpenCode Workspace Running
          </h2>
        </div>
        
        <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8">
          Your OpenCode server is active and ready to use.
        </p>

        <div className="space-y-3 md:space-y-4 mb-6 md:mb-8 text-left">
          <InfoCard icon={<ServerIcon />} label="Server URL">
            <a 
              href={`http://localhost:${workspaceData.port}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs md:text-sm text-primary hover:underline break-all"
            >
              http://localhost:{workspaceData.port}
            </a>
          </InfoCard>
          
          <InfoCard icon={<FolderIcon />} label="Project Folder">
            <p className="font-mono text-xs md:text-sm text-foreground break-all">{workspaceData.folder}</p>
          </InfoCard>
          
          <InfoCard icon={<BrainIcon />} label="Model">
            <p className="font-mono text-xs md:text-sm text-foreground">{workspaceData.model}</p>
          </InfoCard>
        </div>

        {error && (
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertTriangleIcon className="h-4 w-4 md:h-5 md:w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="font-semibold text-destructive text-sm md:text-base">Error</p>
              <p className="text-xs md:text-sm text-destructive/80 mt-1 break-words">{error}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mb-4 md:mb-6">
          <Button
            onClick={() => setShowSessionManager(true)}
            size="lg"
            className="flex-1 bg-primary/90 hover:bg-primary min-h-[44px]"
          >
            <MessageSquareIcon className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            <span className="hidden sm:inline">Manage Sessions</span>
            <span className="sm:hidden">Sessions</span>
          </Button>
          
          <Button
            onClick={handleStopWorkspace}
            disabled={isStopping}
            variant="outline"
            size="lg"
            className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive min-h-[44px]"
          >
            {isStopping ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-b-2 border-current mr-2"></div>
                <span className="hidden sm:inline">Deleting...</span>
                <span className="sm:hidden">Deleting...</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Delete Workspace</span>
                <span className="sm:hidden">Delete</span>
              </>
            )}
          </Button>
        </div>



        <div className="mt-4 md:mt-6 text-xs text-muted-foreground/80">
          <p className="break-all">Workspace ID: <span className="font-mono">{workspaceData.workspaceId}</span></p>
        </div>
      </div>

      {/* Session Management Sidebar */}
      <ResponsiveSidebar
        isOpen={showSessionManager}
        onClose={() => setShowSessionManager(false)}
        title="Manage Sessions"
      >
        <div className="p-4">
          <p className="text-muted-foreground text-sm mb-4">
            Workspace: {workspaceData.folder.split("/").pop()}
          </p>
          <SessionManager
            workspaceId={workspaceData.workspaceId}
            folderPath={workspaceData.folder}
            defaultModel={workspaceData.model}
            onOpenChat={(sessionId: string) => {
              console.log("Opening chat for session:", sessionId);
              setShowSessionManager(false);
              onOpenChat(sessionId);
            }}
          />
        </div>
      </ResponsiveSidebar>
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
    <div className="p-3 md:p-4 bg-muted/50 border border-border/50 rounded-lg flex items-start gap-3 md:gap-4">
      <div className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-muted-foreground bg-background rounded-md border border-border/50 flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs md:text-sm text-muted-foreground">{label}</p>
        <div className="mt-1">
          {children}
        </div>
      </div>
    </div>
  )
}