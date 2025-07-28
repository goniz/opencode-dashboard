// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Learn more: https://jestjs.io/docs/configuration#setupfilesafterenv-array

const fs = require('fs')
const path = require('path')

// Set up environment variables for testing
process.env.NODE_ENV = 'test'
process.env.NEXT_RUNTIME = 'nodejs'

// Fix global exports issue for ESM compatibility
if (typeof global.exports === 'undefined') {
  global.exports = {}
}

// Mock Next.js dynamic imports for ESM compatibility
global.require = require

// Global test setup
beforeEach(() => {
  // Reset any mocks before each test
  jest.clearAllMocks()
})

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
  
  // Suppress console warnings for cleaner test output
  const originalWarn = console.warn
  console.warn = (...args) => {
    const message = args.join(' ')
    // Filter out known harmless warnings
    if (
      message.includes('webpack.cache.PackFileCacheStrategy') ||
      message.includes('ExperimentalWarning: VM Modules')
    ) {
      return
    }
    originalWarn.apply(console, args)
  }
})