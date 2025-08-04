/**
 * Process Cleanup Manager
 * 
 * Provides comprehensive process cleanup handling for graceful shutdown scenarios.
 * Manages cleanup handlers with priority-based execution and timeout handling.
 */

export interface CleanupHandler {
  /** Unique name for the cleanup handler */
  name: string;
  /** Priority level - higher numbers execute first */
  priority: number;
  /** Cleanup function to execute */
  cleanup: () => Promise<void>;
  /** Maximum time allowed for cleanup (milliseconds) */
  timeout?: number;
}

export interface ShutdownConfig {
  /** Default timeout for cleanup handlers (milliseconds) */
  defaultTimeout: number;
  /** Maximum time to wait for all cleanup handlers (milliseconds) */
  gracefulTimeout: number;
  /** Enable verbose logging for debugging */
  enableVerboseLogging: boolean;
}

export class ProcessCleanupManager {
  private handlers: CleanupHandler[] = [];
  private isShuttingDown: boolean = false;
  private shutdownPromise?: Promise<void>;
  private config: ShutdownConfig;

  constructor(config: Partial<ShutdownConfig> = {}) {
    this.config = {
      defaultTimeout: 5000, // 5 seconds default
      gracefulTimeout: 10000, // 10 seconds total
      enableVerboseLogging: process.env.NODE_ENV === 'development',
      ...config,
    };
  }

  /**
   * Register a cleanup handler
   */
  registerHandler(handler: CleanupHandler): void {
    if (this.isShuttingDown) {
      this.log('warn', `Cannot register handler "${handler.name}" during shutdown`);
      return;
    }

    // Check for duplicate names
    const existingIndex = this.handlers.findIndex(h => h.name === handler.name);
    if (existingIndex !== -1) {
      this.log('warn', `Replacing existing handler "${handler.name}"`);
      this.handlers.splice(existingIndex, 1);
    }

    // Insert handler in priority order (higher priority first)
    const insertIndex = this.handlers.findIndex(h => h.priority < handler.priority);
    if (insertIndex === -1) {
      this.handlers.push(handler);
    } else {
      this.handlers.splice(insertIndex, 0, handler);
    }

    this.log('info', `Registered cleanup handler "${handler.name}" with priority ${handler.priority}`);
  }

  /**
   * Unregister a cleanup handler by name
   */
  unregisterHandler(name: string): boolean {
    if (this.isShuttingDown) {
      this.log('warn', `Cannot unregister handler "${name}" during shutdown`);
      return false;
    }

    const index = this.handlers.findIndex(h => h.name === name);
    if (index !== -1) {
      this.handlers.splice(index, 1);
      this.log('info', `Unregistered cleanup handler "${name}"`);
      return true;
    }

    this.log('warn', `Handler "${name}" not found for unregistration`);
    return false;
  }

  /**
   * Get all registered handlers (for debugging)
   */
  getHandlers(): ReadonlyArray<CleanupHandler> {
    return [...this.handlers];
  }

  /**
   * Check if shutdown is in progress
   */
  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Initiate graceful shutdown process
   */
  async initiateShutdown(signal?: string): Promise<void> {
    if (this.isShuttingDown) {
      this.log('info', 'Shutdown already in progress, waiting for completion...');
      return this.shutdownPromise;
    }

    this.isShuttingDown = true;
    this.log('info', `Initiating graceful shutdown${signal ? ` (signal: ${signal})` : ''}...`);

    this.shutdownPromise = this.executeCleanup();
    return this.shutdownPromise;
  }

  /**
   * Execute all cleanup handlers with timeout and error handling
   */
  private async executeCleanup(): Promise<void> {
    const startTime = Date.now();
    const results: Array<{ name: string; success: boolean; duration: number; error?: Error }> = [];

    this.log('info', `Starting cleanup of ${this.handlers.length} handlers...`);

    // Create a promise that resolves when all handlers complete or timeout occurs
    const cleanupPromise = this.runAllHandlers(results);
    const timeoutPromise = this.createTimeoutPromise();

    try {
      await Promise.race([cleanupPromise, timeoutPromise]);
    } catch (error) {
      this.log('error', 'Cleanup process failed:', error);
    }

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    this.log('info', `Cleanup completed in ${totalDuration}ms - ${successCount} succeeded, ${failureCount} failed`);

    // Log detailed results if verbose logging is enabled
    if (this.config.enableVerboseLogging) {
      results.forEach(result => {
        const status = result.success ? 'SUCCESS' : 'FAILED';
        const message = `Handler "${result.name}": ${status} (${result.duration}ms)`;
        if (result.error) {
          this.log('error', `${message} - ${result.error.message}`);
        } else {
          this.log('info', message);
        }
      });
    }
  }

  /**
   * Run all cleanup handlers with individual timeouts
   */
  private async runAllHandlers(results: Array<{ name: string; success: boolean; duration: number; error?: Error }>): Promise<void> {
    const promises = this.handlers.map(handler => this.executeHandler(handler, results));
    await Promise.allSettled(promises);
  }

