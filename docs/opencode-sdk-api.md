# @opencode-ai/sdk API Documentation

This document provides a comprehensive overview of the @opencode-ai/sdk TypeScript library, which provides convenient access to the Opencode REST API from server-side TypeScript or JavaScript applications.

## Installation

```bash
npm install @opencode-ai/sdk
```

## Basic Usage

```typescript
import Opencode from '@opencode-ai/sdk';

const client = new Opencode();

// Example: List all sessions
const sessions = await client.session.list();
```

## Client Configuration

### Constructor Options

```typescript
const client = new Opencode({
  maxRetries: 2,        // Default retry attempts (default: 2)
  timeout: 60000,       // Request timeout in milliseconds (default: 60000)
  logLevel: 'warn',     // Log level: 'debug', 'info', 'warn', 'error', 'off'
  logger: customLogger, // Custom logger instance
  fetch: customFetch,   // Custom fetch function
  fetchOptions: {},     // Custom fetch options
});
```

## API Resources

### 1. Event

Manage and retrieve events from the Opencode system.

#### Types
- `EventListResponse` - Response containing list of events

#### Methods
- `client.event.list()` → `EventListResponse`
  - **HTTP**: `GET /event`
  - **Description**: Retrieve a list of events
  - **Streaming**: Supports Server-Sent Events (SSE)

**Example:**
```typescript
// Regular request
const events = await client.event.list();

// Streaming request
const stream = await client.event.list();
for await (const eventListResponse of stream) {
  console.log(eventListResponse);
}
```

### 2. App

Core application management and configuration.

#### Types
- `App` - Application configuration object
- `LogLevel` - Available log levels
- `Mode` - Application modes
- `Model` - AI model configurations
- `Provider` - Service provider configurations
- `AppInitResponse` - App initialization response
- `AppLogResponse` - Logging operation response
- `AppModesResponse` - Available modes response
- `AppProvidersResponse` - Available providers response

#### Methods
- `client.app.get()` → `App`
  - **HTTP**: `GET /app`
  - **Description**: Get current application configuration

- `client.app.init()` → `AppInitResponse`
  - **HTTP**: `POST /app/init`
  - **Description**: Initialize the application

- `client.app.log({ ...params })` → `AppLogResponse`
  - **HTTP**: `POST /log`
  - **Description**: Send log data to the application

- `client.app.modes()` → `AppModesResponse`
  - **HTTP**: `GET /mode`
  - **Description**: Get available application modes

- `client.app.providers()` → `AppProvidersResponse`
  - **HTTP**: `GET /config/providers`
  - **Description**: Get available service providers

**Example:**
```typescript
// Get app configuration
const app = await client.app.get();

// Initialize app
const initResult = await client.app.init();

// Send logs
const logResult = await client.app.log({
  level: 'info',
  message: 'Application started',
  timestamp: new Date().toISOString()
});
```

### 3. Find

Search and discovery functionality for files, symbols, and text content.

#### Types
- `Match` - Search match result
- `Symbol` - Code symbol information
- `FindFilesResponse` - File search results
- `FindSymbolsResponse` - Symbol search results
- `FindTextResponse` - Text search results

#### Methods
- `client.find.files({ ...params })` → `FindFilesResponse`
  - **HTTP**: `GET /find/file`
  - **Description**: Search for files by name or pattern

- `client.find.symbols({ ...params })` → `FindSymbolsResponse`
  - **HTTP**: `GET /find/symbol`
  - **Description**: Search for code symbols (functions, classes, etc.)

- `client.find.text({ ...params })` → `FindTextResponse`
  - **HTTP**: `GET /find`
  - **Description**: Search for text content within files

**Example:**
```typescript
// Find files
const files = await client.find.files({
  pattern: "*.ts",
  directory: "/src"
});

// Find symbols
const symbols = await client.find.symbols({
  query: "function",
  language: "typescript"
});

// Find text
const textMatches = await client.find.text({
  query: "TODO",
  includeContext: true
});
```

### 4. File

File system operations for reading and status checking.

#### Types
- `File` - File object with metadata
- `FileReadResponse` - File content response
- `FileStatusResponse` - File status information

#### Methods
- `client.file.read({ ...params })` → `FileReadResponse`
  - **HTTP**: `GET /file`
  - **Description**: Read file contents

