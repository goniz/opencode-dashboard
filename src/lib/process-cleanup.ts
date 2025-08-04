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
  /** Maximum time to wait for all cleanup handlers in graceful phase (milliseconds) */
  gracefulTimeout: number;
  /** Maximum time to wait for all cleanup handlers in force termination phase (milliseconds) */
  forceTimeout: number;
  /** Number of retry attempts for failed cleanup handlers */
  retryAttempts: number;
  /** Delay between retry attempts (milliseconds) */
  retryDelay: number;
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
      gracefulTimeout: 10000, // 10 seconds for graceful phase
      forceTimeout: 5000, // 5 seconds for force termination phase
      retryAttempts: 3, // 3 retry attempts by default
      retryDelay: 1000, // 1 second delay between retries
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
   * Execute all cleanup handlers with two-phase shutdown: graceful then force termination
   */
  private async executeCleanup(): Promise<void> {
    const startTime = Date.now();
    const results: Array<{ name: string; success: boolean; duration: number; error?: Error; attempts: number }> = [];

    this.log('info', `Starting two-phase cleanup of ${this.handlers.length} handlers...`);

    // Phase 1: Graceful shutdown with retries
    this.log('info', `Phase 1: Graceful shutdown (timeout: ${this.config.gracefulTimeout}ms, retries: ${this.config.retryAttempts})`);
    const gracefulStartTime = Date.now();
    
    try {
      const gracefulPromise = this.runAllHandlersWithRetry(results, false);
      const gracefulTimeoutPromise = this.createTimeoutPromise(this.config.gracefulTimeout, 'graceful');
      
      await Promise.race([gracefulPromise, gracefulTimeoutPromise]);
      
      const gracefulDuration = Date.now() - gracefulStartTime;
      this.log('info', `Phase 1 completed in ${gracefulDuration}ms`);
      
    } catch (error) {
      const gracefulDuration = Date.now() - gracefulStartTime;
      this.log('warn', `Phase 1 failed or timed out after ${gracefulDuration}ms:`, error instanceof Error ? error.message : String(error));
      
      // Phase 2: Force termination for remaining failed handlers
      const failedHandlers = this.handlers.filter(handler => 
        !results.some(result => result.name === handler.name && result.success)
      );
      
      if (failedHandlers.length > 0) {
        this.log('info', `Phase 2: Force termination for ${failedHandlers.length} remaining handlers (timeout: ${this.config.forceTimeout}ms, no retries)`);
        const forceStartTime = Date.now();
        
        try {
          const forcePromise = this.runSpecificHandlers(failedHandlers, results, true);
          const forceTimeoutPromise = this.createTimeoutPromise(this.config.forceTimeout, 'force');
          
          await Promise.race([forcePromise, forceTimeoutPromise]);
          
          const forceDuration = Date.now() - forceStartTime;
          this.log('info', `Phase 2 completed in ${forceDuration}ms`);
          
        } catch (forceError) {
          const forceDuration = Date.now() - forceStartTime;
          this.log('error', `Phase 2 failed or timed out after ${forceDuration}ms:`, forceError instanceof Error ? forceError.message : String(forceError));
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0);

    this.log('info', `Two-phase cleanup completed in ${totalDuration}ms - ${successCount} succeeded, ${failureCount} failed, ${totalAttempts} total attempts`);

    // Log detailed results if verbose logging is enabled
    if (this.config.enableVerboseLogging) {
      results.forEach(result => {
        const status = result.success ? 'SUCCESS' : 'FAILED';
        const attemptsText = result.attempts > 1 ? ` (${result.attempts} attempts)` : '';
        const message = `Handler "${result.name}": ${status} (${result.duration}ms)${attemptsText}`;
        if (result.error) {
          this.log('error', `${message} - ${result.error.message}`);
        } else {
          this.log('info', message);
        }
      });
    }
  }

  /**
   * Run all cleanup handlers with retry logic
   */
  private async runAllHandlersWithRetry(
    results: Array<{ name: string; success: boolean; duration: number; error?: Error; attempts: number }>, 
    isForceMode: boolean
  ): Promise<void> {
    const promises = this.handlers.map(handler => this.executeHandlerWithRetry(handler, results, isForceMode));
    await Promise.allSettled(promises);
  }

  /**
   * Run specific cleanup handlers (used for force termination phase)
   */
  private async runSpecificHandlers(
    handlers: CleanupHandler[],
    results: Array<{ name: string; success: boolean; duration: number; error?: Error; attempts: number }>, 
    isForceMode: boolean
  ): Promise<void> {
    const promises = handlers.map(handler => this.executeHandlerWithRetry(handler, results, isForceMode));
    await Promise.allSettled(promises);
  }

  /**
   * Execute a single cleanup handler with retry logic and timeout
   */
  private async executeHandlerWithRetry(
    handler: CleanupHandler,
    results: Array<{ name: string; success: boolean; duration: number; error?: Error; attempts: number }>,
    isForceMode: boolean
  ): Promise<void> {
    const maxAttempts = isForceMode ? 1 : this.config.retryAttempts;
    const retryDelay = isForceMode ? 0 : this.config.retryDelay;
    const timeout = handler.timeout ?? this.config.defaultTimeout;
    const mode = isForceMode ? 'FORCE' : 'GRACEFUL';
    
    let lastError: Error | undefined;
    let totalDuration = 0;
    const overallStartTime = Date.now();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const attemptStartTime = Date.now();
      
      try {
        this.log('debug', `[${mode}] Starting cleanup handler "${handler.name}" (attempt ${attempt}/${maxAttempts}, timeout: ${timeout}ms)`);

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Cleanup handler "${handler.name}" timed out after ${timeout}ms`));
          }, timeout);
        });

        // Race between handler execution and timeout
        await Promise.race([handler.cleanup(), timeoutPromise]);

        const attemptDuration = Date.now() - attemptStartTime;
        totalDuration = Date.now() - overallStartTime;
        
        results.push({ 
          name: handler.name, 
          success: true, 
          duration: totalDuration, 
          attempts: attempt 
        });
        
        this.log('debug', `[${mode}] Cleanup handler "${handler.name}" completed successfully in ${attemptDuration}ms (attempt ${attempt}/${maxAttempts})`);
        return; // Success, exit retry loop

      } catch (error) {
        const attemptDuration = Date.now() - attemptStartTime;
        lastError = error instanceof Error ? error : new Error(String(error));
        
        this.log('warn', `[${mode}] Cleanup handler "${handler.name}" failed on attempt ${attempt}/${maxAttempts} after ${attemptDuration}ms: ${lastError.message}`);
        
        // If this isn't the last attempt and we're not in force mode, wait before retrying
        if (attempt < maxAttempts && !isForceMode) {
          this.log('debug', `[${mode}] Retrying cleanup handler "${handler.name}" in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // All attempts failed
    totalDuration = Date.now() - overallStartTime;
    results.push({ 
      name: handler.name, 
      success: false, 
      duration: totalDuration, 
      error: lastError, 
      attempts: maxAttempts 
    });
    
    this.log('error', `[${mode}] Cleanup handler "${handler.name}" failed after ${maxAttempts} attempts in ${totalDuration}ms: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Create a promise that rejects after the specified timeout
   */
  private createTimeoutPromise(timeout: number, phase: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${phase} shutdown timeout after ${timeout}ms`));
      }, timeout);
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