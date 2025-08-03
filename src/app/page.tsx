"use client";

import { useState, useEffect } from "react";
import WorkspaceManager from "@/components/workspace-manager";
import WorkspaceDashboard from "@/components/workspace-dashboard";
import OpenCodeChatInterface from "@/components/opencode-chat-interface";
import QuickStart from "@/components/quick-start";
import MobileNavigation from "@/components/mobile-navigation";
import { useOpenCodeSessionContext } from "@/contexts/OpenCodeWorkspaceContext";
import { Button } from "@/components/button";
import { ArrowLeftIcon, SettingsIcon } from "lucide-react";

type ViewState = "quick-start" | "workspaces" | "workspace-dashboard" | "chat";

export default function Home() {
  const { currentSession, sessions: workspaces, switchToSession, createSession, createOpenCodeSession } = useOpenCodeSessionContext();
  const [viewState, setViewState] = useState<ViewState>("quick-start");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [showAdvancedView, setShowAdvancedView] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (message: string) => {
    setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Debug: Monitor currentSession changes
  useEffect(() => {
    const sessionInfo = currentSession ? `Session: ${currentSession.id} (${currentSession.status})` : "No session";
    addDebugInfo(`Current session: ${sessionInfo}`);
    console.log("🔍 currentSession changed:", currentSession ? { id: currentSession.id, status: currentSession.status } : "null");
  }, [currentSession]);

  // Debug: Monitor workspaces changes
  useEffect(() => {
    addDebugInfo(`Workspaces: ${workspaces.length} total`);
    console.log("🔍 workspaces changed:", workspaces.map(w => ({ id: w.id, status: w.status, sessions: w.sessions?.length || 0 })));
  }, [workspaces]);

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
    setViewState(showAdvancedView ? "workspaces" : "quick-start");
  };

  const handleQuickStartWorkspaceCreated = async (workspaceData: { folder: string; model: string; autoOpenChat?: boolean }) => {
    console.log("🚀 Quick Start workspace creation requested:", workspaceData);
    
    try {
      // Create the workspace using the session context
      const workspace = await createSession({
        folder: workspaceData.folder,
        model: workspaceData.model
      });
      
      console.log("✅ Workspace created successfully:", workspace.id);
      
      // If auto-chat is enabled, create an OpenCode session and go directly to chat
      if (workspaceData.autoOpenChat) {
          console.log("🎯 Auto-opening chat - creating OpenCode session for workspace:", workspace.id);
          addDebugInfo("Creating OpenCode session...");
        
        try {
          const sessionId = await createOpenCodeSession(workspace.id, workspaceData.model);
          console.log("✅ OpenCode session created successfully:", sessionId);
          addDebugInfo(`Session created: ${sessionId}`);          
          // Wait a bit for the session data to be properly loaded
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log("🔍 Available workspaces before switching:", workspaces.map(w => ({ id: w.id, sessions: w.sessions?.length || 0 })));
          console.log("🎯 Attempting to switch to workspace:", workspace.id);
          
          // Wait for the workspace to appear in the workspaces list
          let retries = 0;
          const maxRetries = 20;
          let foundWorkspace = null;
          
          while (retries < maxRetries && !foundWorkspace) {
            foundWorkspace = workspaces.find(w => w.id === workspace.id);
            if (foundWorkspace) {
              console.log("✅ Found workspace in context:", foundWorkspace.id);
              break;
            }
            console.log(`⏳ Waiting for workspace to appear in context, retry ${retries + 1}`);
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
          }
          
          if (foundWorkspace) {
            addDebugInfo("Switching to workspace...");
            // Switch to the workspace (which now contains the session)
            await switchToSession(workspace.id);
            
            console.log("✅ Switch completed");
            addDebugInfo("Switch completed, setting chat view");
            setSelectedWorkspaceId(workspace.id);
            setViewState("chat");
            
            console.log("🎬 View state set to chat");
          } else {
            console.log("❌ Workspace not found in context after retries, falling back to dashboard");
            addDebugInfo("Workspace not found, using dashboard");
            setSelectedWorkspaceId(workspace.id);
            setViewState("workspace-dashboard");
          }
        } catch (sessionError) {
          console.error("❌ Failed to create OpenCode session:", sessionError);
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
      console.error("❌ Failed to create workspace:", error);
      // Stay on quick start view to show error
    }
  };

  // Handle case where chat view is requested but no session is available
  useEffect(() => {
    if (viewState === "chat") {
      if (!currentSession) {
        console.log("❌ No current session available for chat view");
        
        // Set a timeout to prevent infinite loading
        const timeout = setTimeout(() => {
          console.log("⏰ Chat loading timeout reached, returning to workspaces");
          setViewState(showAdvancedView ? "workspaces" : "quick-start");
        }, 10000); // 10 second timeout
        
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
                  clearTimeout(timeout);
                })
                .catch(error => {
                  console.error("❌ Failed to switch to session:", error);
                  console.log("⬅️ Returning to workspaces view");
                  clearTimeout(timeout);
                  setViewState(showAdvancedView ? "workspaces" : "quick-start");
                });
              
              return () => clearTimeout(timeout);
            }
          }
        } else {
          console.log("⬅️ No sessions available, returning to workspaces view");
          clearTimeout(timeout);
          setViewState(showAdvancedView ? "workspaces" : "quick-start");
        }
        
        return () => clearTimeout(timeout);
      } else {
        console.log("✅ Current session available for chat view:", currentSession.id);
      }
    }
  }, [viewState, currentSession, workspaces, switchToSession, setSelectedWorkspaceId, showAdvancedView]);

  console.log("🔍 Render - viewState:", viewState, "currentSession:", currentSession?.id);

  // Debug info overlay
  const DebugOverlay = () => (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs max-w-xs z-50">
      <div className="font-bold mb-2">Debug Info:</div>
      {debugInfo.map((info, i) => (
        <div key={i} className="mb-1">{info}</div>
      ))}
      <div className="mt-2 pt-2 border-t border-white/20">
        <div>View: {viewState}</div>
        <div>Current Session: {currentSession?.id || "none"}</div>
        <div>Workspaces: {workspaces.length}</div>
      </div>
    </div>
  );

  if (viewState === "workspace-dashboard") {
    const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);
    
    if (!selectedWorkspace) {
      console.log("❌ Selected workspace not found, returning to workspaces view");
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
          />
        </div>
      </div>
    );
  }

  if (viewState === "chat") {
    console.log("💬 Attempting to show chat view");
    console.log("🔍 Current session state:", currentSession ? { id: currentSession.id, status: currentSession.status } : "null");
    console.log("🔍 Available workspaces:", workspaces.map(w => ({ id: w.id, status: w.status, sessions: w.sessions?.length || 0 })));
    
    if (!currentSession) {
      console.log("⏳ Waiting for session to be set...");
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <DebugOverlay />
          <div className="text-center max-w-md mx-auto px-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground mb-2">Loading chat session...</p>
            <p className="text-sm text-muted-foreground/70">
              Setting up your workspace and creating the chat session. This should only take a moment.
            </p>
            
            {/* Debug info for mobile */}
            <div className="mt-8 bg-gray-900 text-white p-4 rounded-lg text-xs text-left">
              <div className="font-bold mb-2">Debug Info:</div>
              {debugInfo.map((info, i) => (
                <div key={i} className="mb-1">{info}</div>
              ))}
              <div className="mt-2 pt-2 border-t border-white/20">
                <div>View: {viewState}</div>
                <div>Current Session: {currentSession ? (currentSession as any).id : "none"}</div>
                <div>Workspaces: {workspaces.length}</div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    console.log("✅ Showing chat interface for session:", currentSession.id);

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
          <OpenCodeChatInterface />
        </div>
      </div>
    );
  }

  // Quick Start view
  if (viewState === "quick-start") {
    return (
      <div className="min-h-screen bg-background py-8 pb-16 md:pb-8">
        <DebugOverlay />
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
                    setViewState("quick-start");
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