- `client.file.status()` → `FileStatusResponse`
  - **HTTP**: `GET /file/status`
  - **Description**: Get file system status

**Example:**
```typescript
// Read a file
const fileContent = await client.file.read({
  path: "/path/to/file.ts",
  encoding: "utf-8"
});

// Get file status
const status = await client.file.status();
```

### 5. Config

Application configuration management.

#### Types
- `Config` - Main configuration object
- `KeybindsConfig` - Keyboard shortcuts configuration
- `LayoutConfig` - UI layout configuration
- `McpLocalConfig` - Local MCP (Model Context Protocol) configuration
- `McpRemoteConfig` - Remote MCP configuration
- `ModeConfig` - Mode-specific configuration

#### Methods
- `client.config.get()` → `Config`
  - **HTTP**: `GET /config`
  - **Description**: Get current application configuration

**Example:**
```typescript
const config = await client.config.get();
console.log(config.keybinds);
console.log(config.layout);
console.log(config.modes);
```

### 6. Session

Chat session management and messaging functionality.

#### Types
- `Session` - Chat session object
- `Message` - Base message type
- `UserMessage` - User-sent message
- `AssistantMessage` - AI assistant response
- `Part` - Message part (text, file, tool, etc.)
- `TextPart` - Text content part
- `FilePart` - File attachment part
- `ToolPart` - Tool execution part
- `SnapshotPart` - Snapshot part
- `StepStartPart` - Step start indicator
- `StepFinishPart` - Step completion indicator
- `ToolStateCompleted` - Completed tool state
- `ToolStateError` - Error tool state
- `ToolStatePending` - Pending tool state
- `ToolStateRunning` - Running tool state
- Various response types for session operations

#### Methods

**Session Management:**
- `client.session.create()` → `Session`
  - **HTTP**: `POST /session`
  - **Description**: Create a new chat session

- `client.session.list()` → `SessionListResponse`
  - **HTTP**: `GET /session`
  - **Description**: List all sessions

- `client.session.delete(id)` → `SessionDeleteResponse`
  - **HTTP**: `DELETE /session/{id}`
  - **Description**: Delete a specific session

**Session Operations:**
- `client.session.init(id, { ...params })` → `SessionInitResponse`
  - **HTTP**: `POST /session/{id}/init`
  - **Description**: Initialize a session with context

- `client.session.chat(id, { ...params })` → `AssistantMessage`
  - **HTTP**: `POST /session/{id}/message`
  - **Description**: Send a message and get AI response

- `client.session.messages(id)` → `SessionMessagesResponse`
  - **HTTP**: `GET /session/{id}/message`
  - **Description**: Get all messages in a session

- `client.session.abort(id)` → `SessionAbortResponse`
  - **HTTP**: `POST /session/{id}/abort`
  - **Description**: Abort an ongoing session operation

**Session Sharing:**
- `client.session.share(id)` → `Session`
  - **HTTP**: `POST /session/{id}/share`
  - **Description**: Share a session publicly

- `client.session.unshare(id)` → `Session`
  - **HTTP**: `DELETE /session/{id}/share`
  - **Description**: Remove public sharing from a session

**Session Analysis:**
- `client.session.summarize(id, { ...params })` → `SessionSummarizeResponse`
  - **HTTP**: `POST /session/{id}/summarize`
  - **Description**: Generate a summary of the session

**Example:**
```typescript
// Create a new session
const session = await client.session.create();

// Initialize session with context
await client.session.init(session.id, {
  context: "Working on a TypeScript project",
  files: ["/src/app.ts", "/src/utils.ts"]
});

// Send a message
const response = await client.session.chat(session.id, {
  message: "Help me refactor this function",
  attachments: [
    {
      type: "file",
      path: "/src/utils.ts"
    }
  ]
});

// Get all messages
const messages = await client.session.messages(session.id);

// Share the session
await client.session.share(session.id);

// Generate summary
const summary = await client.session.summarize(session.id, {
  includeCode: true,
  maxLength: 500
});
```

## Error Handling

The SDK provides comprehensive error handling with specific error types:

