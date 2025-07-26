"use client";

import { useState, useEffect } from "react";
import { Button } from "../../button";
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResponsiveSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function ResponsiveSidebar({
  isOpen,
  onClose,
  title,
  children,
  className
}: ResponsiveSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className="md:hidden fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Desktop Overlay (when expanded) */}
      <div
        className={cn(
          "hidden md:block fixed inset-0 bg-black/20 z-40 transition-opacity duration-300",
          isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full bg-background border-l border-border z-50",
          "transform transition-all duration-300 ease-in-out",
          // Mobile: Full screen overlay
          "md:hidden w-full max-w-md",
          isOpen ? "translate-x-0" : "translate-x-full",
          // Desktop: Collapsible sidebar
          "md:block md:w-96",
          isCollapsed && "md:w-16",
          className
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className={cn(
            "text-lg font-semibold text-foreground transition-opacity duration-200",
            isCollapsed && "md:opacity-0"
          )}>
            {title}
          </h2>
          
          <div className="flex items-center gap-2">
            {/* Desktop Collapse Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex min-h-[44px] min-w-[44px]"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronLeftIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </Button>
            
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px]"
              aria-label="Close sidebar"
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className={cn(
          "flex-1 overflow-y-auto transition-opacity duration-200",
          isCollapsed && "md:opacity-0 md:pointer-events-none"
        )}>
          {children}
        </div>

        {/* Mini Sidebar for Desktop (when collapsed) */}
        {isCollapsed && (
          <div className="hidden md:block absolute inset-0 bg-background border-l border-border">
            <div className="p-4 border-b border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(false)}
                className="w-full min-h-[44px]"
                aria-label="Expand sidebar"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}