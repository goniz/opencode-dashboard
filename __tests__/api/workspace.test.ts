import request from 'supertest'
import { startTestServer, stopTestServer } from '../setup/test-server'
import { createTestWorkspace, cleanupWorkspace, generateTestId } from '../setup/test-utils'

describe('/api/workspaces/[workspaceId]', () => {
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

  describe('GET /api/workspaces/[workspaceId]', () => {
    it('should return workspace details for valid workspace ID', async () => {
      const response = await request(baseURL)
        .get(`/api/workspaces/${workspaceId}`)
        .expect(200)

      expect(response.body).toHaveProperty('id', workspaceId)
      expect(response.body).toHaveProperty('folder')
      expect(response.body).toHaveProperty('port')
      expect(response.body).toHaveProperty('status')
      expect(response.body).toHaveProperty('sessions')
      expect(Array.isArray(response.body.sessions)).toBe(true)
    })

    it('should return 404 for non-existent workspace ID', async () => {
      const nonExistentId = `workspace_${generateTestId()}`
      
      const response = await request(baseURL)
        .get(`/api/workspaces/${nonExistentId}`)
        .expect(404)

      expect(response.body).toHaveProperty('error', 'Workspace not found')
    })

    it('should handle invalid workspace ID format gracefully', async () => {
      const invalidId = 'invalid-workspace-id'
      
      const response = await request(baseURL)
        .get(`/api/workspaces/${invalidId}`)
        .expect(404)

      expect(response.body).toHaveProperty('error', 'Workspace not found')
    })
  })

  describe('DELETE /api/workspaces/[workspaceId]', () => {
    it('should successfully delete an existing workspace', async () => {
      // Verify workspace exists first
      await request(baseURL)
        .get(`/api/workspaces/${workspaceId}`)
        .expect(200)

      // Delete the workspace
      const response = await request(baseURL)
        .delete(`/api/workspaces/${workspaceId}`)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)

      // Verify workspace no longer exists
      await request(baseURL)
        .get(`/api/workspaces/${workspaceId}`)
        .expect(404)

      // Mark as cleaned up so afterEach doesn't try to clean it again
      workspaceId = ''
    })

    it('should handle deletion of non-existent workspace gracefully', async () => {
      const nonExistentId = `workspace_${generateTestId()}`
      
      // This might return 404 or 200 depending on implementation
      // Let's check what the actual behavior is
      const response = await request(baseURL)
        .delete(`/api/workspaces/${nonExistentId}`)

      // Either 404 or 200 is acceptable for DELETE operations
      expect([200, 404]).toContain(response.status)
    })

    it('should handle invalid workspace ID format gracefully', async () => {
      const invalidId = 'invalid-workspace-id'
      
      const response = await request(baseURL)
        .delete(`/api/workspaces/${invalidId}`)

      // Either 404 or 200 is acceptable for DELETE operations
      expect([200, 404]).toContain(response.status)
    })
  })
})