"use client";

import { useState } from "react";
import SessionManager from "@/components/session-manager";
import OpenCodeChatInterface from "@/components/opencode-chat-interface";
import { useOpenCodeSession } from "@/hooks/useOpenCodeSession";
import { Button } from "../../button";
import { ArrowLeftIcon } from "lucide-react";

type ViewState = "sessions" | "chat";

export default function Home() {
  const { currentSession } = useOpenCodeSession();
  const [viewState, setViewState] = useState<ViewState>("sessions");

  const handleOpenChat = () => {
    setViewState("chat");
  };

  const handleBackToSessions = () => {
    setViewState("sessions");
  };

  if (viewState === "chat" && currentSession && currentSession.status === "running") {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToSessions}
                  className="flex items-center gap-2"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back to Sessions
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
                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Running
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
            Manage your OpenCode sessions
          </p>
        </div>
        
        <SessionManager onOpenChat={handleOpenChat} />
      </div>
    </div>
  );
}
