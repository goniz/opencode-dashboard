import { NextRequest } from 'next/server'
import { POST, GET } from '../../src/app/api/workspaces/route'
import { ensureWorkspaceDirectory, generateTestId } from '../setup/test-utils'

// Mock the workspace manager to avoid OpenCode CLI issues in tests
jest.mock('@/lib/opencode-workspace', () => ({
  workspaceManager: {
    startWorkspace: jest.fn().mockImplementation((config) => Promise.resolve({
      id: 'test-workspace-123',
      folder: config.folder,
      model: config.model,
      port: 8080,
      status: 'running',
      sessions: new Map(),
    })),
    getAllWorkspaces: jest.fn().mockReturnValue([]),
  }
}))

describe('/api/workspaces (Direct Import)', () => {
  describe('POST /api/workspaces', () => {
    it('should create a new workspace with valid data', async () => {
      const testData = {
        folder: `/tmp/test-workspace-${generateTestId()}`,
        model: 'anthropic/claude-3-sonnet-20240229'
      }

      // Ensure the test directory exists
      ensureWorkspaceDirectory(testData.folder)

      const request = new NextRequest('http://localhost:3000/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('folder', testData.folder)
      expect(data).toHaveProperty('model', testData.model)
      expect(data).toHaveProperty('port')
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('sessions')
    })

    it('should return 400 when folder is missing', async () => {
      const invalidData = {
        model: 'anthropic/claude-3-sonnet-20240229'
        // folder is missing
      }

      const request = new NextRequest('http://localhost:3000/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error', 'Folder path is required')
    })

    it('should return 400 when model is missing', async () => {
      const invalidData = {
        folder: '/tmp/test-workspace'
        // model is missing
      }

      const request = new NextRequest('http://localhost:3000/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error', 'Model is required')
    })
  })

  describe('GET /api/workspaces', () => {
    it('should return empty array when no workspaces exist', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(0)
    })
  })
})