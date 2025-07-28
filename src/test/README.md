# Testing Setup

This directory contains test utilities and setup files for the opencode-dashboard project.

## Files

- `setup.ts` - Global test setup and configuration
- `opencode-server.ts` - Utilities for starting real opencode servers for integration tests

## Running Tests

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

Tests are located alongside the source files they test, using the `__tests__` directory pattern:

```
src/lib/
├── opencode-client.ts
├── opencode-workspace.ts
├── utils.ts
└── __tests__/
    ├── opencode-client.test.ts
    ├── opencode-workspace.test.ts
    └── utils.test.ts
```

## Integration Tests

Some tests require the actual `opencode` CLI to be installed and available in your PATH. These tests:

1. Start a real opencode server using `spawn('opencode', ['serve', '--port=0'])`
2. Create a temporary directory for the workspace
3. Test the actual client functionality against the real server
4. Clean up the server and temporary files after tests complete

If you don't have the `opencode` CLI installed, these integration tests will fail, but the unit tests will still pass.

## Test Utilities

### `startTestOpenCodeServer()`

Starts a real opencode server for integration testing:

```typescript
import { startTestOpenCodeServer } from '../test/opencode-server';

const testServer = await startTestOpenCodeServer();
// Use testServer.client for API calls
// Use testServer.tempDir for workspace operations
await testServer.cleanup(); // Clean up when done
```

### `waitForServerReady(client)`

Waits for an opencode server to be ready to accept requests:

```typescript
import { waitForServerReady } from '../test/opencode-server';

await waitForServerReady(client);
// Server is now ready for API calls
```

## Mocking

The test setup includes automatic mocking of console methods to reduce noise during test runs. You can access the mocked functions via `vi.fn()` if needed for assertions.

## Configuration

Test configuration is in `vitest.config.ts` at the project root. Key settings:

- Environment: jsdom (for React component testing)
- Setup files: `src/test/setup.ts`
- Path aliases: `@/` maps to `src/`
- Global test functions available without imports