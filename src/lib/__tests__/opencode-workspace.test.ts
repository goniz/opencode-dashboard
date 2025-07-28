import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { workspaceManager, OpenCodeWorkspaceError } from '../opencode-workspace';
import { startTestOpenCodeServer, waitForServerReady, type TestOpenCodeServer } from '../../test/opencode-server';

describe('OpenCode Workspace Manager', () => {
  let testServer: TestOpenCodeServer;

  beforeAll(async () => {
    // Start a real opencode server for integration tests
    testServer = await startTestOpenCodeServer();
    await waitForServerReady(testServer.client);
  }, 60000); // 60 second timeout for server startup

  afterAll(async () => {
    if (testServer) {
      await testServer.cleanup();
    }
    // Clean up any remaining workspaces
    await workspaceManager.stopAllWorkspaces();
  });

  describe('OpenCodeWorkspaceError', () => {
    it('should create error with message only', () => {
      const error = new OpenCodeWorkspaceError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('OpenCodeWorkspaceError');
      expect(error.originalError).toBeUndefined();
      expect(error.recoverySuggestion).toBeUndefined();
    });

    it('should create error with original error and recovery suggestion', () => {
      const originalError = new Error('Original');
      const recoverySuggestion = 'Try this fix';
      const error = new OpenCodeWorkspaceError('Test error', originalError, recoverySuggestion);
      
      expect(error.message).toBe('Test error');
      expect(error.originalError).toBe(originalError);
      expect(error.recoverySuggestion).toBe(recoverySuggestion);
    });
  });

  describe('workspace management', () => {
    it('should start with no workspaces', () => {
      const workspaces = workspaceManager.getAllWorkspaces();
      expect(workspaces).toHaveLength(0);
    });

    it('should track last modified time', () => {
      const initialTime = workspaceManager.getLastModified();
      expect(typeof initialTime).toBe('number');
      expect(initialTime).toBeGreaterThan(0);
    });

    it('should add and remove change listeners', () => {
      const callback = vi.fn();
      const removeListener = workspaceManager.addChangeListener(callback);
      
      expect(typeof removeListener).toBe('function');
      removeListener();
      
      // Callback should not be called after removal
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('workspace lifecycle', () => {
    it('should start a workspace successfully', async () => {
      const config = {
        folder: testServer.tempDir,
        model: 'claude-3-5-sonnet-20241022',
      };

      const workspace = await workspaceManager.startWorkspace(config);
      
      expect(workspace).toBeDefined();
      expect(workspace.id).toBeDefined();
      expect(workspace.folder).toBe(config.folder);
      expect(workspace.model).toBe(config.model);
      expect(workspace.status).toBe('running');
      expect(workspace.port).toBeGreaterThan(0);
      expect(workspace.client).toBeDefined();
      expect(workspace.sessions).toBeInstanceOf(Map);
      expect(workspace.sessions.size).toBe(0);

      // Clean up
      await workspaceManager.stopWorkspace(workspace.id);
    }, 30000);

    it('should get workspace by id', async () => {
      const config = {
        folder: testServer.tempDir,
        model: 'claude-3-5-sonnet-20241022',
      };

      const workspace = await workspaceManager.startWorkspace(config);
      const retrieved = workspaceManager.getWorkspace(workspace.id);
      
      expect(retrieved).toBe(workspace);

      // Clean up
      await workspaceManager.stopWorkspace(workspace.id);
    }, 30000);

    it('should return undefined for non-existent workspace', () => {
      const workspace = workspaceManager.getWorkspace('non-existent-id');
      expect(workspace).toBeUndefined();
    });

    it('should list all workspaces', async () => {
      const config = {
        folder: testServer.tempDir,
        model: 'claude-3-5-sonnet-20241022',
      };

      const workspace = await workspaceManager.startWorkspace(config);
      const workspaces = workspaceManager.getAllWorkspaces();
      
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0]).toBe(workspace);

      // Clean up
      await workspaceManager.stopWorkspace(workspace.id);
    }, 30000);

    it('should stop a workspace', async () => {
      const config = {
        folder: testServer.tempDir,
        model: 'claude-3-5-sonnet-20241022',
      };

      const workspace = await workspaceManager.startWorkspace(config);
      expect(workspaceManager.getAllWorkspaces()).toHaveLength(1);

      await workspaceManager.stopWorkspace(workspace.id);
      expect(workspaceManager.getAllWorkspaces()).toHaveLength(0);
    }, 30000);

    it('should throw error when stopping non-existent workspace', async () => {
      await expect(workspaceManager.stopWorkspace('non-existent-id'))
        .rejects.toThrow('Workspace non-existent-id not found');
    });
  });

  describe('session management', () => {
    let workspaceId: string;

    beforeAll(async () => {
      const config = {
        folder: testServer.tempDir,
        model: 'claude-3-5-sonnet-20241022',
      };
      const workspace = await workspaceManager.startWorkspace(config);
      workspaceId = workspace.id;
    }, 30000);

    afterAll(async () => {
      if (workspaceId) {
        await workspaceManager.stopWorkspace(workspaceId);
      }
    });

    it('should create a session', async () => {
      const session = await workspaceManager.createSession(workspaceId, 'claude-3-5-sonnet-20241022');
      
      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.workspaceId).toBe(workspaceId);
      expect(session.model).toBe('claude-3-5-sonnet-20241022');
      expect(session.status).toBe('active');
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastActivity).toBeInstanceOf(Date);
    });

    it('should get a session by id', async () => {
      const session = await workspaceManager.createSession(workspaceId, 'claude-3-5-sonnet-20241022');
      const retrieved = workspaceManager.getSession(workspaceId, session.id);
      
      expect(retrieved).toBe(session);
    });

    it('should return undefined for non-existent session', () => {
      const session = workspaceManager.getSession(workspaceId, 'non-existent-session');
      expect(session).toBeUndefined();
    });

    it('should list workspace sessions', async () => {
      const session1 = await workspaceManager.createSession(workspaceId, 'claude-3-5-sonnet-20241022');
      const session2 = await workspaceManager.createSession(workspaceId, 'claude-3-5-sonnet-20241022');
      
      const sessions = workspaceManager.getWorkspaceSessions(workspaceId);
      expect(sessions).toHaveLength(2);
      expect(sessions).toContain(session1);
      expect(sessions).toContain(session2);
    });

    it('should update session activity', async () => {
      const session = await workspaceManager.createSession(workspaceId, 'claude-3-5-sonnet-20241022');
      const originalActivity = session.lastActivity;
      
      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      workspaceManager.updateSessionActivity(workspaceId, session.id);
      
      expect(session.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
    });

    it('should delete a session', async () => {
      const session = await workspaceManager.createSession(workspaceId, 'claude-3-5-sonnet-20241022');
      
      expect(workspaceManager.getSession(workspaceId, session.id)).toBe(session);
      
      workspaceManager.deleteSession(workspaceId, session.id);
      
      expect(workspaceManager.getSession(workspaceId, session.id)).toBeUndefined();
    });

    it('should return empty array for non-existent workspace sessions', () => {
      const sessions = workspaceManager.getWorkspaceSessions('non-existent-workspace');
      expect(sessions).toEqual([]);
    });

    it('should throw error when creating session for non-existent workspace', async () => {
      await expect(workspaceManager.createSession('non-existent-workspace', 'claude-3-5-sonnet-20241022'))
        .rejects.toThrow('Workspace non-existent-workspace not found');
    });
  });

  describe('change notifications', () => {
    it('should notify listeners when workspace is created', async () => {
      const callback = vi.fn();
      const removeListener = workspaceManager.addChangeListener(callback);
      
      const config = {
        folder: testServer.tempDir,
        model: 'claude-3-5-sonnet-20241022',
      };

      const workspace = await workspaceManager.startWorkspace(config);
      
      // Should be called at least once during workspace creation
      expect(callback).toHaveBeenCalled();
      
      removeListener();
      await workspaceManager.stopWorkspace(workspace.id);
    }, 30000);

    it('should handle listener errors gracefully', async () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const goodCallback = vi.fn();
      
      const removeErrorListener = workspaceManager.addChangeListener(errorCallback);
      const removeGoodListener = workspaceManager.addChangeListener(goodCallback);
      
      const config = {
        folder: testServer.tempDir,
        model: 'claude-3-5-sonnet-20241022',
      };

      const workspace = await workspaceManager.startWorkspace(config);
      
      // Both callbacks should be called despite the error in one
      expect(errorCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
      
      removeErrorListener();
      removeGoodListener();
      await workspaceManager.stopWorkspace(workspace.id);
    }, 30000);
  });
});