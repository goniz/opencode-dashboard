"use client";

import { useState, useEffect } from "react";
import WorkspaceManager from "@/components/workspace-manager";
import OpenCodeChatInterface from "@/components/opencode-chat-interface";
import { useOpenCodeSession } from "@/hooks/useOpenCodeWorkspace";
import { Button } from "../../button";
import { ArrowLeftIcon } from "lucide-react";

type ViewState = "workspaces" | "chat";

export default function Home() {
  const { currentSession } = useOpenCodeSession();
  const [viewState, setViewState] = useState<ViewState>("workspaces");

  const handleOpenChat = () => {
    console.log("🎯 handleOpenChat called, switching to chat view");
    console.log("Current session:", currentSession);
    // Always switch to chat view - the useEffect will handle fallback if needed
    setViewState("chat");
  };

  const handleBackToWorkspaces = () => {
    setViewState("workspaces");
  };

  // Handle case where chat view is requested but no session is available
  useEffect(() => {
    if (viewState === "chat" && !currentSession) {
      console.log("❌ No current session available, returning to workspaces view");
      setViewState("workspaces");
    }
  }, [viewState, currentSession]);

  console.log("🔍 Render - viewState:", viewState, "currentSession:", currentSession?.id);

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
        
        <WorkspaceManager onOpenChat={handleOpenChat} />
      </div>
    </div>
  );
}
