import request from 'supertest'
import { startTestServer, stopTestServer } from '../setup/test-server'
import { 
  mockWorkspaceData, 
  mockSessionData, 
  mockChatMessage,
  cleanupWorkspace, 
  generateTestId 
} from '../setup/test-utils'

describe('API Integration Tests', () => {
  let baseURL: string
  let createdWorkspaceIds: string[] = []

  beforeAll(async () => {
    baseURL = await startTestServer()
  })

  afterAll(async () => {
    // Clean up any created workspaces
    for (const workspaceId of createdWorkspaceIds) {
      await cleanupWorkspace(baseURL, workspaceId)
    }
    await stopTestServer()
  })

  afterEach(async () => {
    // Clean up workspaces created in individual tests
    for (const workspaceId of createdWorkspaceIds) {
      await cleanupWorkspace(baseURL, workspaceId)
    }
    createdWorkspaceIds = []
  })

  describe('Complete Workflow: Workspace -> Session -> Chat', () => {
    it('should handle complete workflow from workspace creation to chat', async () => {
      // Step 1: Create workspace
      const workspaceData = {
        ...mockWorkspaceData,
        folder: `/tmp/integration-test-${generateTestId()}`
      }

      const workspaceResponse = await request(baseURL)
        .post('/api/workspaces')
        .send(workspaceData)
        .expect(200)

      const workspaceId = workspaceResponse.body.id
      createdWorkspaceIds.push(workspaceId)

      expect(workspaceResponse.body).toHaveProperty('id')
      expect(workspaceResponse.body).toHaveProperty('folder', workspaceData.folder)
      expect(workspaceResponse.body).toHaveProperty('model', workspaceData.model)

      // Step 2: Verify workspace exists in list
      const workspacesResponse = await request(baseURL)
        .get('/api/workspaces')
        .expect(200)

      expect(workspacesResponse.body.some((w: any) => w.id === workspaceId)).toBe(true)

      // Step 3: Create session
      const sessionResponse = await request(baseURL)
        .post(`/api/workspaces/${workspaceId}/sessions`)
        .send(mockSessionData)
        .expect(200)

      const sessionId = sessionResponse.body.id

      expect(sessionResponse.body).toHaveProperty('id')
      expect(sessionResponse.body).toHaveProperty('workspaceId', workspaceId)
      expect(sessionResponse.body).toHaveProperty('model', mockSessionData.model)

      // Step 4: Verify session exists in list
      const sessionsResponse = await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions`)
        .expect(200)

      expect(sessionsResponse.body).toHaveLength(1)
      expect(sessionsResponse.body[0]).toHaveProperty('id', sessionId)

      // Step 5: Get individual session details
      const sessionDetailResponse = await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions/${sessionId}`)
        .expect(200)

      expect(sessionDetailResponse.body).toHaveProperty('id', sessionId)
      expect(sessionDetailResponse.body).toHaveProperty('workspaceId', workspaceId)

      // Step 6: Get initial chat history (should be empty)
      const initialChatResponse = await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions/${sessionId}/chat`)
        .expect(200)

      expect(initialChatResponse.body).toHaveProperty('messages')
      expect(Array.isArray(initialChatResponse.body.messages)).toBe(true)

      // Step 7: Send chat message (non-streaming)
      const chatResponse = await request(baseURL)
        .post(`/api/workspaces/${workspaceId}/sessions/${sessionId}/chat`)
        .send(mockChatMessage)
        .expect(200)

      expect(chatResponse.body).toHaveProperty('message')
      expect(chatResponse.body).toHaveProperty('sessionId', sessionId)
      expect(chatResponse.body).toHaveProperty('workspaceId', workspaceId)

      // Step 8: Verify workspace shows session count
      const updatedWorkspaceResponse = await request(baseURL)
        .get(`/api/workspaces/${workspaceId}`)
        .expect(200)

      expect(updatedWorkspaceResponse.body).toHaveProperty('sessions')
      expect(Array.isArray(updatedWorkspaceResponse.body.sessions)).toBe(true)
      expect(updatedWorkspaceResponse.body.sessions).toHaveLength(1)

      // Step 9: Delete session
      await request(baseURL)
        .delete(`/api/workspaces/${workspaceId}/sessions/${sessionId}`)
        .expect(200)

      // Step 10: Verify session is deleted
      await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions/${sessionId}`)
        .expect(404)

      // Step 11: Verify sessions list is empty
      const finalSessionsResponse = await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions`)
        .expect(200)

      expect(finalSessionsResponse.body).toHaveLength(0)

      // Step 12: Delete workspace
      await request(baseURL)
        .delete(`/api/workspaces/${workspaceId}`)
        .expect(200)

      // Step 13: Verify workspace is deleted
      await request(baseURL)
        .get(`/api/workspaces/${workspaceId}`)
        .expect(404)

      // Remove from cleanup list since we deleted it manually
      createdWorkspaceIds = createdWorkspaceIds.filter(id => id !== workspaceId)
    }, 30000) // Increase timeout for integration test

    it('should handle multiple workspaces with multiple sessions', async () => {
      // Create first workspace
      const workspace1Data = {
        ...mockWorkspaceData,
        folder: `/tmp/multi-test-1-${generateTestId()}`
      }

      const workspace1Response = await request(baseURL)
        .post('/api/workspaces')
        .send(workspace1Data)
        .expect(200)

      const workspace1Id = workspace1Response.body.id
      createdWorkspaceIds.push(workspace1Id)

      // Create second workspace
      const workspace2Data = {
        ...mockWorkspaceData,
        folder: `/tmp/multi-test-2-${generateTestId()}`
      }

      const workspace2Response = await request(baseURL)
        .post('/api/workspaces')
        .send(workspace2Data)
        .expect(200)

      const workspace2Id = workspace2Response.body.id
      createdWorkspaceIds.push(workspace2Id)

      // Create sessions in both workspaces
      const session1Response = await request(baseURL)
        .post(`/api/workspaces/${workspace1Id}/sessions`)
        .send(mockSessionData)
        .expect(200)

      const session2Response = await request(baseURL)
        .post(`/api/workspaces/${workspace2Id}/sessions`)
        .send(mockSessionData)
        .expect(200)

      const session3Response = await request(baseURL)
        .post(`/api/workspaces/${workspace1Id}/sessions`)
        .send(mockSessionData)
        .expect(200)

      // Verify workspace 1 has 2 sessions
      const workspace1SessionsResponse = await request(baseURL)
        .get(`/api/workspaces/${workspace1Id}/sessions`)
        .expect(200)

      expect(workspace1SessionsResponse.body).toHaveLength(2)

      // Verify workspace 2 has 1 session
      const workspace2SessionsResponse = await request(baseURL)
        .get(`/api/workspaces/${workspace2Id}/sessions`)
        .expect(200)

      expect(workspace2SessionsResponse.body).toHaveLength(1)

      // Verify sessions belong to correct workspaces
      expect(session1Response.body.workspaceId).toBe(workspace1Id)
      expect(session2Response.body.workspaceId).toBe(workspace2Id)
      expect(session3Response.body.workspaceId).toBe(workspace1Id)

      // Verify we can interact with sessions from different workspaces
      await request(baseURL)
        .get(`/api/workspaces/${workspace1Id}/sessions/${session1Response.body.id}`)
        .expect(200)

      await request(baseURL)
        .get(`/api/workspaces/${workspace2Id}/sessions/${session2Response.body.id}`)
        .expect(200)

      // Verify cross-workspace session access fails
      await request(baseURL)
        .get(`/api/workspaces/${workspace1Id}/sessions/${session2Response.body.id}`)
        .expect(404)

      await request(baseURL)
        .get(`/api/workspaces/${workspace2Id}/sessions/${session1Response.body.id}`)
        .expect(404)
    }, 30000) // Increase timeout for integration test
  })

  describe('Error Recovery and Edge Cases', () => {
    it('should handle rapid create/delete operations', async () => {
      const workspaceData = {
        ...mockWorkspaceData,
        folder: `/tmp/rapid-test-${generateTestId()}`
      }

      // Create workspace
      const workspaceResponse = await request(baseURL)
        .post('/api/workspaces')
        .send(workspaceData)
        .expect(200)

      const workspaceId = workspaceResponse.body.id
      createdWorkspaceIds.push(workspaceId)

      // Rapidly create multiple sessions
      const sessionPromises = Array.from({ length: 3 }, () =>
        request(baseURL)
          .post(`/api/workspaces/${workspaceId}/sessions`)
          .send(mockSessionData)
          .expect(200)
      )

      const sessionResponses = await Promise.all(sessionPromises)
      const sessionIds = sessionResponses.map(r => r.body.id)

      // Verify all sessions were created
      const sessionsResponse = await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions`)
        .expect(200)

      expect(sessionsResponse.body).toHaveLength(3)

      // Rapidly delete all sessions
      const deletePromises = sessionIds.map(sessionId =>
        request(baseURL)
          .delete(`/api/workspaces/${workspaceId}/sessions/${sessionId}`)
          .expect(200)
      )

      await Promise.all(deletePromises)

      // Verify all sessions are deleted
      const finalSessionsResponse = await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions`)
        .expect(200)

      expect(finalSessionsResponse.body).toHaveLength(0)
    }, 30000) // Increase timeout for rapid operations test
  })
})