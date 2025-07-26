"use client";

import { useEffect, useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FocusManagerProps {
  children: ReactNode;
  className?: string;
  autoFocus?: boolean;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  disabled?: boolean;
}

export default function FocusManager({
  children,
  className,
  autoFocus = false,
  trapFocus = false,
  restoreFocus = false,
  disabled = false
}: FocusManagerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (disabled || !trapFocus) return;

    const container = containerRef.current;
    if (!container) return;

    if (event.key === 'Tab') {
      const focusableElements = getFocusableElements(container);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (event.shiftKey) {
        // Shift + Tab (backward)
        if (activeElement === firstElement || !container.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab (forward)
        if (activeElement === lastElement || !container.contains(activeElement)) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    // Escape key to break focus trap
    if (event.key === 'Escape' && trapFocus) {
      const container = containerRef.current;
      if (container && previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    // Store the previously focused element
    if (restoreFocus || trapFocus) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
    }

    // Auto focus the first focusable element
    if (autoFocus) {
      const focusableElements = getFocusableElements(container);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }

    // Add keyboard event listener for focus trapping
    if (trapFocus) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (trapFocus) {
        document.removeEventListener('keydown', handleKeyDown);
      }

      // Restore focus to the previously focused element
      if (restoreFocus && previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [autoFocus, trapFocus, restoreFocus, disabled, handleKeyDown]);

  // Enhanced focus styles for better accessibility
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const style = document.createElement('style');
    style.textContent = `
      .focus-manager *:focus {
        outline: 2px solid hsl(var(--primary));
        outline-offset: 2px;
        border-radius: 4px;
      }
      
      .focus-manager *:focus:not(:focus-visible) {
        outline: none;
      }
      
      .focus-manager *:focus-visible {
        outline: 2px solid hsl(var(--primary));
        outline-offset: 2px;
        border-radius: 4px;
      }
      
      /* Enhanced touch targets */
      .focus-manager button,
      .focus-manager input,
      .focus-manager select,
      .focus-manager textarea,
      .focus-manager a {
        min-height: 44px;
        min-width: 44px;
        touch-action: manipulation;
      }
      
      /* Ensure adequate spacing between interactive elements */
      .focus-manager button + button,
      .focus-manager input + input,
      .focus-manager a + a {
        margin-left: 8px;
      }
    `;

    document.head.appendChild(style);
    container.classList.add('focus-manager');

    return () => {
      document.head.removeChild(style);
      container.classList.remove('focus-manager');
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("focus-manager", className)}
      role={trapFocus ? "dialog" : undefined}
      aria-modal={trapFocus}
    >
      {children}
    </div>
  );
}