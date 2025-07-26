"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { RefreshCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  threshold?: number;
  className?: string;
  disabled?: boolean;
}

export default function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  className,
  disabled = false
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const currentYRef = useRef<number | null>(null);

  const handleTouchStart = (event: TouchEvent) => {
    if (disabled || window.scrollY > 0) return;
    
    startYRef.current = event.touches[0].clientY;
    currentYRef.current = startYRef.current;
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (disabled || !startYRef.current || window.scrollY > 0) return;

    currentYRef.current = event.touches[0].clientY;
    const distance = currentYRef.current - startYRef.current;

    if (distance > 0) {
      event.preventDefault();
      setIsPulling(true);
      setPullDistance(Math.min(distance * 0.5, threshold * 1.5)); // Damping effect
    }
  };

  const handleTouchEnd = async () => {
    if (disabled || !isPulling) return;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
      } finally {
        setIsRefreshing(false);
      }
    }

    setIsPulling(false);
    setPullDistance(0);
    startYRef.current = null;
    currentYRef.current = null;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, isPulling, pullDistance, threshold, isRefreshing]);

  const refreshProgress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Pull to refresh indicator */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 ease-out z-10",
          "bg-background/90 backdrop-blur-sm border-b border-border",
          isPulling || isRefreshing ? "opacity-100" : "opacity-0"
        )}
        style={{
          height: isPulling || isRefreshing ? `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px` : "0px",
          transform: `translateY(${isPulling ? 0 : isRefreshing ? 0 : -60}px)`
        }}
      >
        <div className="flex flex-col items-center gap-2 py-4">
          <RefreshCwIcon
            className={cn(
              "w-6 h-6 text-muted-foreground transition-all duration-200",
              isRefreshing && "animate-spin",
              shouldTrigger && !isRefreshing && "text-primary scale-110"
            )}
            style={{
              transform: `rotate(${refreshProgress * 180}deg)`
            }}
          />
          <span className="text-sm text-muted-foreground">
            {isRefreshing
              ? "Refreshing..."
              : shouldTrigger
              ? "Release to refresh"
              : "Pull to refresh"
            }
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${isPulling ? pullDistance : isRefreshing ? 60 : 0}px)`
        }}
      >
        {children}
      </div>
    </div>
  );
}