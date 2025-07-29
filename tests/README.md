# OpenCode Dashboard API Tests

This directory contains Python-based API tests for the OpenCode Dashboard web application using pytest.

## Prerequisites

- Python 3.8+ and pip
- [opencode CLI](https://www.npmjs.com/package/opencode-ai) installed globally: `npm install -g opencode-ai@latest`
- Node.js and npm for running the web app

## Installation

Install test dependencies:

```bash
# Install test dependencies
npm run test:install

# Or install directly with pip
pip install -r requirements-test.txt
```

## Running Tests

### Basic Usage

```bash
# Run all tests
npm run test

# Run with verbose output
npm run test:verbose

# Run only API tests (excludes slow integration tests)
npm run test:api

# Run only integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

### Direct pytest Usage

```bash
# Using pytest directly (after installing dependencies)
python3 -m pytest

# Run specific test files
python3 -m pytest tests/test_workspaces.py

# Run specific test methods
python3 -m pytest tests/test_workspaces.py::TestWorkspaces::test_create_workspace_success

# Run with markers
python3 -m pytest -m "not slow"  # Skip slow tests
python3 -m pytest -m "api"       # Only API tests
python3 -m pytest -m "integration"  # Only integration tests
```

## Test Structure

### Test Files

- `test_workspaces.py` - Tests for workspace creation, listing, and management
- `test_sessions.py` - Tests for session operations within workspaces
- `test_chat.py` - Tests for chat API operations (marked as slow)
- `test_integration.py` - End-to-end integration tests and other endpoints

### Test Infrastructure

- `conftest.py` - Pytest configuration and shared fixtures
- `__init__.py` - Python package marker

### Key Fixtures

- `server_manager` - Manages the Next.js test server lifecycle
- `client` - Async HTTP client for API requests
- `test_workspace` - Creates a test workspace for tests
- `test_session` - Creates a test session within a workspace
- `test_folder` - Provides a temporary folder path for workspace creation

## Test Flow

1. **Server Startup**: The test suite automatically starts a Next.js development server on a free port
2. **Test Execution**: Tests make HTTP requests to the running server
3. **Cleanup**: Server is automatically stopped after all tests complete

## Important Notes

### OpenCode CLI Requirement

Some tests (especially chat-related) require the opencode CLI to be installed globally:

```bash
npm install -g opencode-ai@latest
```

Without this, chat tests may fail with connection errors, which is expected behavior.

### Test Environment Isolation

- Each test run uses a temporary directory for workspace folders
- Tests clean up after themselves where possible
- The test server runs on a dynamically allocated port to avoid conflicts

### Markers

Tests are marked with the following pytest markers:

- `@pytest.mark.api` - Standard API tests
- `@pytest.mark.integration` - Integration tests that test complete workflows
- `@pytest.mark.slow` - Tests that may take longer to complete (like chat operations)

### Expected Behaviors

- **Workspace Creation**: Should work reliably
- **Session Creation**: Should work reliably  
- **Chat Operations**: May fail in test environments without proper OpenCode CLI setup
- **Error Handling**: Tests verify proper HTTP status codes and error messages

## Configuration

### Configuration Files

The test configuration is defined in:

- `pyproject.toml` - Pytest options and markers (when using uv)
- `requirements-test.txt` - Python dependencies for testing
- `conftest.py` - Pytest fixtures and test infrastructure

### Environment Variables

The test server can be configured with:

- `PORT` - Server port (automatically set by test infrastructure)
- `NODE_ENV=test` - Set automatically during testing

## Troubleshooting

### Common Issues

1. **Server startup failures**: Check that the Next.js app can start normally with `npm run dev`
2. **Chat test failures**: Ensure opencode CLI is installed globally
3. **Port conflicts**: Test infrastructure automatically finds free ports
4. **Permission errors**: Ensure write access to temporary directories

### Debug Mode

For debugging tests:

```bash
# Run with verbose output and no capture
uv run pytest -v -s

# Run a single test with debugging
uv run pytest -v -s tests/test_workspaces.py::TestWorkspaces::test_create_workspace_success
```

### Logs

- Server logs are captured during startup
- HTTP request/response details can be seen with verbose mode
- Failed tests show detailed assertion information

## Contributing

When adding new API endpoints:

1. Add corresponding test files following the naming pattern `test_*.py`
2. Use appropriate markers (`@pytest.mark.api`, etc.)
3. Follow the existing test structure with proper setup/teardown
4. Document any special requirements or expected behaviors