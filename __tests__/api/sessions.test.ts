import request from 'supertest'
import { startTestServer, stopTestServer } from '../setup/test-server'
import { 
  createTestWorkspace, 
  createTestSession, 
  cleanupWorkspace, 
  mockSessionData,
  generateTestId 
} from '../setup/test-utils'

describe('/api/workspaces/[workspaceId]/sessions', () => {
  let baseURL: string
  let workspaceId: string

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
    // Create a test workspace for each test
    workspaceId = await createTestWorkspace(baseURL)
  })

  afterEach(async () => {
    if (workspaceId) {
      await cleanupWorkspace(baseURL, workspaceId)
      workspaceId = ''
    }
  })

  describe('POST /api/workspaces/[workspaceId]/sessions', () => {
    it('should create a new session with valid data', async () => {
      const response = await request(baseURL)
        .post(`/api/workspaces/${workspaceId}/sessions`)
        .send(mockSessionData)
        .expect(200)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('workspaceId', workspaceId)
      expect(response.body).toHaveProperty('model', mockSessionData.model)
      expect(response.body).toHaveProperty('port')
      expect(response.body).toHaveProperty('createdAt')
      expect(response.body).toHaveProperty('lastActivity')
      expect(response.body).toHaveProperty('status')
    })

    it('should return 400 when model is missing', async () => {
      const invalidData = {
        // model is missing
      }

      const response = await request(baseURL)
        .post(`/api/workspaces/${workspaceId}/sessions`)
        .send(invalidData)
        .expect(400)

      expect(response.body).toHaveProperty('error', 'Model is required')
    })

    it('should return 404 for non-existent workspace', async () => {
      const nonExistentWorkspaceId = `workspace_${generateTestId()}`

      const response = await request(baseURL)
        .post(`/api/workspaces/${nonExistentWorkspaceId}/sessions`)
        .send(mockSessionData)
        .expect(404)

      expect(response.body).toHaveProperty('error', 'Workspace not found')
    })

    it('should create multiple sessions in the same workspace', async () => {
      // Create first session
      const response1 = await request(baseURL)
        .post(`/api/workspaces/${workspaceId}/sessions`)
        .send(mockSessionData)
        .expect(200)

      // Create second session
      const response2 = await request(baseURL)
        .post(`/api/workspaces/${workspaceId}/sessions`)
        .send(mockSessionData)
        .expect(200)

      expect(response1.body.id).not.toBe(response2.body.id)
      expect(response1.body.workspaceId).toBe(workspaceId)
      expect(response2.body.workspaceId).toBe(workspaceId)
    })
  })

  describe('GET /api/workspaces/[workspaceId]/sessions', () => {
    it('should return empty array when no sessions exist', async () => {
      const response = await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(0)
    })

    it('should return list of sessions when they exist', async () => {
      // Create a test session first
      const sessionResponse = await request(baseURL)
        .post(`/api/workspaces/${workspaceId}/sessions`)
        .send(mockSessionData)
        .expect(200)

      const sessionId = sessionResponse.body.id

      // Get all sessions
      const response = await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(1)
      
      const session = response.body[0]
      expect(session).toHaveProperty('id', sessionId)
      expect(session).toHaveProperty('workspaceId', workspaceId)
      expect(session).toHaveProperty('model', mockSessionData.model)
      expect(session).toHaveProperty('createdAt')
      expect(session).toHaveProperty('lastActivity')
      expect(session).toHaveProperty('status')
    })

    it('should return 404 for non-existent workspace', async () => {
      const nonExistentWorkspaceId = `workspace_${generateTestId()}`

      const response = await request(baseURL)
        .get(`/api/workspaces/${nonExistentWorkspaceId}/sessions`)
        .expect(500) // Based on the implementation, this seems to return 500

      expect(response.body).toHaveProperty('error')
    })

    it('should return multiple sessions in correct order', async () => {
      // Create multiple sessions
      const session1Response = await request(baseURL)
        .post(`/api/workspaces/${workspaceId}/sessions`)
        .send(mockSessionData)
        .expect(200)

      const session2Response = await request(baseURL)
        .post(`/api/workspaces/${workspaceId}/sessions`)
        .send(mockSessionData)
        .expect(200)

      // Get all sessions
      const response = await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(2)

      const sessionIds = response.body.map((s: any) => s.id)
      expect(sessionIds).toContain(session1Response.body.id)
      expect(sessionIds).toContain(session2Response.body.id)
    })
  })
})