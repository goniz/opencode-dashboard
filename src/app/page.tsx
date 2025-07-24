"use client";

import SessionManager from "@/components/session-manager";
import OpenCodeChatInterface from "@/components/opencode-chat-interface";
import { useOpenCodeSession } from "@/hooks/useOpenCodeSession";

export default function Home() {
  const { currentSession } = useOpenCodeSession();

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        {currentSession && currentSession.status === "running" ? (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                OpenCode Dashboard
              </h1>
              <p className="text-muted-foreground">
                Active session: {currentSession.folder.split("/").pop()} ({currentSession.model})
              </p>
            </div>
            <OpenCodeChatInterface />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                <a 
                  href="#sessions" 
                  className="text-primary hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                  }}
                >
                  Manage Sessions
                </a>
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              OpenCode Dashboard
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage your OpenCode sessions
            </p>
          </div>
        )}
        
        <div id="sessions" className="mt-12">
          <SessionManager />
        </div>
      </div>
    </div>
  );
}
