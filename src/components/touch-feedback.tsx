"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TouchFeedbackProps {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  rippleColor?: string;
  scaleOnPress?: boolean;
  hapticFeedback?: boolean;
}

export default function TouchFeedback({
  children,
  className,
  disabled = false,
  rippleColor = "rgba(255, 255, 255, 0.3)",
  scaleOnPress = true,
  hapticFeedback = true
}: TouchFeedbackProps) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [isPressed, setIsPressed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rippleIdRef = useRef(0);

  const createRipple = (clientX: number, clientY: number) => {
    if (disabled) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const rippleId = rippleIdRef.current++;
    setRipples(prev => [...prev, { id: rippleId, x, y }]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== rippleId));
    }, 600);

    // Haptic feedback
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleTouchStart = (event: TouchEvent) => {
    if (disabled) return;
    
    setIsPressed(true);
    const touch = event.touches[0];
    createRipple(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  const handleMouseDown = (event: MouseEvent) => {
    if (disabled) return;
    
    setIsPressed(true);
    createRipple(event.clientX, event.clientY);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleMouseLeave = () => {
    setIsPressed(false);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [disabled]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden transition-transform duration-150 ease-out",
        scaleOnPress && isPressed && "scale-95",
        className
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
      
      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute pointer-events-none rounded-full animate-ping"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
            backgroundColor: rippleColor,
            animationDuration: '600ms',
            animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      ))}
    </div>
  );
}