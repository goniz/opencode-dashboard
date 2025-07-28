// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Learn more: https://jestjs.io/docs/configuration#setupfilesafterenv-array

// Global test setup
beforeEach(() => {
  // Reset any mocks before each test
  jest.clearAllMocks()
})

// Set up environment variables for testing
process.env.NODE_ENV = 'test'