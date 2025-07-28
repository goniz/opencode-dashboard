import request from 'supertest'
import { startTestServer, stopTestServer } from '../setup/test-server'
import { mockWorkspaceData, cleanupWorkspace, generateTestId, ensureWorkspaceDirectory } from '../setup/test-utils'

describe('/api/workspaces', () => {
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

  describe('POST /api/workspaces', () => {
    it('should create a new workspace with valid data', async () => {
      const testData = {
        ...mockWorkspaceData,
        folder: `/tmp/test-workspace-${generateTestId()}`
      }

      // Ensure the test directory exists before creating workspace
      ensureWorkspaceDirectory(testData.folder)

      const response = await request(baseURL)
        .post('/api/workspaces')
        .send(testData)
        .expect(200)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('folder', testData.folder)
      expect(response.body).toHaveProperty('model', testData.model)
      expect(response.body).toHaveProperty('port')
      expect(response.body).toHaveProperty('status')
      expect(response.body).toHaveProperty('sessions')
      expect(Array.isArray(response.body.sessions)).toBe(true)

      createdWorkspaceIds.push(response.body.id)
    })

    it('should return 400 when folder is missing', async () => {
      const invalidData = {
        model: mockWorkspaceData.model
        // folder is missing
      }

      const response = await request(baseURL)
        .post('/api/workspaces')
        .send(invalidData)
        .expect(400)

      expect(response.body).toHaveProperty('error', 'Folder path is required')
    })

    it('should return 400 when model is missing', async () => {
      const invalidData = {
        folder: mockWorkspaceData.folder
        // model is missing
      }

      const response = await request(baseURL)
        .post('/api/workspaces')
        .send(invalidData)
        .expect(400)

      expect(response.body).toHaveProperty('error', 'Model is required')
    })

    it('should return 400 when both folder and model are missing', async () => {
      const response = await request(baseURL)
        .post('/api/workspaces')
        .send({})
        .expect(400)

      expect(response.body).toHaveProperty('error', 'Folder path is required')
    })
  })

  describe('GET /api/workspaces', () => {
    it('should return empty array when no workspaces exist', async () => {
      const response = await request(baseURL)
        .get('/api/workspaces')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should return list of workspaces when they exist', async () => {
      // Create a test workspace first
      const testData = {
        ...mockWorkspaceData,
        folder: `/tmp/test-workspace-${generateTestId()}`
      }

      // Ensure the test directory exists before creating workspace
      ensureWorkspaceDirectory(testData.folder)

      const createResponse = await request(baseURL)
        .post('/api/workspaces')
        .send(testData)
        .expect(200)

      createdWorkspaceIds.push(createResponse.body.id)

      // Get all workspaces
      const response = await request(baseURL)
        .get('/api/workspaces')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      
      const workspace = response.body.find((w: any) => w.id === createResponse.body.id)
      expect(workspace).toBeDefined()
      expect(workspace).toHaveProperty('id')
      expect(workspace).toHaveProperty('folder')
      expect(workspace).toHaveProperty('model')
      expect(workspace).toHaveProperty('port')
      expect(workspace).toHaveProperty('status')
      expect(workspace).toHaveProperty('sessions')
    })
  })
})