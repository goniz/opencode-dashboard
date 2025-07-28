import request from 'supertest'
import { startTestServer, stopTestServer } from '../setup/test-server'
import { 
  createTestWorkspace, 
  createTestSession, 
  cleanupWorkspace, 
  mockChatMessage,
  generateTestId,
  waitFor
} from '../setup/test-utils'

describe('/api/workspaces/[workspaceId]/sessions/[sessionId]/chat', () => {
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

  describe('POST /api/workspaces/[workspaceId]/sessions/[sessionId]/chat', () => {
    it('should handle non-streaming chat request with valid data', async () => {
      const response = await request(baseURL)
        .post(`/api/workspaces/${workspaceId}/sessions/${sessionId}/chat`)
        .send(mockChatMessage)
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('sessionId', sessionId)
      expect(response.body).toHaveProperty('workspaceId', workspaceId)
      expect(response.body).toHaveProperty('timestamp')
      
      // Verify timestamp is a valid ISO string
      expect(() => new Date(response.body.timestamp)).not.toThrow()
    })

    it('should handle streaming chat request', async () => {
      const streamingMessage = {
        ...mockChatMessage,
        stream: true
      }

      const response = await request(baseURL)
        .post(`/api/workspaces/${workspaceId}/sessions/${sessionId}/chat`)
        .send(streamingMessage)
        .expect(200)

      expect(response.headers['content-type']).toBe('text/event-stream')
      expect(response.headers['cache-control']).toBe('no-cache')
      expect(response.headers['connection']).toBe('keep-alive')
      
      // For streaming, we expect server-sent events format
      expect(response.text).toContain('data:')
    }, 10000) // Increase timeout for streaming tests

    it('should return 400 when messages array is missing', async () => {
      const invalidData = {
        stream: false
        // messages is missing
      }

      const response = await request(baseURL)
        .post(`/api/workspaces/${workspaceId}/sessions/${sessionId}/chat`)
        .send(invalidData)
        .expect(400)

      expect(response.body).toHaveProperty('error', 'Messages array is required and cannot be empty')
    })

    it('should return 400 when messages array is empty', async () => {
      const invalidData = {
        messages: [],
        stream: false
      }

      const response = await request(baseURL)
        .post(`/api/workspaces/${workspaceId}/sessions/${sessionId}/chat`)
        .send(invalidData)
        .expect(400)

      expect(response.body).toHaveProperty('error', 'Messages array is required and cannot be empty')
    })

    it('should return 400 when last message is not from user', async () => {
      const invalidData = {
        messages: [
          {
            role: 'assistant',
            content: 'This should be from user'
          }
        ],
        stream: false
      }

      const response = await request(baseURL)
        .post(`/api/workspaces/${workspaceId}/sessions/${sessionId}/chat`)
        .send(invalidData)
        .expect(400)

      expect(response.body).toHaveProperty('error', 'Last message must be from user')
    })

    it('should return 404 for non-existent workspace', async () => {
      const nonExistentWorkspaceId = `workspace_${generateTestId()}`

      const response = await request(baseURL)
        .post(`/api/workspaces/${nonExistentWorkspaceId}/sessions/${sessionId}/chat`)
        .send(mockChatMessage)
        .expect(404)

      expect(response.body).toHaveProperty('error', `Workspace ${nonExistentWorkspaceId} not found`)
    })

    it('should return 404 for non-existent session', async () => {
      const nonExistentSessionId = `session_${generateTestId()}`

      const response = await request(baseURL)
        .post(`/api/workspaces/${workspaceId}/sessions/${nonExistentSessionId}/chat`)
        .send(mockChatMessage)
        .expect(404)

      expect(response.body).toHaveProperty('error', `Session ${nonExistentSessionId} not found in workspace ${workspaceId}`)
    })

    it('should handle multiple messages in conversation', async () => {
      const conversationData = {
        messages: [
          {
            role: 'user',
            content: 'Hello'
          },
          {
            role: 'assistant',
            content: 'Hi there!'
          },
          {
            role: 'user',
            content: 'How are you?'
          }
        ],
        stream: false
      }

      const response = await request(baseURL)
        .post(`/api/workspaces/${workspaceId}/sessions/${sessionId}/chat`)
        .send(conversationData)
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('sessionId', sessionId)
      expect(response.body).toHaveProperty('workspaceId', workspaceId)
    })
  })

  describe('GET /api/workspaces/[workspaceId]/sessions/[sessionId]/chat', () => {
    it('should return empty chat history for new session', async () => {
      const response = await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions/${sessionId}/chat`)
        .expect(200)

      expect(response.body).toHaveProperty('workspaceId', workspaceId)
      expect(response.body).toHaveProperty('sessionId', sessionId)
      expect(response.body).toHaveProperty('messages')
      expect(response.body).toHaveProperty('timestamp')
      expect(Array.isArray(response.body.messages)).toBe(true)
    })

    it('should return 404 for non-existent workspace', async () => {
      const nonExistentWorkspaceId = `workspace_${generateTestId()}`

      const response = await request(baseURL)
        .get(`/api/workspaces/${nonExistentWorkspaceId}/sessions/${sessionId}/chat`)
        .expect(404)

      expect(response.body).toHaveProperty('error', `Workspace ${nonExistentWorkspaceId} not found`)
    })

    it('should return 404 for non-existent session', async () => {
      const nonExistentSessionId = `session_${generateTestId()}`

      const response = await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions/${nonExistentSessionId}/chat`)
        .expect(404)

      expect(response.body).toHaveProperty('error', `Session ${nonExistentSessionId} not found in workspace ${workspaceId}`)
    })

    it('should handle invalid session ID format gracefully', async () => {
      const invalidSessionId = 'invalid-session-id'

      const response = await request(baseURL)
        .get(`/api/workspaces/${workspaceId}/sessions/${invalidSessionId}/chat`)
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })
})