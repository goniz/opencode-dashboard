"use client";

import { useEffect } from "react";
import { Button } from "@/components/button";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

export default function MobileModal({
  isOpen,
  onClose,
  title,
  children,
  className,
  showCloseButton = true
}: MobileModalProps) {
  // Prevent body scroll when modal is open
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

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-end md:items-center justify-center",
          "p-4 md:p-8"
        )}
      >
        <div
          className={cn(
            "w-full bg-background border border-border shadow-xl",
            "transform transition-all duration-300 ease-in-out",
            // Mobile: Bottom sheet style
            "md:hidden rounded-t-2xl max-h-[90vh] overflow-hidden",
            // Desktop: Centered modal
            "md:block md:rounded-lg md:max-w-2xl md:max-h-[80vh]",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
            <h2 className="text-lg md:text-xl font-semibold text-foreground">
              {title}
            </h2>
            
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px]"
                aria-label="Close modal"
              >
                <XIcon className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </div>

          {/* Mobile: Drag indicator */}
          <div className="md:hidden absolute top-2 left-1/2 transform -translate-x-1/2">
            <div className="w-8 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
        </div>
      </div>
    </>
  );
}