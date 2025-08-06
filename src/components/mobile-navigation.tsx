"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/button";
import { MenuIcon, XIcon, HomeIcon, FolderIcon, MessageSquareIcon, SettingsIcon, ArrowLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavigationProps {
  currentView: "workspaces" | "workspace-dashboard" | "chat" | "tools";
  onNavigate: (view: "workspaces" | "workspace-dashboard" | "chat" | "tools") => void;
  onBackToWorkspaces: () => void;
  className?: string;
}

export default function MobileNavigation({
  currentView,
  onNavigate,
  onBackToWorkspaces,
  className
}: MobileNavigationProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [currentView]);

  // Handle scroll for collapsible header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show header when scrolling up or at top
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        setIsHeaderVisible(true);
      } 
      // Hide header when scrolling down (but not if drawer is open)
      else if (currentScrollY > lastScrollY && currentScrollY > 100 && !isDrawerOpen) {
        setIsHeaderVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isDrawerOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isDrawerOpen]);

  const navigationItems = [

    {
      id: "workspaces",
      label: "Workspaces",
      icon: FolderIcon,
      action: () => onNavigate("workspaces"),
    },
    {
      id: "workspace-dashboard",
      label: "Sessions",
      icon: FolderIcon,
      action: () => onNavigate("workspace-dashboard"),
      disabled: currentView === "workspaces",
    },
    {
      id: "chat",
      label: "Chat",
      icon: MessageSquareIcon,
      action: () => onNavigate("chat"),
      disabled: currentView === "workspaces",
    },
  ];

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <div className={cn(
        "md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "transition-transform duration-300 ease-in-out",
        isHeaderVisible ? "translate-y-0" : "-translate-y-full",
        className
      )}>
        {/* Left side - Back button or Menu */}
        {(currentView === "workspace-dashboard" || currentView === "chat" || currentView === "tools") ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToWorkspaces}
            className="flex items-center gap-2 min-h-[44px] min-w-[44px]"
            aria-label="Back to workspaces"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 min-h-[44px] min-w-[44px]"
            aria-label="Open navigation menu"
          >
            <MenuIcon className="w-5 h-5" />
          </Button>
        )}

        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold text-foreground">
            {currentView === "workspaces" && "Workspaces"}
            {currentView === "workspace-dashboard" && "Sessions"}
            {currentView === "chat" && "Chat"}
            {currentView === "tools" && "Tools"}
          </h1>
        </div>

        {/* Right side - Menu button when showing back button, spacer otherwise */}
        {(currentView === "workspace-dashboard" || currentView === "chat" || currentView === "tools") ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 min-h-[44px] min-w-[44px]"
            aria-label="Open navigation menu"
          >
            <MenuIcon className="w-5 h-5" />
          </Button>
        ) : (
          <div className="w-[44px]" /> /* Spacer for centering */
        )}
      </div>

      {/* Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Navigation Drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-background border-r border-border z-50 transform transition-transform duration-300 ease-in-out md:hidden",
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Navigation</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDrawerOpen(false)}
            className="min-h-[44px] min-w-[44px]"
            aria-label="Close navigation menu"
          >
            <XIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 min-h-[44px] text-left",
                  item.disabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={item.disabled ? undefined : item.action}
                disabled={item.disabled}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 min-h-[44px]"
          >
            <SettingsIcon className="w-5 h-5" />
            Settings
          </Button>
        </div>
      </div>

       {/* Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-1">
          {["workspaces","workspace-dashboard","chat","tools"].map((id) => {
            if (id === "tools") {
              return (
                <Button key="tools" variant="ghost" size="sm" className={cn(
                  "flex flex-col items-center gap-0.5 min-h-[48px] min-w-[64px] px-3 py-1 text-white",
                  currentView === "tools" && "text-emerald-400"
                )} onClick={() => onNavigate("tools")}> 
                  <SettingsIcon className="w-5 h-5" />
                  <span className="text-[11px]">Tools</span>
                </Button>
              );
            }
            const item = navigationItems.find(n => n.id === id)!;
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "flex flex-col items-center gap-0.5 min-h-[48px] min-w-[64px] px-3 py-1 text-white",
                  isActive && "text-emerald-400"
                )}
                onClick={item.disabled ? undefined : item.action}
                disabled={item.disabled}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px]">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>    </>
  );
}