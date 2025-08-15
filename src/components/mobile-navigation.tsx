"use client";

import React from "react";
import { Button } from "@/components/button";
import { ArrowLeftIcon, FolderIcon, MessageSquareIcon, SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavigationProps {
  currentView: "sidebar" | "new-task" | "chat" | "workspace-dashboard" | "tools" | "workspaces";
  onNavigate: (view: "sidebar" | "new-task" | "chat" | "workspace-dashboard" | "tools" | "workspaces") => void;
  onBackToWorkspaces?: () => void;
  className?: string;
}

export default function MobileNavigation({
  currentView,
  onNavigate,
  onBackToWorkspaces,
  className
}: MobileNavigationProps) {
  const navigationItems = [
    {
      id: "sidebar" as const,
      label: "Workspaces",
      icon: FolderIcon,
      action: () => onNavigate("sidebar"),
    },
    {
      id: "new-task" as const,
      label: "New",
      icon: FolderIcon,
      action: () => onNavigate("new-task"),
    },
    {
      id: "chat" as const,
      label: "Chat",
      icon: MessageSquareIcon,
      action: () => onNavigate("chat"),
    },
  ];

  return (
    <>
      {/* Simplified Mobile Header - Google Jules minimal style */}
      {(currentView === "new-task" || currentView === "chat") && (
        <div className={cn(
          "md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900",
          className
        )}>
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToWorkspaces || (() => onNavigate("sidebar"))}
            className="flex items-center gap-2 min-h-[44px] min-w-[44px] text-gray-300 hover:text-white hover:bg-gray-800"
            aria-label="Back to workspaces"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>

          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold text-white">
              {currentView === "new-task" && "New Workspace"}
              {currentView === "chat" && "Chat"}
            </h1>
          </div>

          {/* Spacer for centering */}
          <div className="w-[44px]" />
        </div>
      )}

      {/* Minimal Bottom Navigation Bar - Google Jules style */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "flex flex-col items-center gap-1 min-h-[48px] min-w-[64px] px-3 py-1 text-gray-400 hover:text-white",
                  isActive && "text-purple-500"
                )}
                onClick={item.action}
              >
                <Icon className={cn(
                  "w-5 h-5",
                  isActive && "text-purple-500"
                )} />
                <span className={cn(
                  "text-xs",
                  isActive && "text-purple-500 font-medium"
                )}>
                  {item.label}
                </span>
              </Button>
            );
          })}
          
          {/* Settings button */}
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1 min-h-[48px] min-w-[64px] px-3 py-1 text-gray-400 hover:text-white"
          >
            <SettingsIcon className="w-5 h-5" />
            <span className="text-xs">Settings</span>
          </Button>
        </div>
      </div>
    </>
  );
}