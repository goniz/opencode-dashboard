"use client";

import { useState, useEffect } from "react";
import { OpenCodeSidebar } from "@/components/ui/opencode-sidebar";
import { NewWorkspaceForm } from "@/components/ui/new-workspace-form";
import { WorkspaceChat } from "@/components/ui/workspace-chat";
import MobileNavigation from "@/components/mobile-navigation";
import { useTaskContext } from "@/contexts/TaskContext";
import { Button } from "@/components/button";
import { ArrowLeftIcon, SettingsIcon } from "lucide-react";

type ViewState = "sidebar" | "new-task" | "chat" | "workspace-dashboard" | "tools" | "workspaces";

export default function Home() {
  const { currentSession, sessions: workspaces, switchToSession } = useTaskContext();
  const [viewState, setViewState] = useState<ViewState>("workspaces");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [showAdvancedView, setShowAdvancedView] = useState(false);

  const handleOpenWorkspace = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    setViewState("workspace-dashboard");
  };

  

  const handleBackToWorkspaces = () => {
    setViewState("workspaces");
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
          <WorkspaceChat onBackToSidebar={handleBackToWorkspaces} />
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
          <WorkspaceChat onBackToSidebar={handleBackToWorkspaces} />
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
          <NewWorkspaceForm 
            onBackToSidebar={handleBackToWorkspaces}
            onWorkspaceCreated={(workspaceId) => {
              // Handle workspace creation
              console.log("Workspace created:", workspaceId);
            }}
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
          <OpenCodeSidebar 
            onOpenWorkspace={handleOpenWorkspace}
            onCreateNewWorkspace={() => setViewState("new-task")}
          />
        </div>
      </div>
    );
  }
}
