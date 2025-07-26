"use client";

import { useState, useEffect } from "react";
import WorkspaceManager from "@/components/workspace-manager";
import WorkspaceDashboard from "@/components/workspace-dashboard";
import OpenCodeChatInterface from "@/components/opencode-chat-interface";
import { useOpenCodeSessionContext } from "@/contexts/OpenCodeWorkspaceContext";
import { Button } from "../../button";
import { ArrowLeftIcon } from "lucide-react";

type ViewState = "workspaces" | "workspace-dashboard" | "chat";

export default function Home() {
  const { currentSession, sessions: workspaces, switchToSession } = useOpenCodeSessionContext();
  const [viewState, setViewState] = useState<ViewState>("workspaces");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  const handleOpenWorkspace = (workspaceId: string) => {
    console.log("🎯 handleOpenWorkspace called for workspace:", workspaceId);
    setSelectedWorkspaceId(workspaceId);
    setViewState("workspace-dashboard");
  };

  const handleOpenChat = async (sessionId?: string) => {
    console.log("🎯 handleOpenChat called, switching to chat view");
    console.log("📋 Available workspaces:", workspaces.map(w => ({ 
      id: w.id, 
      sessions: w.sessions?.map(s => s.id) || [] 
    })));
    
    if (sessionId) {
      console.log("Session ID provided:", sessionId);
      
      // First, find the workspace that contains this session
      let foundWorkspace = null;
      
      for (const workspace of workspaces) {
        console.log(`🔍 Checking workspace ${workspace.id} for session ${sessionId}`);
        console.log(`   Workspace sessions:`, workspace.sessions?.map(s => s.id) || []);
        
        if (workspace.sessions?.some(s => s.id === sessionId)) {
          console.log("✅ Found session in workspace:", workspace.id);
          foundWorkspace = workspace;
          break;
        }
      }
      
      if (foundWorkspace) {
        try {
          console.log("🔄 Setting up workspace transition...");
          
          // Set the selected workspace ID to ensure it's available
          setSelectedWorkspaceId(foundWorkspace.id);
          
          // Switch to chat view first to show loading state
          setViewState("chat");
          
          // Switch to the workspace (not the individual session)
          // The chat interface will handle the specific session
          await switchToSession(foundWorkspace.id);
          console.log("✅ Successfully switched to workspace:", foundWorkspace.id);
        } catch (error) {
          console.error("❌ Error switching to workspace:", error);
          // Return to workspace dashboard on error
          setViewState("workspace-dashboard");
        }
      } else {
        console.log("❌ Could not find workspace containing session:", sessionId);
        console.log("   This might mean the session data hasn't loaded yet or the session doesn't exist");
        
        // For now, let's try to find the workspace by ID if the sessionId looks like a workspace ID
        // This is a fallback in case the session data structure is different than expected
        const workspaceById = workspaces.find(w => w.id === sessionId);
        if (workspaceById) {
          console.log("🔄 Treating sessionId as workspaceId, found workspace:", workspaceById.id);
          try {
            setSelectedWorkspaceId(workspaceById.id);
            setViewState("chat");
            await switchToSession(workspaceById.id);
            console.log("✅ Successfully switched to workspace by ID:", workspaceById.id);
          } catch (error) {
            console.error("❌ Error switching to workspace by ID:", error);
            setViewState("workspace-dashboard");
          }
        } else {
          console.log("❌ Could not find workspace by ID either");
        }
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
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading chat session...</p>
          </div>
        </div>
      );
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
