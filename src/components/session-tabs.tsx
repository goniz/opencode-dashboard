"use client";

import { useState } from "react";
import { Button } from "../../button";
import { cn } from "@/lib/utils";
import { PlusIcon, XIcon, MessageSquareIcon } from "lucide-react";

interface ChatSession {
  id: string;
  model: string;
  status: "active" | "inactive";
  createdAt: Date;
  lastActivity: Date;
}

interface SessionTabsProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onSessionClose: (sessionId: string) => void;
  onNewSession: () => void;
  className?: string;
}

export default function SessionTabs({
  sessions,
  activeSessionId,
  onSessionSelect,
  onSessionClose,
  onNewSession,
  className,
}: SessionTabsProps) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const formatSessionName = (session: ChatSession) => {
    return `${session.model}`;
  };

  return (
    <div className={cn("flex items-center gap-1 border-b border-border/50 bg-muted/30", className)}>
      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              "relative flex items-center gap-2 px-3 py-2 text-sm border-b-2 transition-colors cursor-pointer group",
              activeSessionId === session.id
                ? "border-primary bg-background text-foreground"
                : "border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            )}
            onMouseEnter={() => setHoveredTab(session.id)}
            onMouseLeave={() => setHoveredTab(null)}
            onClick={() => onSessionSelect(session.id)}
          >
            <MessageSquareIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{formatSessionName(session)}</span>
            
            {sessions.length > 1 && (hoveredTab === session.id || activeSessionId === session.id) && (
              <Button
                variant="ghost"
                size="sm"
                className="w-4 h-4 p-0 hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onSessionClose(session.id);
                }}
              >
                <XIcon className="w-3 h-3" />
              </Button>
            )}
            
            {session.status === "active" && (
              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onNewSession}
        className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border-l border-border/50"
      >
        <PlusIcon className="w-4 h-4" />
        <span className="hidden sm:inline">New</span>
      </Button>
    </div>
  );
}