import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Opencode from '@opencode-ai/sdk';
import {
  createOpenCodeClient,
  opencodeClient,
  OpenCodeError,
  withOpenCodeErrorHandling,
  sessionOperations,
  checkOpenCodeHealth,
  config,
} from '../opencode-client';
import { startTestOpenCodeServer, waitForServerReady, type TestOpenCodeServer } from '../../test/opencode-server';

describe('OpenCode Client', () => {
  let testServer: TestOpenCodeServer;
  let testClient: Opencode;

  beforeAll(async () => {
    // Start a real opencode server for integration tests
    testServer = await startTestOpenCodeServer();
    await waitForServerReady(testServer.client);
    testClient = testServer.client;
  }, 60000); // 60 second timeout for server startup

  afterAll(async () => {
    if (testServer) {
      await testServer.cleanup();
    }
  });

  describe('createOpenCodeClient', () => {
    it('should create a client with default configuration', () => {
      const client = createOpenCodeClient();
      expect(client).toBeInstanceOf(Opencode);
    });

    it('should create a client with custom configuration', () => {
      const customConfig = {
        maxRetries: 5,
        timeout: 60000,
        logLevel: 'debug' as const,
      };
      const client = createOpenCodeClient(customConfig);
      expect(client).toBeInstanceOf(Opencode);
    });

    it('should merge custom config with defaults', () => {
      const partialConfig = { maxRetries: 1 };
      const client = createOpenCodeClient(partialConfig);
      expect(client).toBeInstanceOf(Opencode);
    });
  });

  describe('OpenCodeError', () => {
    it('should create error with message only', () => {
      const error = new OpenCodeError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('OpenCodeError');
      expect(error.originalError).toBeUndefined();
      expect(error.context).toBeUndefined();
    });

    it('should create error with original error and context', () => {
      const originalError = new Error('Original');
      const context = { operation: 'test' };
      const error = new OpenCodeError('Test error', originalError, context);
      
      expect(error.message).toBe('Test error');
      expect(error.originalError).toBe(originalError);
      expect(error.context).toBe(context);
    });
  });

  describe('withOpenCodeErrorHandling', () => {
    it('should return result on successful operation', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const result = await withOpenCodeErrorHandling(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledOnce();
    });

    it('should handle APIError', async () => {
      const apiError = new Opencode.APIError(400, {}, 'API Error', new Headers());
      const operation = vi.fn().mockRejectedValue(apiError);
      
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow(OpenCodeError);
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow('OpenCode API Error (400): API Error');
    });

    it('should handle APIConnectionError', async () => {
      const connectionError = new Opencode.APIConnectionError({ message: 'Connection failed' });
      const operation = vi.fn().mockRejectedValue(connectionError);
      
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow(OpenCodeError);
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow('Failed to connect to OpenCode API');
    });

    it('should handle RateLimitError', async () => {
      const rateLimitError = new Opencode.RateLimitError(429, {}, 'Rate limited', new Headers());
      const operation = vi.fn().mockRejectedValue(rateLimitError);
      
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow(OpenCodeError);
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow('OpenCode API rate limit exceeded');
    });

    it('should handle AuthenticationError', async () => {
      const authError = new Opencode.AuthenticationError(401, {}, 'Auth failed', new Headers());
      const operation = vi.fn().mockRejectedValue(authError);
      
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow(OpenCodeError);
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow('OpenCode API authentication failed');
    });

    it('should handle PermissionDeniedError', async () => {
      const permissionError = new Opencode.PermissionDeniedError(403, {}, 'Permission denied', new Headers());
      const operation = vi.fn().mockRejectedValue(permissionError);
      
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow(OpenCodeError);
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow('OpenCode API permission denied');
    });

    it('should handle NotFoundError', async () => {
      const notFoundError = new Opencode.NotFoundError(404, {}, 'Not found', new Headers());
      const operation = vi.fn().mockRejectedValue(notFoundError);
      
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow(OpenCodeError);
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow('OpenCode resource not found');
    });

    it('should handle UnprocessableEntityError', async () => {
      const validationError = new Opencode.UnprocessableEntityError(422, {}, 'Validation failed', new Headers());
      const operation = vi.fn().mockRejectedValue(validationError);
      
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow(OpenCodeError);
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow('OpenCode API validation error');
    });

    it('should handle InternalServerError', async () => {
      const serverError = new Opencode.InternalServerError(500, {}, 'Server error', new Headers());
      const operation = vi.fn().mockRejectedValue(serverError);
      
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow(OpenCodeError);
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow('OpenCode API server error');
    });

    it('should handle unknown errors', async () => {
      const unknownError = new Error('Unknown error');
      const operation = vi.fn().mockRejectedValue(unknownError);
      
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow(OpenCodeError);
      await expect(withOpenCodeErrorHandling(operation)).rejects.toThrow('Unknown OpenCode API error');
    });

    it('should include context in error', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Test error'));
      const context = { operation: 'test', sessionId: '123' };
      
      try {
        await withOpenCodeErrorHandling(operation, context);
      } catch (error) {
        expect(error).toBeInstanceOf(OpenCodeError);
        expect((error as OpenCodeError).context).toEqual(context);
      }
    });
  });

  describe('sessionOperations with real server', () => {
    let sessionId: string;

    it('should list sessions', async () => {
      const sessions = await sessionOperations.list();
      expect(Array.isArray(sessions)).toBe(true);
    });

    it('should create a session', async () => {
      const session = await sessionOperations.create();
      expect(session).toHaveProperty('id');
      expect(typeof session.id).toBe('string');
      sessionId = session.id;
    });

    it('should get messages from a session', async () => {
      if (!sessionId) {
        const session = await sessionOperations.create();
        sessionId = session.id;
      }
      
      const messages = await sessionOperations.getMessages(sessionId);
      expect(Array.isArray(messages)).toBe(true);
    });

    it('should initialize a session', async () => {
      if (!sessionId) {
        const session = await sessionOperations.create();
        sessionId = session.id;
      }
      
      const initParams = {
        messageID: `test_${Date.now()}`,
        modelID: 'claude-3-5-sonnet-20241022',
        providerID: 'anthropic',
      };
      
      await expect(sessionOperations.initialize(sessionId, initParams)).resolves.not.toThrow();
    });

    it('should send a message to a session', async () => {
      if (!sessionId) {
        const session = await sessionOperations.create();
        sessionId = session.id;
        
        // Initialize the session first
        await sessionOperations.initialize(sessionId, {
          messageID: `init_${Date.now()}`,
          modelID: 'claude-3-5-sonnet-20241022',
          providerID: 'anthropic',
        });
      }
      
      const chatParams = {
        messageID: `msg_${Date.now()}`,
        mode: 'chat',
        modelID: 'claude-3-5-sonnet-20241022',
        providerID: 'anthropic',
        parts: [{
          id: `part_${Date.now()}`,
          messageID: `msg_${Date.now()}`,
          sessionID: sessionId,
          text: 'Hello, this is a test message',
          type: 'text' as const,
        }],
      };
      
      const response = await sessionOperations.sendMessage(sessionId, chatParams);
      expect(response).toBeDefined();
    });

    it('should abort a session operation', async () => {
      if (!sessionId) {
        const session = await sessionOperations.create();
        sessionId = session.id;
      }
      
      await expect(sessionOperations.abort(sessionId)).resolves.not.toThrow();
    });

    it('should delete a session', async () => {
      if (!sessionId) {
        const session = await sessionOperations.create();
        sessionId = session.id;
      }
      
      await expect(sessionOperations.delete(sessionId)).resolves.not.toThrow();
      sessionId = ''; // Reset for cleanup
    });
  });

  describe('checkOpenCodeHealth', () => {
    it('should return true when server is healthy', async () => {
      // Mock sessionOperations.list to use our test server
      const originalList = sessionOperations.list;
      sessionOperations.list = vi.fn().mockImplementation(() => testClient.session.list());
      
      const isHealthy = await checkOpenCodeHealth();
      expect(isHealthy).toBe(true);
      
      // Restore original function
      sessionOperations.list = originalList;
    });

    it('should return false when server is unhealthy', async () => {
      // Mock sessionOperations.list to throw an error
      const originalList = sessionOperations.list;
      sessionOperations.list = vi.fn().mockRejectedValue(new Error('Server down'));
      
      const isHealthy = await checkOpenCodeHealth();
      expect(isHealthy).toBe(false);
      
      // Restore original function
      sessionOperations.list = originalList;
    });
  });

  describe('config utilities', () => {
    it('should return default timeout', () => {
      expect(config.getTimeout()).toBe(30000);
    });

    it('should return default max retries', () => {
      expect(config.getMaxRetries()).toBe(3);
    });

    it('should return default log level', () => {
      expect(config.getLogLevel()).toBe('warn');
    });

    it('should create custom client', () => {
      const customClient = config.createCustomClient({ timeout: 60000 });
      expect(customClient).toBeInstanceOf(Opencode);
    });
  });

  describe('singleton client', () => {
    it('should export a singleton client instance', () => {
      expect(opencodeClient).toBeInstanceOf(Opencode);
    });

    it('should be the same instance on multiple imports', () => {
      const client1 = opencodeClient;
      const client2 = opencodeClient;
      expect(client1).toBe(client2);
    });
  });
});