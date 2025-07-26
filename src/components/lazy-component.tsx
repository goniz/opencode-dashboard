"use client";

import { useState, useRef, useEffect, ReactNode, Suspense } from "react";
import { cn } from "@/lib/utils";

interface LazyComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
  disabled?: boolean;
}

export default function LazyComponent({
  children,
  fallback = <div className="w-full h-32 bg-muted animate-pulse rounded" />,
  className,
  rootMargin = "100px",
  threshold = 0.1,
  triggerOnce = true,
  disabled = false
}: LazyComponentProps) {
  const [isInView, setIsInView] = useState(disabled);
  const [hasTriggered, setHasTriggered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          setHasTriggered(true);
          
          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce && hasTriggered) {
          setIsInView(false);
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [disabled, rootMargin, threshold, triggerOnce, hasTriggered]);

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      {isInView ? (
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
}