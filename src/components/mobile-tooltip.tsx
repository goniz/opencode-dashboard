"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileTooltipProps {
  children: ReactNode;
  content: string | ReactNode;
  className?: string;
  disabled?: boolean;
  showOnTouch?: boolean;
  showOnHover?: boolean;
  delay?: number;
  position?: "top" | "bottom" | "left" | "right" | "auto";
}

export default function MobileTooltip({
  children,
  content,
  className,
  disabled = false,
  showOnTouch = true,
  showOnHover = true,
  delay = 0,
  position = "auto"
}: MobileTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(position);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current || position !== "auto") {
      return position;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Check if tooltip fits above
    if (triggerRect.top - tooltipRect.height - 8 >= 0) {
      return "top";
    }

    // Check if tooltip fits below
    if (triggerRect.bottom + tooltipRect.height + 8 <= viewport.height) {
      return "bottom";
    }

    // Check if tooltip fits to the right
    if (triggerRect.right + tooltipRect.width + 8 <= viewport.width) {
      return "right";
    }

    // Check if tooltip fits to the left
    if (triggerRect.left - tooltipRect.width - 8 >= 0) {
      return "left";
    }

    // Default to bottom if nothing else fits
    return "bottom";
  };

  const showTooltip = () => {
    if (disabled) return;

    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
        setTooltipPosition(calculatePosition());
      }, delay);
    } else {
      setIsVisible(true);
      setTooltipPosition(calculatePosition());
    }
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  const handleTouchStart = () => {
    if (showOnTouch) {
      showTooltip();
    }
  };

  const handleTouchEnd = () => {
    if (showOnTouch) {
      // Hide tooltip after a delay on touch devices
      setTimeout(hideTooltip, 2000);
    }
  };

  const handleMouseEnter = () => {
    if (showOnHover) {
      showTooltip();
    }
  };

  const handleMouseLeave = () => {
    if (showOnHover) {
      hideTooltip();
    }
  };

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    trigger.addEventListener('touchstart', handleTouchStart, { passive: true });
    trigger.addEventListener('touchend', handleTouchEnd, { passive: true });
    trigger.addEventListener('mouseenter', handleMouseEnter);
    trigger.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      trigger.removeEventListener('touchstart', handleTouchStart);
      trigger.removeEventListener('touchend', handleTouchEnd);
      trigger.removeEventListener('mouseenter', handleMouseEnter);
      trigger.removeEventListener('mouseleave', handleMouseLeave);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [showOnTouch, showOnHover, delay, disabled]);

  const getTooltipClasses = () => {
    const baseClasses = "absolute z-50 px-3 py-2 text-sm bg-popover text-popover-foreground border border-border rounded-md shadow-lg max-w-xs";
    
    switch (tooltipPosition) {
      case "top":
        return cn(baseClasses, "bottom-full left-1/2 transform -translate-x-1/2 mb-2");
      case "bottom":
        return cn(baseClasses, "top-full left-1/2 transform -translate-x-1/2 mt-2");
      case "left":
        return cn(baseClasses, "right-full top-1/2 transform -translate-y-1/2 mr-2");
      case "right":
        return cn(baseClasses, "left-full top-1/2 transform -translate-y-1/2 ml-2");
      default:
        return cn(baseClasses, "top-full left-1/2 transform -translate-x-1/2 mt-2");
    }
  };

  const getArrowClasses = () => {
    const baseClasses = "absolute w-2 h-2 bg-popover border-border transform rotate-45";
    
    switch (tooltipPosition) {
      case "top":
        return cn(baseClasses, "top-full left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-r border-b");
      case "bottom":
        return cn(baseClasses, "bottom-full left-1/2 transform -translate-x-1/2 translate-y-1/2 border-l border-t");
      case "left":
        return cn(baseClasses, "left-full top-1/2 transform -translate-x-1/2 -translate-y-1/2 border-r border-t");
      case "right":
        return cn(baseClasses, "right-full top-1/2 transform translate-x-1/2 -translate-y-1/2 border-l border-b");
      default:
        return cn(baseClasses, "bottom-full left-1/2 transform -translate-x-1/2 translate-y-1/2 border-l border-t");
    }
  };

  return (
    <div ref={triggerRef} className={cn("relative inline-block", className)}>
      {children}
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={getTooltipClasses()}
          role="tooltip"
          aria-hidden={!isVisible}
        >
          <div className={getArrowClasses()} />
          {content}
        </div>
      )}
    </div>
  );
}