import { NextRequest } from 'next/server'
import { GET, DELETE } from '../../src/app/api/workspaces/[workspaceId]/route'
import { generateTestId } from '../setup/test-utils'

// Mock the workspace manager to avoid OpenCode CLI issues in tests
const mockWorkspaces = new Map()

jest.mock('@/lib/opencode-workspace', () => ({
  workspaceManager: {
    getWorkspace: jest.fn((id: string) => mockWorkspaces.get(id)),
    stopWorkspace: jest.fn((id: string) => {
      if (!mockWorkspaces.has(id)) {
        throw new Error('Workspace not found')
      }
      mockWorkspaces.delete(id)
      return Promise.resolve()
    }),
  }
}))

describe('/api/workspaces/[workspaceId] (Direct Import)', () => {
  let workspaceId: string

  beforeEach(() => {
    // Clear all mocks and create a test workspace
    jest.clearAllMocks()
    mockWorkspaces.clear()
    
    workspaceId = `test-workspace-${generateTestId()}`
    mockWorkspaces.set(workspaceId, {
      id: workspaceId,
      folder: `/tmp/test-${workspaceId}`,
      port: 8080,
      status: 'running',
      sessions: new Map(),
    })
  })

  describe('GET /api/workspaces/[workspaceId]', () => {
    it('should return workspace details for valid workspace ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/workspaces/' + workspaceId)
      const params = Promise.resolve({ workspaceId })
      
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('id', workspaceId)
      expect(data).toHaveProperty('folder')
      expect(data).toHaveProperty('port')
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('sessions')
      expect(Array.isArray(data.sessions)).toBe(true)
    })

    it('should return 404 for non-existent workspace ID', async () => {
      const nonExistentId = `workspace_${generateTestId()}`
      const request = new NextRequest('http://localhost:3000/api/workspaces/' + nonExistentId)
      const params = Promise.resolve({ workspaceId: nonExistentId })
      
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toHaveProperty('error', 'Workspace not found')
    })

    it('should handle invalid workspace ID format gracefully', async () => {
      const invalidId = 'invalid-workspace-id'
      const request = new NextRequest('http://localhost:3000/api/workspaces/' + invalidId)
      const params = Promise.resolve({ workspaceId: invalidId })
      
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toHaveProperty('error', 'Workspace not found')
    })
  })

  describe('DELETE /api/workspaces/[workspaceId]', () => {
    it('should successfully delete an existing workspace', async () => {
      // Verify workspace exists first
      const getRequest = new NextRequest('http://localhost:3000/api/workspaces/' + workspaceId)
      const getParams = Promise.resolve({ workspaceId })
      const getResponse = await GET(getRequest, { params: getParams })
      expect(getResponse.status).toBe(200)

      // Delete the workspace
      const deleteRequest = new NextRequest('http://localhost:3000/api/workspaces/' + workspaceId, { method: 'DELETE' })
      const deleteParams = Promise.resolve({ workspaceId })
      const deleteResponse = await DELETE(deleteRequest, { params: deleteParams })
      const deleteData = await deleteResponse.json()

      expect(deleteResponse.status).toBe(200)
      expect(deleteData).toHaveProperty('success', true)

      // Verify workspace no longer exists
      const verifyRequest = new NextRequest('http://localhost:3000/api/workspaces/' + workspaceId)
      const verifyParams = Promise.resolve({ workspaceId })
      const verifyResponse = await GET(verifyRequest, { params: verifyParams })
      expect(verifyResponse.status).toBe(404)
    })

    it('should handle deletion of non-existent workspace gracefully', async () => {
      const nonExistentId = `workspace_${generateTestId()}`
      const request = new NextRequest('http://localhost:3000/api/workspaces/' + nonExistentId, { method: 'DELETE' })
      const params = Promise.resolve({ workspaceId: nonExistentId })
      
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500) // stopWorkspace throws error for non-existent workspace
      expect(data).toHaveProperty('error', 'Failed to delete workspace')
    })

    it('should handle invalid workspace ID format gracefully', async () => {
      const invalidId = 'invalid-workspace-id'
      const request = new NextRequest('http://localhost:3000/api/workspaces/' + invalidId, { method: 'DELETE' })
      const params = Promise.resolve({ workspaceId: invalidId })
      
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500) // stopWorkspace throws error for non-existent workspace
      expect(data).toHaveProperty('error', 'Failed to delete workspace')
    })
  })
})