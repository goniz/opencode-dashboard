/**
 * Shutdown Manager
 * 
 * Coordinates graceful shutdown between the ProcessCleanupManager and OpenCodeWorkspaceManager.
 * This module serves as the bridge between the global process cleanup system and the 
 * workspace-specific cleanup logic.
 */

import { processCleanupManager, type CleanupHandler } from './process-cleanup';
import { workspaceManager } from './opencode-workspace';

export interface ShutdownConfig {
  /** Enable workspace process monitoring */
  enableProcessMonitoring: boolean;
  /** Timeout for workspace cleanup (milliseconds) */
  workspaceCleanupTimeout: number;
  /** Number of retry attempts for workspace cleanup */
  workspaceRetryAttempts: number;
  /** Enable verbose logging */
  enableVerboseLogging: boolean;
}

export class ShutdownManager {
  private static instance: ShutdownManager;
  private initialized: boolean = false;
  private config: ShutdownConfig;

  private constructor() {
    // Default configuration
    this.config = {
      enableProcessMonitoring: true,
      workspaceCleanupTimeout: 10000, // 10 seconds
      workspaceRetryAttempts: 3,
      enableVerboseLogging: process.env.NODE_ENV === 'development'
    };
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ShutdownManager {
    if (!ShutdownManager.instance) {
      ShutdownManager.instance = new ShutdownManager();
    }
    return ShutdownManager.instance;
  }

  /**
   * Initialize the shutdown manager with optional configuration
   */
  async initialize(config?: Partial<ShutdownConfig>): Promise<void> {
    if (this.initialized) {
      this.log('warn', 'Shutdown manager already initialized');
      return;
    }

    // Merge configuration
    this.config = { ...this.config, ...config };
    
    this.log('info', 'Initializing shutdown manager...');

    // Register workspace cleanup handler with high priority
    await this.registerWorkspaceCleanup();

    // Start process monitoring if enabled
    if (this.config.enableProcessMonitoring) {
      workspaceManager.startProcessMonitoring();
    }

    this.initialized = true;
    this.log('info', 'Shutdown manager initialized successfully');
  }

  /**
   * Register workspace cleanup as a cleanup handler
   */
  async registerWorkspaceCleanup(): Promise<void> {
    const workspaceCleanupHandler: CleanupHandler = {
      name: 'workspace-cleanup',
      priority: 100, // High priority - workspaces should be cleaned up first
      timeout: this.config.workspaceCleanupTimeout,
      cleanup: async () => {
        this.log('info', 'Starting workspace cleanup...');
        const startTime = Date.now();
        
        try {
          await workspaceManager.initiateShutdown();
          const duration = Date.now() - startTime;
          this.log('info', `Workspace cleanup completed in ${duration}ms`);
        } catch (error) {
          const duration = Date.now() - startTime;
          this.log('error', `Workspace cleanup failed after ${duration}ms:`, error);
          throw error;
        }
      }
    };

    processCleanupManager.registerHandler(workspaceCleanupHandler);
    this.log('info', 'Workspace cleanup handler registered');
  }

  /**
   * Manually trigger shutdown (for testing or manual shutdown)
   */
  async shutdown(signal?: string): Promise<void> {
    this.log('info', `Manual shutdown triggered${signal ? ` (signal: ${signal})` : ''}`);
    await processCleanupManager.initiateShutdown(signal);
  }

  /**
   * Check if shutdown manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<ShutdownConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration (only before initialization)
   */
  updateConfig(config: Partial<ShutdownConfig>): void {
    if (this.initialized) {
      this.log('warn', 'Cannot update configuration after initialization');
      return;
    }
    this.config = { ...this.config, ...config };
  }

  /**
   * Get shutdown status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      processCleanupInitialized: processCleanupManager.getHandlers().length > 0,
      workspaceCount: workspaceManager.getAllWorkspaces().length,
      isShuttingDown: processCleanupManager.isShutdownInProgress(),
      config: this.config
    };
  }

  /**
   * Internal logging method
   */
  private log(level: 'info' | 'warn' | 'error', message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [ShutdownManager]`;

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
    }
  }
}

// Export singleton instance for convenience
export const shutdownManager = ShutdownManager.getInstance();