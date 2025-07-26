"use client";

import { useEffect, useRef, useCallback } from "react";

interface GestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: (event: TouchEvent | MouseEvent) => void;
  onPinch?: (scale: number) => void;
  onPullToRefresh?: () => void;
}

interface UseGesturesOptions {
  swipeThreshold?: number;
  longPressDelay?: number;
  pinchThreshold?: number;
  pullThreshold?: number;
  disabled?: boolean;
}

export function useGestures(
  handlers: GestureHandlers,
  options: UseGesturesOptions = {}
) {
  const {
    swipeThreshold = 50,
    longPressDelay = 500,
    pinchThreshold = 0.1,
    pullThreshold = 100,
    disabled = false
  } = options;

  const elementRef = useRef<HTMLElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialPinchDistanceRef = useRef<number | null>(null);
  const isPinchingRef = useRef(false);
  const pullStartYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const getDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (disabled) return;

    const touch = event.touches[0];
    const now = Date.now();

    if (event.touches.length === 1) {
      // Single touch - potential swipe or long press
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: now
      };

      // Start long press timer
      if (handlers.onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          if (touchStartRef.current) {
            handlers.onLongPress?.(event);
          }
        }, longPressDelay);
      }

      // Check for pull to refresh (only at top of page)
      if (handlers.onPullToRefresh && window.scrollY === 0) {
        pullStartYRef.current = touch.clientY;
        isPullingRef.current = true;
      }
    } else if (event.touches.length === 2) {
      // Two touches - potential pinch
      clearLongPressTimer();
      touchStartRef.current = null;
      
      if (handlers.onPinch) {
        initialPinchDistanceRef.current = getDistance(event.touches[0], event.touches[1]);
        isPinchingRef.current = true;
      }
    }
  }, [disabled, handlers, longPressDelay, getDistance, clearLongPressTimer]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (disabled) return;

    if (event.touches.length === 1 && touchStartRef.current) {
      const touch = event.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Cancel long press if moved too much
      if (distance > 10) {
        clearLongPressTimer();
      }

      // Handle pull to refresh
      if (isPullingRef.current && pullStartYRef.current && handlers.onPullToRefresh) {
        const pullDistance = touch.clientY - pullStartYRef.current;
        if (pullDistance > pullThreshold && window.scrollY === 0) {
          event.preventDefault();
          // Add visual feedback here if needed
        }
      }
    } else if (event.touches.length === 2 && isPinchingRef.current && handlers.onPinch) {
      // Handle pinch gesture
      const currentDistance = getDistance(event.touches[0], event.touches[1]);
      if (initialPinchDistanceRef.current) {
        const scale = currentDistance / initialPinchDistanceRef.current;
        if (Math.abs(scale - 1) > pinchThreshold) {
          handlers.onPinch(scale);
        }
      }
    }
  }, [disabled, handlers, pullThreshold, pinchThreshold, getDistance, clearLongPressTimer]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (disabled) return;

    clearLongPressTimer();

    if (touchStartRef.current && event.changedTouches.length === 1) {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      // Only process swipes if they're fast enough and far enough
      if (deltaTime < 300) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX > swipeThreshold && absX > absY) {
          // Horizontal swipe
          if (deltaX > 0) {
            handlers.onSwipeRight?.();
          } else {
            handlers.onSwipeLeft?.();
          }
        } else if (absY > swipeThreshold && absY > absX) {
          // Vertical swipe
          if (deltaY > 0) {
            handlers.onSwipeDown?.();
          } else {
            handlers.onSwipeUp?.();
          }
        }
      }

      // Handle pull to refresh completion
      if (isPullingRef.current && pullStartYRef.current && handlers.onPullToRefresh) {
        const pullDistance = touch.clientY - pullStartYRef.current;
        if (pullDistance > pullThreshold && window.scrollY === 0) {
          handlers.onPullToRefresh();
        }
      }
    }

    // Reset state
    touchStartRef.current = null;
    isPinchingRef.current = false;
    initialPinchDistanceRef.current = null;
    isPullingRef.current = false;
    pullStartYRef.current = null;
  }, [disabled, handlers, swipeThreshold, pullThreshold, clearLongPressTimer]);

  // Mouse events for desktop testing
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (disabled) return;

    touchStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now()
    };

    if (handlers.onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        if (touchStartRef.current) {
          handlers.onLongPress?.(event);
        }
      }, longPressDelay);
    }
  }, [disabled, handlers, longPressDelay]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (disabled) return;

    clearLongPressTimer();

    if (touchStartRef.current) {
      const deltaX = event.clientX - touchStartRef.current.x;
      const deltaY = event.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      if (deltaTime < 300) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX > swipeThreshold && absX > absY) {
          if (deltaX > 0) {
            handlers.onSwipeRight?.();
          } else {
            handlers.onSwipeLeft?.();
          }
        } else if (absY > swipeThreshold && absY > absX) {
          if (deltaY > 0) {
            handlers.onSwipeDown?.();
          } else {
            handlers.onSwipeUp?.();
          }
        }
      }
    }

    touchStartRef.current = null;
  }, [disabled, handlers, swipeThreshold, clearLongPressTimer]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled) return;

    // Touch events
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Mouse events for desktop testing
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mouseup', handleMouseUp);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mouseup', handleMouseUp);
      clearLongPressTimer();
    };
  }, [
    disabled,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseUp,
    clearLongPressTimer
  ]);

  return elementRef;
}