// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Learn more: https://jestjs.io/docs/configuration#setupfilesafterenv-array

const fs = require('fs')
const path = require('path')

// Global test setup
beforeEach(() => {
  // Reset any mocks before each test
  jest.clearAllMocks()
})

// Set up environment variables for testing
process.env.NODE_ENV = 'test'
process.env.NEXT_RUNTIME = 'nodejs'

// Global setup to create test directories
beforeAll(() => {
  // Create temp directory for tests if it doesn't exist
  const tmpDir = '/tmp'
  if (!fs.existsSync(tmpDir)) {
    try {
      fs.mkdirSync(tmpDir, { recursive: true, mode: 0o755 })
    } catch (error) {
      console.warn('Could not create /tmp directory:', error.message)
    }
  }
})

// Mock Next.js dynamic imports for ESM compatibility
global.require = require