"use client";

import { Component, ReactNode, ErrorInfo } from "react";
import { Button } from "../../button";
import { AlertTriangleIcon, RefreshCwIcon, HomeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  className?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export default class MobileErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
    
    // Log error for debugging
    console.error('Mobile Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={cn(
          "min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground",
          this.props.className
        )}>
          <div className="max-w-md w-full text-center space-y-6">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangleIcon className="w-8 h-8 text-destructive" />
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Something went wrong
              </h1>
              <p className="text-muted-foreground">
                We&apos;re sorry, but something unexpected happened. Please try again.
              </p>
            </div>

            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-muted p-4 rounded-lg text-sm">
                <summary className="cursor-pointer font-medium mb-2">
                  Error Details
                </summary>
                <pre className="whitespace-pre-wrap text-xs overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={this.handleRetry}
                className="w-full min-h-[44px] gap-2"
                size="lg"
              >
                <RefreshCwIcon className="w-4 h-4" />
                Try Again
              </Button>

              <div className="flex gap-3">
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1 min-h-[44px] gap-2"
                  size="lg"
                >
                  <HomeIcon className="w-4 h-4" />
                  Go Home
                </Button>

                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="flex-1 min-h-[44px] gap-2"
                  size="lg"
                >
                  <RefreshCwIcon className="w-4 h-4" />
                  Reload Page
                </Button>
              </div>
            </div>

            {/* Help Text */}
            <p className="text-xs text-muted-foreground">
              If this problem persists, please contact support or try refreshing the page.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}