  /**
   * Execute a single cleanup handler with timeout
   */
  private async executeHandler(
    handler: CleanupHandler,
    results: Array<{ name: string; success: boolean; duration: number; error?: Error }>
  ): Promise<void> {
    const startTime = Date.now();
    const timeout = handler.timeout ?? this.config.defaultTimeout;

    try {
      this.log('debug', `Starting cleanup handler "${handler.name}" (timeout: ${timeout}ms)`);

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Cleanup handler "${handler.name}" timed out after ${timeout}ms`));
        }, timeout);
      });

      // Race between handler execution and timeout
      await Promise.race([handler.cleanup(), timeoutPromise]);

      const duration = Date.now() - startTime;
      results.push({ name: handler.name, success: true, duration });
      this.log('debug', `Cleanup handler "${handler.name}" completed successfully in ${duration}ms`);

    } catch (error) {
      const duration = Date.now() - startTime;
      const cleanupError = error instanceof Error ? error : new Error(String(error));
      results.push({ name: handler.name, success: false, duration, error: cleanupError });
      this.log('error', `Cleanup handler "${handler.name}" failed after ${duration}ms:`, cleanupError.message);
    }
  }

  /**
   * Create a promise that rejects after the graceful timeout
   */
  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Graceful shutdown timeout after ${this.config.gracefulTimeout}ms`));
      }, this.config.gracefulTimeout);
    });
  }

  /**
   * Internal logging method
   */
  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [ProcessCleanup]`;

    switch (level) {
      case 'info':
        console.log(`${prefix} ${message}`, ...args);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, ...args);
        break;
      case 'error':
        console.error(`${prefix} ${message}`, ...args);
        break;
      case 'debug':
        if (this.config.enableVerboseLogging) {
          console.log(`${prefix} [DEBUG] ${message}`, ...args);
        }
        break;
    }
  }
}

// Export a singleton instance for global use
export const processCleanupManager = new ProcessCleanupManager();

// Signal handling
const SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT', 'SIGQUIT', 'SIGHUP'] as const;
let signalHandlersInitialized = false;

/**
 * Initialize signal handlers for graceful shutdown
 * 
 * Sets up listeners for SIGTERM, SIGINT, SIGQUIT, and SIGHUP that will
 * trigger the ProcessCleanupManager to coordinate graceful shutdown.
 */
export function initializeSignalHandlers(): void {
  if (signalHandlersInitialized) {
    console.warn('[ProcessCleanup] Signal handlers already initialized');
    return;
  }

  SHUTDOWN_SIGNALS.forEach(signal => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, initiating graceful shutdown...`);
      await processCleanupManager.initiateShutdown(signal);
      process.exit(0);
    });
  });

  signalHandlersInitialized = true;
  console.log('[ProcessCleanup] Signal handlers initialized for:', SHUTDOWN_SIGNALS.join(', '));
}

/**
 * Check if signal handlers have been initialized
 */
export function areSignalHandlersInitialized(): boolean {
  return signalHandlersInitialized;
}

// Exception handling
let exceptionHandlersInitialized = false;

/**
 * Initialize exception handlers for graceful shutdown during crashes
 * 
 * Sets up listeners for uncaughtException and unhandledRejection that will
 * trigger the ProcessCleanupManager to coordinate graceful shutdown even
 * during unexpected errors.
 */
export function initializeExceptionHandlers(): void {
  if (exceptionHandlersInitialized) {
    console.warn('[ProcessCleanup] Exception handlers already initialized');
    return;
  }

  // Handle unhandled exceptions
  process.on('uncaughtException', async (error) => {
    console.error('[ProcessCleanup] Uncaught Exception:', error);
    try {
      await processCleanupManager.initiateShutdown('uncaughtException');
    } catch (cleanupError) {
      console.error('[ProcessCleanup] Error during cleanup after uncaught exception:', cleanupError);
    }
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('[ProcessCleanup] Unhandled Rejection at:', promise, 'reason:', reason);
    try {
      await processCleanupManager.initiateShutdown('unhandledRejection');
    } catch (cleanupError) {
      console.error('[ProcessCleanup] Error during cleanup after unhandled rejection:', cleanupError);
    }
    process.exit(1);
  });

  exceptionHandlersInitialized = true;
  console.log('[ProcessCleanup] Exception handlers initialized for: uncaughtException, unhandledRejection');
}

/**
 * Check if exception handlers have been initialized
 */
export function areExceptionHandlersInitialized(): boolean {
  return exceptionHandlersInitialized;
}

/**
 * Initialize all process handlers (signals and exceptions) for comprehensive shutdown handling
 * 
 * This is a convenience function that initializes both signal handlers and exception handlers.
 * Use this for the most common case where you want complete process cleanup coverage.
 */
export function initializeAllHandlers(): void {
  initializeSignalHandlers();
  initializeExceptionHandlers();
}