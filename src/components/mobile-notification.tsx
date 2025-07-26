"use client";

import { useState, useEffect } from "react";
import { Button } from "../../button";
import { XIcon, CheckCircleIcon, AlertCircleIcon, InfoIcon, AlertTriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type NotificationType = "success" | "error" | "warning" | "info";

interface NotificationProps {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  onDismiss: (id: string) => void;
}

interface NotificationManagerProps {
  notifications: NotificationProps[];
  position?: "top" | "bottom";
  className?: string;
}

function Notification({
  id,
  type,
  title,
  message,
  action,
  duration = 5000,
  onDismiss
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(id);
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircleIcon className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case "info":
        return <InfoIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800";
      case "error":
        return "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800";
      case "info":
        return "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800";
    }
  };

  return (
    <div
      className={cn(
        "w-full max-w-sm mx-auto mb-4 p-4 rounded-lg border shadow-lg transition-all duration-300 ease-out",
        getBackgroundColor(),
        isVisible && !isExiting ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground">{title}</h4>
          {message && (
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          )}
          
          {action && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-8"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-background/50"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        >
          <XIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function MobileNotificationManager({
  notifications,
  position = "top",
  className
}: NotificationManagerProps) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed left-4 right-4 z-50 pointer-events-none",
        position === "top" ? "top-4" : "bottom-4",
        className
      )}
    >
      <div className="space-y-2 pointer-events-auto">
        {notifications.map((notification) => (
          <Notification key={notification.id} {...notification} />
        ))}
      </div>
    </div>
  );
}

// Hook for managing notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);

  const addNotification = (
    notification: Omit<NotificationProps, "id" | "onDismiss">
  ) => {
    const id = Math.random().toString(36).substring(2, 11);
    setNotifications(prev => [...prev, {
      ...notification,
      id,
      onDismiss: removeNotification
    }]);
    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll
  };
}