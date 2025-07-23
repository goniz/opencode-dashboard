import Opencode from '@opencode-ai/sdk';

/**
 * OpenCode SDK client configuration
 * Provides a configured instance of the OpenCode client with proper error handling and timeouts
 */

// Default configuration options
const DEFAULT_CONFIG = {
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  logLevel: 'warn' as 'debug' | 'info' | 'warn' | 'error' | 'off',
};

/**
 * Create a configured OpenCode client instance
 * @param options - Optional configuration overrides
 * @returns Configured OpenCode client
 */
export function createOpenCodeClient(options?: Partial<typeof DEFAULT_CONFIG>) {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  return new Opencode({
    maxRetries: config.maxRetries,
    timeout: config.timeout,
    logLevel: config.logLevel,
  });
}

/**
 * Singleton OpenCode client instance
 * Use this for most operations to avoid creating multiple clients
 */
export const opencodeClient = createOpenCodeClient();

/**
 * Error handling utilities for OpenCode API calls
 */
export class OpenCodeError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'OpenCodeError';
  }
}

/**
 * Wrapper function to handle OpenCode API calls with proper error handling
 * @param operation - The OpenCode API operation to execute
 * @param context - Additional context for error reporting
 * @returns Promise with the operation result
 */
export async function withOpenCodeErrorHandling<T>(
  operation: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Handle specific OpenCode SDK errors
    if (error instanceof Opencode.APIError) {
      throw new OpenCodeError(
        `OpenCode API Error (${error.status}): ${error.message}`,
        error,
        { ...context, status: error.status, headers: error.headers }
      );
    }
    
    // Handle network/connection errors
    if (error instanceof Opencode.APIConnectionError) {
      throw new OpenCodeError(
        'Failed to connect to OpenCode API',
        error,
        context
      );
    }
    
    // Handle rate limiting
    if (error instanceof Opencode.RateLimitError) {
      throw new OpenCodeError(
        'OpenCode API rate limit exceeded',
        error,
        context
      );
    }
    
    // Handle authentication errors
    if (error instanceof Opencode.AuthenticationError) {
      throw new OpenCodeError(
        'OpenCode API authentication failed',
        error,
        context
      );
    }
    
    // Handle permission errors
    if (error instanceof Opencode.PermissionDeniedError) {
      throw new OpenCodeError(
        'OpenCode API permission denied',
        error,
        context
      );
    }
    
    // Handle not found errors
    if (error instanceof Opencode.NotFoundError) {
      throw new OpenCodeError(
        'OpenCode resource not found',
        error,
        context
      );
    }
    
    // Handle validation errors
    if (error instanceof Opencode.UnprocessableEntityError) {
      throw new OpenCodeError(
        'OpenCode API validation error',
        error,
        context
      );
    }
    
    // Handle server errors
    if (error instanceof Opencode.InternalServerError) {
      throw new OpenCodeError(
        'OpenCode API server error',
        error,
        context
      );
    }
    
    // Handle unknown errors
    throw new OpenCodeError(
      'Unknown OpenCode API error',
      error,
      context
    );
  }
}

/**
 * Type-safe wrapper for OpenCode session operations
 */
export const sessionOperations = {
  /**
   * List all sessions with error handling
   */
  async list() {
    return withOpenCodeErrorHandling(
      () => opencodeClient.session.list(),
      { operation: 'session.list' }
    );
  },

  /**
   * Create a new session with error handling
   */
  async create() {
    return withOpenCodeErrorHandling(
      () => opencodeClient.session.create(),
      { operation: 'session.create' }
    );
  },

  /**
   * Delete a session with error handling
   */
  async delete(sessionId: string) {
    return withOpenCodeErrorHandling(
      () => opencodeClient.session.delete(sessionId),
      { operation: 'session.delete', sessionId }
    );
  },

  /**
   * Get messages from a session with error handling
   */
  async getMessages(sessionId: string) {
    return withOpenCodeErrorHandling(
      () => opencodeClient.session.messages(sessionId),
      { operation: 'session.messages', sessionId }
    );
  },

  /**
   * Send a message to a session with error handling
   * Note: Parameters will be adjusted based on actual SDK types
   */
  async sendMessage(sessionId: string, params: any) {
    return withOpenCodeErrorHandling(
      () => opencodeClient.session.chat(sessionId, params),
      { operation: 'session.chat', sessionId }
    );
  },

  /**
   * Initialize a session with context
   * Note: Parameters will be adjusted based on actual SDK types
   */
  async initialize(sessionId: string, params: any) {
    return withOpenCodeErrorHandling(
      () => opencodeClient.session.init(sessionId, params),
      { operation: 'session.init', sessionId }
    );
  },

  /**
   * Abort a session operation
   */
  async abort(sessionId: string) {
    return withOpenCodeErrorHandling(
      () => opencodeClient.session.abort(sessionId),
      { operation: 'session.abort', sessionId }
    );
  },
};

/**
 * Health check function to verify OpenCode API connectivity
 */
export async function checkOpenCodeHealth(): Promise<boolean> {
  try {
    await sessionOperations.list();
    return true;
  } catch (error) {
    console.error('OpenCode health check failed:', error);
    return false;
  }
}

/**
 * Configuration utilities
 */
export const config = {
  /**
   * Get current client configuration
   */
  getTimeout: () => DEFAULT_CONFIG.timeout,
  getMaxRetries: () => DEFAULT_CONFIG.maxRetries,
  getLogLevel: () => DEFAULT_CONFIG.logLevel,
  
  /**
   * Create a client with custom configuration
   */
  createCustomClient: createOpenCodeClient,
};