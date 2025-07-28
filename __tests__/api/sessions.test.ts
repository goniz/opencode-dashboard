import { NextRequest } from 'next/server'
import { POST, GET } from '../../src/app/api/workspaces/[workspaceId]/sessions/route'
import { generateTestId } from '../setup/test-utils'

// Mock the workspace manager to avoid OpenCode CLI issues in tests
const mockWorkspaces = new Map()
const mockSessions = new Map()

jest.mock('@/lib/opencode-workspace', () => ({
  workspaceManager: {
    getWorkspace: jest.fn((id: string) => mockWorkspaces.get(id)),
    createSession: jest.fn(async (workspaceId: string, model: string) => {
      const workspace = mockWorkspaces.get(workspaceId)
      if (!workspace) {
        throw new Error('Workspace not found')
      }
      
      const sessionId = `session_${generateTestId()}`
      const session = {
        id: sessionId,
        workspaceId,
        model,
        createdAt: new Date(),
        lastActivity: new Date(),
        status: 'active'
      }
      
      workspace.sessions.set(sessionId, session)
      mockSessions.set(sessionId, session)
      return session
    }),
    getWorkspaceSessions: jest.fn((workspaceId: string) => {
      const workspace = mockWorkspaces.get(workspaceId)
      return workspace ? Array.from(workspace.sessions.values()) : []
    }),
  }
}))

describe('/api/workspaces/[workspaceId]/sessions (Direct Import)', () => {
  let workspaceId: string

  beforeEach(() => {
    // Clear all mocks and create a test workspace
    jest.clearAllMocks()
    mockWorkspaces.clear()
    mockSessions.clear()
    
    workspaceId = `test-workspace-${generateTestId()}`
    mockWorkspaces.set(workspaceId, {
      id: workspaceId,
      folder: `/tmp/test-${workspaceId}`,
      port: 8080,
      status: 'running',
      sessions: new Map(),
    })
  })

  describe('POST /api/workspaces/[workspaceId]/sessions', () => {
    it('should create a new session with valid data', async () => {
      const sessionData = {
        model: 'anthropic/claude-3-sonnet-20240229'
      }
      
      const request = new NextRequest('http://localhost:3000/api/workspaces/' + workspaceId + '/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      })
      const params = Promise.resolve({ workspaceId })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('workspaceId', workspaceId)
      expect(data).toHaveProperty('model', sessionData.model)
      expect(data).toHaveProperty('port')
      expect(data).toHaveProperty('createdAt')
      expect(data).toHaveProperty('lastActivity')
      expect(data).toHaveProperty('status')
    })

    it('should return 400 when model is missing', async () => {
      const invalidData = {}
      
      const request = new NextRequest('http://localhost:3000/api/workspaces/' + workspaceId + '/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })
      const params = Promise.resolve({ workspaceId })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error', 'Model is required')
    })

    it('should return 404 for non-existent workspace', async () => {
      const nonExistentWorkspaceId = `workspace_${generateTestId()}`
      const sessionData = {
        model: 'anthropic/claude-3-sonnet-20240229'
      }
      
      const request = new NextRequest('http://localhost:3000/api/workspaces/' + nonExistentWorkspaceId + '/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      })
      const params = Promise.resolve({ workspaceId: nonExistentWorkspaceId })
      
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toHaveProperty('error', 'Workspace not found')
    })
  })

  describe('GET /api/workspaces/[workspaceId]/sessions', () => {
    it('should return empty array when no sessions exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/workspaces/' + workspaceId + '/sessions')
      const params = Promise.resolve({ workspaceId })
      
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(0)
    })

    it('should return sessions when they exist', async () => {
      // First create a session
      const sessionData = {
        model: 'anthropic/claude-3-sonnet-20240229'
      }
      
      const postRequest = new NextRequest('http://localhost:3000/api/workspaces/' + workspaceId + '/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      })
      const postParams = Promise.resolve({ workspaceId })
      await POST(postRequest, { params: postParams })

      // Then get sessions
      const getRequest = new NextRequest('http://localhost:3000/api/workspaces/' + workspaceId + '/sessions')
      const getParams = Promise.resolve({ workspaceId })
      
      const response = await GET(getRequest, { params: getParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(1)
      expect(data[0]).toHaveProperty('id')
      expect(data[0]).toHaveProperty('workspaceId', workspaceId)
      expect(data[0]).toHaveProperty('model', sessionData.model)
    })
  })
})