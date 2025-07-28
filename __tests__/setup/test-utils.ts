import request from 'supertest'
import fs from 'fs'
import path from 'path'

// Ensure test directories exist
function ensureTestDirectory(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 })
    }
  } catch (error) {
    console.warn(`Could not create test directory ${dirPath}:`, error)
  }
}

// Mock data for testing
export const mockWorkspaceData = {
  folder: '/tmp/test-workspace',
  model: 'anthropic/claude-3-sonnet-20240229'
}

export const mockSessionData = {
  model: 'anthropic/claude-3-sonnet-20240229'
}

export const mockChatMessage = {
  messages: [
    {
      role: 'user',
      content: 'Hello, this is a test message'
    }
  ],
  stream: false
}

// Helper function to create a workspace and return its ID
export async function createTestWorkspace(baseURL: string): Promise<string> {
  // Ensure the test directory exists before creating workspace
  ensureTestDirectory(mockWorkspaceData.folder)
  
  const response = await request(baseURL)
    .post('/api/workspaces')
    .send(mockWorkspaceData)
    .expect(200)

  return response.body.id
}

// Helper function to create a session and return its ID
export async function createTestSession(baseURL: string, workspaceId: string): Promise<string> {
  const response = await request(baseURL)
    .post(`/api/workspaces/${workspaceId}/sessions`)
    .send(mockSessionData)
    .expect(200)

  return response.body.id
}

// Helper function to clean up workspace
export async function cleanupWorkspace(baseURL: string, workspaceId: string): Promise<void> {
  try {
    await request(baseURL)
      .delete(`/api/workspaces/${workspaceId}`)
      .expect(200)
  } catch (error) {
    // Ignore cleanup errors in tests
    console.warn(`Failed to cleanup workspace ${workspaceId}:`, error)
  }
}

// Helper to wait for a condition with timeout
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now()
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  
  throw new Error(`Condition not met within ${timeout}ms`)
}

// Helper to generate unique test identifiers
export function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// Helper function to ensure workspace directory exists
export function ensureWorkspaceDirectory(folderPath: string): void {
  ensureTestDirectory(folderPath)
}