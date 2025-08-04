/**
 * Application Initialization
 * 
 * Handles initialization of cleanup handlers and shutdown management for the Next.js application.
 * This module should be called once during application startup to ensure proper process cleanup
 * during shutdown scenarios.
 */

import { initializeAllHandlers, areSignalHandlersInitialized, areExceptionHandlersInitialized } from './process-cleanup';
import { shutdownManager, type ShutdownConfig } from './shutdown-manager';

export interface AppInitializationConfig {
  /** Environment-specific shutdown configuration */
  shutdown?: Partial<ShutdownConfig>;
  /** Whether to enable signal handlers (SIGTERM, SIGINT, etc.) */
  enableSignalHandlers?: boolean;
  /** Whether to enable exception handlers (uncaughtException, unhandledRejection) */
  enableExceptionHandlers?: boolean;
  /** Whether to enable process monitoring */
  enableProcessMonitoring?: boolean;
}

/**
 * Get environment-specific configuration
 */
function getEnvironmentConfig(): AppInitializationConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  if (isDevelopment) {
    return {
      shutdown: {
        enableProcessMonitoring: true,
        workspaceCleanupTimeout: 5000, // Shorter timeout for dev
        workspaceRetryAttempts: 2,
        enableVerboseLogging: true
      },
      enableSignalHandlers: true,
      enableExceptionHandlers: true,
      enableProcessMonitoring: true
    };
  }

  if (isProduction) {
    return {
      shutdown: {
        enableProcessMonitoring: true,
        workspaceCleanupTimeout: 15000, // Longer timeout for prod
        workspaceRetryAttempts: 3,
        enableVerboseLogging: false
      },
      enableSignalHandlers: true,
      enableExceptionHandlers: true,
      enableProcessMonitoring: true
    };
  }

  // Default configuration for other environments
  return {
    shutdown: {
      enableProcessMonitoring: true,
      workspaceCleanupTimeout: 10000,
      workspaceRetryAttempts: 3,
      enableVerboseLogging: false
    },
    enableSignalHandlers: true,
    enableExceptionHandlers: true,
    enableProcessMonitoring: true
  };
}

/**
 * Initialize all cleanup handlers and shutdown management
 */
export async function initializeCleanupHandlers(config?: AppInitializationConfig): Promise<void> {
  // Only run on server-side
  if (typeof window !== 'undefined') {
    return;
  }

  const envConfig = getEnvironmentConfig();
  const finalConfig = { ...envConfig, ...config };

  console.log('[AppInit] Initializing cleanup handlers...');
  console.log('[AppInit] Environment:', process.env.NODE_ENV);
  console.log('[AppInit] Configuration:', JSON.stringify(finalConfig, null, 2));

  try {
    // Initialize shutdown manager first
    if (!shutdownManager.isInitialized()) {
      await shutdownManager.initialize(finalConfig.shutdown);
    }

    // Initialize process signal and exception handlers
    if (finalConfig.enableSignalHandlers || finalConfig.enableExceptionHandlers) {
      if (finalConfig.enableSignalHandlers && !areSignalHandlersInitialized()) {
        console.log('[AppInit] Initializing signal handlers...');
      }
      
      if (finalConfig.enableExceptionHandlers && !areExceptionHandlersInitialized()) {
        console.log('[AppInit] Initializing exception handlers...');
      }

      // This will only initialize handlers that aren't already initialized
      initializeAllHandlers();
    }

    // Log initialization status
    const status = shutdownManager.getStatus();
    console.log('[AppInit] Cleanup handlers initialized successfully');
    console.log('[AppInit] Status:', {
      shutdownManagerInitialized: status.initialized,
      processCleanupHandlers: status.processCleanupInitialized,
      signalHandlersInitialized: areSignalHandlersInitialized(),
      exceptionHandlersInitialized: areExceptionHandlersInitialized(),
      processMonitoringEnabled: finalConfig.enableProcessMonitoring
    });

  } catch (error) {
    console.error('[AppInit] Failed to initialize cleanup handlers:', error);
    throw error;
  }
}

/**
 * Check if cleanup handlers are properly initialized
 */
export function areCleanupHandlersInitialized(): boolean {
  return (
    shutdownManager.isInitialized() &&
    areSignalHandlersInitialized() &&
    areExceptionHandlersInitialized()
  );
}

/**
 * Get initialization status for debugging
 */
export function getInitializationStatus() {
  return {
    shutdownManager: shutdownManager.getStatus(),
    signalHandlers: areSignalHandlersInitialized(),
    exceptionHandlers: areExceptionHandlersInitialized(),
    environment: process.env.NODE_ENV,
    isServerSide: typeof window === 'undefined'
  };
}

/**
 * Force initialization for testing purposes
 */
export async function forceInitializeForTesting(): Promise<void> {
  await initializeCleanupHandlers({
    shutdown: {
      enableProcessMonitoring: false, // Disable monitoring in tests
      workspaceCleanupTimeout: 2000,
      workspaceRetryAttempts: 1,
      enableVerboseLogging: true
    },
    enableSignalHandlers: true,
    enableExceptionHandlers: true,
    enableProcessMonitoring: false
  });
}