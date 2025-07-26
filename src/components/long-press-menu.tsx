"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { Button } from "../../button";
import { cn } from "@/lib/utils";

interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  action: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface LongPressMenuProps {
  children: ReactNode;
  items: MenuItem[];
  className?: string;
  disabled?: boolean;
  longPressDelay?: number;
}

export default function LongPressMenu({
  children,
  items,
  className,
  disabled = false,
  longPressDelay = 500
}: LongPressMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isLongPressing, setIsLongPressing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleLongPress = (clientX: number, clientY: number) => {
    if (disabled || items.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setMenuPosition({ x, y });
    setIsMenuOpen(true);
    setIsLongPressing(false);

    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleTouchStart = (event: TouchEvent) => {
    if (disabled) return;

    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsLongPressing(true);

    longPressTimerRef.current = setTimeout(() => {
      handleLongPress(touch.clientX, touch.clientY);
    }, longPressDelay);
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // Cancel long press if moved too much
    if (deltaX > 10 || deltaY > 10) {
      clearLongPressTimer();
      setIsLongPressing(false);
    }
  };

  const handleTouchEnd = () => {
    clearLongPressTimer();
    setIsLongPressing(false);
    touchStartRef.current = null;
  };

  const handleMouseDown = (event: MouseEvent) => {
    if (disabled) return;

    setIsLongPressing(true);
    longPressTimerRef.current = setTimeout(() => {
      handleLongPress(event.clientX, event.clientY);
    }, longPressDelay);
  };

  const handleMouseUp = () => {
    clearLongPressTimer();
    setIsLongPressing(false);
  };

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.disabled) return;
    
    item.action();
    setIsMenuOpen(false);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setIsMenuOpen(false);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseup', handleMouseUp);
      clearLongPressTimer();
    };
  }, [disabled, longPressDelay]);

  useEffect(() => {
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          "relative select-none",
          isLongPressing && "scale-95 transition-transform duration-150",
          className
        )}
      >
        {children}
      </div>

      {/* Context Menu */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/20"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu */}
          <div
            ref={menuRef}
            className="fixed z-50 min-w-[200px] bg-background border border-border rounded-lg shadow-lg py-2"
            style={{
              left: `${menuPosition.x}px`,
              top: `${menuPosition.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {items.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 px-4 py-3 h-auto text-left rounded-none",
                  item.destructive && "text-destructive hover:text-destructive",
                  item.disabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleMenuItemClick(item)}
                disabled={item.disabled}
              >
                {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                {item.label}
              </Button>
            ))}
          </div>
        </>
      )}
    </>
  );
}