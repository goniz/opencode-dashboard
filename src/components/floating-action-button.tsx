"use client";

import { Button } from "../../button";
import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export default function FloatingActionButton({
  onClick,
  disabled = false,
  className,
  label = "Create Workspace"
}: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full shadow-lg",
        "bg-primary hover:bg-primary/90 text-primary-foreground",
        "flex items-center justify-center",
        "transition-all duration-200 ease-in-out",
        "hover:scale-105 active:scale-95",
        "min-h-[56px] min-w-[56px]", // Ensure touch-friendly size
        disabled && "opacity-50 cursor-not-allowed hover:scale-100",
        className
      )}
      size="lg"
      aria-label={label}
    >
      <PlusIcon className="w-6 h-6" />
    </Button>
  );
}