```typescript
import Opencode from '@opencode-ai/sdk';

try {
  const sessions = await client.session.list();
} catch (err) {
  if (err instanceof Opencode.APIError) {
    console.log(`Error ${err.status}: ${err.name}`);
    console.log(err.headers);
  } else {
    throw err;
  }
}
```

### Error Types

| Status Code | Error Type                 |
|-------------|---------------------------|
| 400         | `BadRequestError`         |
| 401         | `AuthenticationError`     |
| 403         | `PermissionDeniedError`   |
| 404         | `NotFoundError`           |
| 422         | `UnprocessableEntityError`|
| 429         | `RateLimitError`          |
| >=500       | `InternalServerError`     |
| N/A         | `APIConnectionError`      |

### Shared Error Types
- `MessageAbortedError` - Message processing was aborted
- `ProviderAuthError` - Provider authentication failed
- `UnknownError` - Unexpected error occurred

## Advanced Features

### Streaming Responses

The SDK supports Server-Sent Events (SSE) for real-time data:

```typescript
const stream = await client.event.list();
for await (const event of stream) {
  console.log(event);
}

// Cancel stream
stream.controller.abort();
```

### Raw Response Access

Access raw HTTP response data:

```typescript
// Get raw response
const response = await client.session.list().asResponse();
console.log(response.headers.get('X-Custom-Header'));

// Get both parsed data and raw response
const { data: sessions, response: raw } = await client.session.list().withResponse();
```

### Custom Requests

Make requests to undocumented endpoints:

```typescript
await client.post('/custom/endpoint', {
  body: { customParam: 'value' },
  query: { filter: 'active' }
});
```

## TypeScript Support

The SDK is fully typed with TypeScript definitions:

```typescript
import Opencode from '@opencode-ai/sdk';

// All types are available under the Opencode namespace
const sessions: Opencode.SessionListResponse = await client.session.list();
const config: Opencode.Config = await client.config.get();
```

## Runtime Support

The SDK supports multiple JavaScript runtimes:
- **Browsers**: Chrome, Firefox, Safari, Edge
- **Node.js**: 20 LTS or later
- **Deno**: v1.28.0 or higher
- **Bun**: 1.0 or later
- **Edge Runtimes**: Cloudflare Workers, Vercel Edge Runtime
- **Testing**: Jest 28+ with "node" environment

## Best Practices

1. **Error Handling**: Always wrap API calls in try-catch blocks
2. **Timeouts**: Configure appropriate timeouts for your use case
3. **Retries**: Use the built-in retry mechanism for resilient applications
4. **Streaming**: Use streaming for real-time data when available
5. **Type Safety**: Leverage TypeScript types for better development experience
6. **Resource Management**: Properly clean up streams and abort operations when needed

## Examples

### Complete Chat Session Example

```typescript
import Opencode from '@opencode-ai/sdk';

const client = new Opencode();

async function createChatSession() {
  try {
    // Create session
    const session = await client.session.create();
    
    // Initialize with context
    await client.session.init(session.id, {
      context: "Code review session",
      files: ["/src/main.ts"]
    });
    
    // Send message
    const response = await client.session.chat(session.id, {
      message: "Please review this code for potential improvements"
    });
    
    console.log('AI Response:', response.content);
    
    // Get session summary
    const summary = await client.session.summarize(session.id);
    console.log('Session Summary:', summary);
    
  } catch (error) {
    if (error instanceof Opencode.APIError) {
      console.error(`API Error: ${error.status} - ${error.message}`);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}
```

### File Search and Analysis Example

```typescript
async function analyzeProject() {
  // Find TypeScript files
  const files = await client.find.files({
    pattern: "**/*.ts",
    exclude: ["node_modules", "dist"]
  });
  
  // Find TODO comments
  const todos = await client.find.text({
    query: "TODO|FIXME",
    regex: true
  });
  
  // Find function definitions
  const functions = await client.find.symbols({
    type: "function",
    language: "typescript"
  });
  
  console.log(`Found ${files.length} TypeScript files`);
  console.log(`Found ${todos.length} TODO items`);
  console.log(`Found ${functions.length} functions`);
}
```

This documentation covers the complete API surface of the @opencode-ai/sdk library. For the most up-to-date information, refer to the [official repository](https://github.com/sst/opencode-sdk-js) and [API documentation](https://opencode.ai/docs).