"use client";

import { cn } from "@/lib/utils";
import { AlertTriangleIcon } from "lucide-react";
import { Button } from "../../button";

interface ErrorDisplayProps {
  error: {
    message: string;
    recoverySuggestion?: string;
  } | null;
  onClear?: () => void;
  className?: string;
}

export function ErrorDisplay({ error, onClear, className }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div
      className={cn(
        "p-4 bg-destructive/10 border border-destructive/20 rounded-lg",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangleIcon className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-destructive">Error</p>
          <p className="text-sm text-destructive/80 mt-1">{error.message}</p>
          {error.recoverySuggestion && (
            <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-destructive/20">
              {error.recoverySuggestion}
            </p>
          )}
        </div>
      </div>
      {onClear && (
        <div className="mt-3 text-right">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs hover:bg-destructive/20 text-destructive"
            onClick={onClear}
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
