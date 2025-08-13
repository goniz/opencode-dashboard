"use client";

import { useState, useEffect } from "react";
import WorkspaceManager from "@/components/workspace-manager";
import WorkspaceDashboard from "@/components/workspace-dashboard";
import AgentFlow from "@/components/agent-flow";
import QuickStart from "@/components/quick-start";
import MobileNavigation from "@/components/mobile-navigation";
import { useOpenCodeSessionContext } from "@/contexts/OpenCodeWorkspaceContext";
import { Button } from "@/components/button";
import { ArrowLeftIcon, SettingsIcon } from "lucide-react";

type ViewState = "workspaces" | "workspace-dashboard" | "chat" | "tools" | "agent-flow";

export default function Home() {
  const { currentSession, sessions: workspaces, switchToSession, createSession, createOpenCodeSession } = useOpenCodeSessionContext();
  const [viewState, setViewState] = useState<ViewState>("workspaces");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [showAdvancedView, setShowAdvancedView] = useState(false);

  const handleOpenWorkspace = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    setViewState("workspace-dashboard");
  };

  const handleNewAgent = () => {
    setViewState("agent-flow");
  };

  const handleNewChat = async () => {
    if (selectedWorkspaceId) {
      const workspace = workspaces.find(w => w.id === selectedWorkspaceId);
      if (workspace) {
        try {
          const newSession = await createOpenCodeSession(workspace.id, workspace.model);
          await switchToSession(workspace.id, newSession.id);
          setViewState("chat");
        } catch (error) {
          console.error("Failed to create or switch to session:", error);
        }
      }
    }
  };

  const handleOpenChat = async (sessionId?: string) => {
    if (sessionId) {
      // First, find the workspace that contains this session
      let foundWorkspace = null;
      
      for (const workspace of workspaces) {
        if (workspace.sessions?.some(s => s.id === sessionId)) {
          foundWorkspace = workspace;
          break;
        }
      }
      
      if (foundWorkspace) {
        try {
          // Set the selected workspace ID to ensure it's available
          setSelectedWorkspaceId(foundWorkspace.id);
          
          // Switch to chat view first to show loading state
          setViewState("chat");
          
          // Switch to the workspace (not the individual session)
          // The chat interface will handle the specific session
          await switchToSession(foundWorkspace.id);
        } catch (error) {
          console.error("Error switching to workspace:", error);
          // Return to workspace dashboard on error
          setViewState("workspace-dashboard");
        }
      } else {
        // Fallback: try to find the workspace by ID if the sessionId looks like a workspace ID
        const workspaceById = workspaces.find(w => w.id === sessionId);
        if (workspaceById) {
          try {
            setSelectedWorkspaceId(workspaceById.id);
            setViewState("chat");
            await switchToSession(workspaceById.id);
          } catch (error) {
            console.error("Error switching to workspace by ID:", error);
            setViewState("workspace-dashboard");
          }
        }
      }
    } else if (currentSession) {
      // If no session ID is provided but we have a current session, just switch to chat view
      setViewState("chat");
    }
  };

  const handleBackToWorkspaces = () => {
    setViewState("workspaces");
  };

  const handleQuickStartWorkspaceCreated = async (workspaceData: { folder: string; model: string; autoOpenChat?: boolean }) => {
    try {
      // Create the workspace using the session context
      const workspace = await createSession({
        folder: workspaceData.folder,
        model: workspaceData.model
      });
      
      // If auto-chat is enabled, create an OpenCode session and go directly to chat
      if (workspaceData.autoOpenChat) {
        try {
          await createOpenCodeSession(workspace.id, workspaceData.model);
          // Wait a bit for the session data to be properly loaded
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Wait for the workspace to appear in the workspaces list
          let retries = 0;
          const maxRetries = 20;
          let foundWorkspace = null;
          
          while (retries < maxRetries && !foundWorkspace) {
            foundWorkspace = workspaces.find(w => w.id === workspace.id);
            if (foundWorkspace) {
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
          }
          
          if (foundWorkspace) {
            // Switch to the workspace (which now contains the session)
            await switchToSession(workspace.id);
            setSelectedWorkspaceId(workspace.id);
            setViewState("chat");
          } else {
            setSelectedWorkspaceId(workspace.id);
            setViewState("workspace-dashboard");
          }
        } catch (sessionError) {
          console.error("Failed to create OpenCode session:", sessionError);
          // Fall back to workspace dashboard if session creation fails
          setSelectedWorkspaceId(workspace.id);
          setViewState("workspace-dashboard");
        }
      } else {
        // Otherwise go to workspace dashboard
        setSelectedWorkspaceId(workspace.id);
        setViewState("workspace-dashboard");
      }
    } catch (error) {
      console.error("Failed to create workspace:", error);
      // Stay on quick start view to show error
    }
  };

  // Handle case where chat view is requested but no session is available
  useEffect(() => {
    if (viewState === "chat") {
      if (!currentSession) {
        // Set a timeout to prevent infinite loading
        const timeout = setTimeout(() => {
          setViewState("workspaces");
        }, 10000); // 10 second timeout
        
        // Check if we have any workspaces with sessions
        const hasAnySessions = workspaces.some(w => w.sessions && w.sessions.length > 0);
        
        if (hasAnySessions) {
          // Try to load the first available session
          for (const workspace of workspaces) {
            if (workspace.sessions && workspace.sessions.length > 0) {
              const firstSession = workspace.sessions[0];
              
              // Set the selected workspace ID
              setSelectedWorkspaceId(workspace.id);
              
              // Switch to this session
              switchToSession(firstSession.id)
                .then(() => {
                  clearTimeout(timeout);
                })
                .catch(error => {
                  console.error("Failed to switch to session:", error);
                  clearTimeout(timeout);
                  setViewState("workspaces");
                });
              
              return () => clearTimeout(timeout);
            }
          }
        } else {
          clearTimeout(timeout);
          setViewState("workspaces");
        }
        
        return () => clearTimeout(timeout);
      }
    }
  }, [viewState, currentSession, workspaces, switchToSession, setSelectedWorkspaceId, showAdvancedView]);



  if (viewState === "workspace-dashboard") {
    const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);
    
    if (!selectedWorkspace) {
      setViewState("workspaces");
      return null;
    }

    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <MobileNavigation
          currentView={viewState}
          onNavigate={setViewState}
          onBackToWorkspaces={handleBackToWorkspaces}
        />
        
        <div className="hidden md:block border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
            onOpenChat={(sessionId?: string) => handleOpenChat(sessionId)}
            onNewChat={handleNewChat}
            onNewAgent={handleNewAgent}
          />
        </div>
      </div>
    );
  }

  if (viewState === "agent-flow") {
    const handleBackToDashboard = () => {
      setViewState("workspace-dashboard");
    };

    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <MobileNavigation
          currentView={viewState}
          onNavigate={setViewState}
          onBackToWorkspaces={handleBackToWorkspaces}
        />

        <div className="hidden md:block border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToDashboard}
                  className="flex items-center gap-2"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="h-[calc(100vh-73px)] md:h-[calc(100vh-73px)]">
          <AgentFlow />
        </div>
      </div>
    );
  }

  if (viewState === "chat") {
    if (!currentSession) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground mb-2">Loading chat session...</p>
            <p className="text-sm text-muted-foreground/70">
              Setting up your workspace and creating the chat session. This should only take a moment.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <MobileNavigation
          currentView={viewState}
          onNavigate={setViewState}
          onBackToWorkspaces={handleBackToWorkspaces}
        />
        
        <div className="hidden md:block border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
        <div className="h-[calc(100vh-73px)] md:h-[calc(100vh-73px)]">
          <AgentFlow />
        </div>
      </div>
    );
  }

  // Quick Start view
  if (viewState === "tools") {
    return (
      <div className="min-h-screen bg-background py-8 pb-16 md:pb-8">
        <MobileNavigation
          currentView={viewState}
          onNavigate={setViewState}
          onBackToWorkspaces={handleBackToWorkspaces}
        />
        
        <div className="hidden md:block border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-foreground">
                    OpenCode Dashboard
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Quick Start - Get coding in seconds
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAdvancedView(true);
                  setViewState("workspaces");
                }}
                className="flex items-center gap-2"
              >
                <SettingsIcon className="w-4 h-4" />
                Advanced View
              </Button>
            </div>
          </div>
        </div>
        
        <div className="py-8 mt-16 md:mt-0">
          <QuickStart 
            onWorkspaceCreated={handleQuickStartWorkspaceCreated}
            onWorkspaceOpen={handleOpenWorkspace}
          />
        </div>
      </div>
    );
  }

  // Advanced workspaces view
  if (viewState === "workspaces") {
    return (
      <div className="min-h-screen bg-background py-8 pb-16 md:pb-8">
        <MobileNavigation
          currentView={viewState}
          onNavigate={setViewState}
          onBackToWorkspaces={handleBackToWorkspaces}
        />
        
        <div className="hidden md:block border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAdvancedView(false);
                    setViewState("workspaces");
                  }}
                  className="flex items-center gap-2"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back to Quick Start
                </Button>
                <div className="h-4 w-px bg-border" />
                <div>
                  <h1 className="text-lg font-semibold text-foreground">
                    Advanced Workspace Management
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Full workspace control and management
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-8 mt-16 md:mt-0">
          <WorkspaceManager onOpenWorkspace={handleOpenWorkspace} />
        </div>
      </div>
    );
  }
}
