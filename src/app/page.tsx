"use client";

import { useState, useEffect } from "react";
import WorkspaceManager from "@/components/workspace-manager";
import WorkspaceDashboard from "@/components/workspace-dashboard";
import OpenCodeChatInterface from "@/components/opencode-chat-interface";
import { useOpenCodeSession } from "@/hooks/useOpenCodeWorkspace";
import { Button } from "../../button";
import { ArrowLeftIcon } from "lucide-react";

type ViewState = "workspaces" | "workspace-dashboard" | "chat";

export default function Home() {
  const { currentSession, sessions: workspaces, switchToSession } = useOpenCodeSession();
  const [viewState, setViewState] = useState<ViewState>("workspaces");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  const handleOpenWorkspace = (workspaceId: string) => {
    console.log("🎯 handleOpenWorkspace called for workspace:", workspaceId);
    setSelectedWorkspaceId(workspaceId);
    setViewState("workspace-dashboard");
  };

  const handleOpenChat = async (sessionId?: string) => {
    console.log("🎯 handleOpenChat called, switching to chat view");
    
    // Store the current view state to restore it if needed
    const previousViewState = viewState;
    
    if (sessionId) {
      console.log("Session ID provided:", sessionId);
      
      // First, find the session in the workspaces
      let foundSession = false;
      
      for (const workspace of workspaces) {
        if (workspace.sessions?.some(s => s.id === sessionId)) {
          console.log("Found session in workspace:", workspace.id);
          foundSession = true;
          
          try {
            // Set the selected workspace ID to ensure it's available
            setSelectedWorkspaceId(workspace.id);
            
            // Switch to this session
            await switchToSession(sessionId);
            console.log("Switched to session:", sessionId);
            
            // Now it's safe to change the view state
            setViewState("chat");
          } catch (error) {
            console.error("Error switching to session:", error);
            // Restore previous view state on error
            setViewState(previousViewState);
          }
          
          break;
        }
      }
      
      if (!foundSession) {
        console.log("Could not find workspace containing session:", sessionId);
        // Don't change view state if session not found
      }
    } else if (currentSession) {
      // If no session ID is provided but we have a current session, just switch to chat view
      console.log("No session ID provided, using current session:", currentSession.id);
      setViewState("chat");
    } else {
      console.log("No valid session found, not switching to chat view");
      // Don't change view state if no valid session
    }
  };

  const handleBackToWorkspaces = () => {
    setViewState("workspaces");
  };

  // Handle case where chat view is requested but no session is available
  useEffect(() => {
    if (viewState === "chat") {
      if (!currentSession) {
        console.log("❌ No current session available for chat view");
        
        // Check if we have any workspaces with sessions
        const hasAnySessions = workspaces.some(w => w.sessions && w.sessions.length > 0);
        
        if (hasAnySessions) {
          console.log("🔍 Found workspaces with sessions, trying to load one");
          
          // Try to load the first available session
          for (const workspace of workspaces) {
            if (workspace.sessions && workspace.sessions.length > 0) {
              const firstSession = workspace.sessions[0];
              console.log("🔄 Attempting to switch to session:", firstSession.id);
              
              // Set the selected workspace ID
              setSelectedWorkspaceId(workspace.id);
              
              // Switch to this session
              switchToSession(firstSession.id)
                .then(() => {
                  console.log("✅ Successfully switched to session:", firstSession.id);
                })
                .catch(error => {
                  console.error("❌ Failed to switch to session:", error);
                  console.log("⬅️ Returning to workspaces view");
                  setViewState("workspaces");
                });
              
              return;
            }
          }
        } else {
          console.log("⬅️ No sessions available, returning to workspaces view");
          setViewState("workspaces");
        }
      } else {
        console.log("✅ Current session available for chat view:", currentSession.id);
      }
    }
  }, [viewState, currentSession, workspaces, switchToSession, setSelectedWorkspaceId]);

  console.log("🔍 Render - viewState:", viewState, "currentSession:", currentSession?.id);

  if (viewState === "workspace-dashboard") {
    const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);
    
    if (!selectedWorkspace) {
      console.log("❌ Selected workspace not found, returning to workspaces view");
      setViewState("workspaces");
      return null;
    }

    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToWorkspaces}
                  className="flex items-center gap-2"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back to Workspaces
                </Button>
                <div className="h-4 w-px bg-border" />
                <div>
                  <h1 className="text-lg font-semibold text-foreground">
                    Workspace Dashboard
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {selectedWorkspace.folder.split("/").pop()} • {selectedWorkspace.model}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="py-8">
          <WorkspaceDashboard
            workspaceData={{
              workspaceId: selectedWorkspace.id,
              port: selectedWorkspace.port,
              folder: selectedWorkspace.folder,
              model: selectedWorkspace.model,
            }}
            onWorkspaceStop={handleBackToWorkspaces}
            onOpenChat={(sessionId) => handleOpenChat(sessionId)}
          />
        </div>
      </div>
    );
  }

  if (viewState === "chat") {
    console.log("💬 Attempting to show chat view");
    if (!currentSession) {
      console.log("⏳ Waiting for session to be set...");
      return null;
    }
    console.log("✅ Showing chat interface for session:", currentSession.id);

    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToWorkspaces}
                  className="flex items-center gap-2"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back to Workspaces
                </Button>
                <div className="h-4 w-px bg-border" />
                <div>
                  <h1 className="text-lg font-semibold text-foreground">
                    OpenCode Chat
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {currentSession.folder.split("/").pop()} • {currentSession.model}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  currentSession.status === "running" 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    currentSession.status === "running" 
                      ? "bg-green-500 animate-pulse" 
                      : "bg-yellow-500 animate-pulse"
                  }`} />
                  {currentSession.status}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="h-[calc(100vh-73px)]">
          <OpenCodeChatInterface />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            OpenCode Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage your OpenCode workspaces
          </p>
        </div>
        
        <WorkspaceManager onOpenWorkspace={handleOpenWorkspace} />
      </div>
    </div>
  );
}
