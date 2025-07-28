import request from 'supertest'
import { startTestServer, stopTestServer } from '../setup/test-server'
import { 
  createTestWorkspace, 
  createTestSession, 
  cleanupWorkspace, 
  generateTestId 
} from '../setup/test-utils'

describe('/api/workspaces/[workspaceId]/sessions/[sessionId]', () => {
  let baseURL: string
  let workspaceId: string
  let sessionId: string

  beforeAll(async () => {
    baseURL = await startTestServer()
  })

  afterAll(async () => {
    if (workspaceId) {
      await cleanupWorkspace(baseURL, workspaceId)
    }
    await stopTestServer()
  })

  beforeEach(async () => {
    // Create a test workspace and session for each test
    workspaceId = await createTestWorkspace(baseURL)
    sessionId = await createTestSession(baseURL, workspaceId)
  })

  afterEach(async () => {
    if (workspaceId) {
      await cleanupWorkspace(baseURL, workspaceId)
      workspaceId = ''
      sessionId = ''
    }
  })

  describe('GET /api/workspaces/[workspaceId]/sessions/[sessionId]', () => {
    it('should return session details for valid session ID', async () => {
      const response = await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions/${sessionId}`)
        .expect(200)

      expect(response.body).toHaveProperty('id', sessionId)
      expect(response.body).toHaveProperty('workspaceId', workspaceId)
      expect(response.body).toHaveProperty('model')
      expect(response.body).toHaveProperty('createdAt')
      expect(response.body).toHaveProperty('lastActivity')
      expect(response.body).toHaveProperty('status')
    })

    it('should return 404 for non-existent session ID', async () => {
      const nonExistentSessionId = `session_${generateTestId()}`
      
      const response = await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions/${nonExistentSessionId}`)
        .expect(404)

      expect(response.body).toHaveProperty('error', 'Session not found')
    })

    it('should return 404 for non-existent workspace ID', async () => {
      const nonExistentWorkspaceId = `workspace_${generateTestId()}`
      
      const response = await request(baseURL)
        .get(`/api/workspaces/${nonExistentWorkspaceId}/sessions/${sessionId}`)
        .expect(404)

      expect(response.body).toHaveProperty('error', 'Session not found')
    })

    it('should handle invalid session ID format gracefully', async () => {
      const invalidSessionId = 'invalid-session-id'
      
      const response = await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions/${invalidSessionId}`)
        .expect(404)

      expect(response.body).toHaveProperty('error', 'Session not found')
    })
  })

  describe('DELETE /api/workspaces/[workspaceId]/sessions/[sessionId]', () => {
    it('should successfully delete an existing session', async () => {
      // Verify session exists first
      await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions/${sessionId}`)
        .expect(200)

      // Delete the session
      const response = await request(baseURL)
        .delete(`/api/workspaces/${workspaceId}/sessions/${sessionId}`)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)

      // Verify session no longer exists
      await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions/${sessionId}`)
        .expect(404)
    })

    it('should return 404 when trying to delete non-existent session', async () => {
      const nonExistentSessionId = `session_${generateTestId()}`
      
      const response = await request(baseURL)
        .delete(`/api/workspaces/${workspaceId}/sessions/${nonExistentSessionId}`)
        .expect(404)

      expect(response.body).toHaveProperty('error', 'Session not found')
    })

    it('should return 404 for non-existent workspace ID', async () => {
      const nonExistentWorkspaceId = `workspace_${generateTestId()}`
      
      const response = await request(baseURL)
        .delete(`/api/workspaces/${nonExistentWorkspaceId}/sessions/${sessionId}`)
        .expect(404)

      expect(response.body).toHaveProperty('error', 'Session not found')
    })

    it('should handle invalid session ID format gracefully', async () => {
      const invalidSessionId = 'invalid-session-id'
      
      const response = await request(baseURL)
        .delete(`/api/workspaces/${workspaceId}/sessions/${invalidSessionId}`)
        .expect(404)

      expect(response.body).toHaveProperty('error', 'Session not found')
    })

    it('should not affect other sessions in the same workspace', async () => {
      // Create another session in the same workspace
      const anotherSessionId = await createTestSession(baseURL, workspaceId)

      // Delete the first session
      await request(baseURL)
        .delete(`/api/workspaces/${workspaceId}/sessions/${sessionId}`)
        .expect(200)

      // Verify the other session still exists
      await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions/${anotherSessionId}`)
        .expect(200)

      // Verify the deleted session is gone
      await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions/${sessionId}`)
        .expect(404)
    })
  })
})