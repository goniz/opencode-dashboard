"use client";

import { useState, useEffect } from "react";
import { WifiOffIcon, WifiIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineIndicatorProps {
  className?: string;
  showWhenOnline?: boolean;
}

export default function OfflineIndicator({
  className,
  showWhenOnline = false
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      
      // Hide the "back online" indicator after 3 seconds
      setTimeout(() => {
        if (!showWhenOnline) {
          setShowIndicator(false);
        }
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showWhenOnline]);

  // Don't show indicator if online and showWhenOnline is false
  if (isOnline && !showWhenOnline && !showIndicator) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg transition-all duration-300",
        isOnline
          ? "bg-green-500 text-white"
          : "bg-red-500 text-white",
        showIndicator ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {isOnline ? (
          <>
            <WifiIcon className="w-4 h-4" />
            <span>Back online</span>
          </>
        ) : (
          <>
            <WifiOffIcon className="w-4 h-4" />
            <span>No internet connection</span>
          </>
        )}
      </div>
    </div>
  );
}