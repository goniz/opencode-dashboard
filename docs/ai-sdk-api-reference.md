# AI SDK API Reference

This document provides a comprehensive overview of the AI SDK (`ai`) and `@ai-sdk/react` libraries for building AI-powered applications.

## Overview

The AI SDK is a TypeScript toolkit designed to help you build AI-powered applications using popular frameworks like Next.js, React, Svelte, Vue and runtimes like Node.js. It consists of three main modules:

- **AI SDK Core**: Unified API to interact with model providers
- **AI SDK UI**: Framework-agnostic hooks for building chatbots and generative UIs
- **AI SDK RSC**: React Server Components integration

## Installation

```bash
# Core AI SDK
npm install ai

# Provider-specific packages
npm install @ai-sdk/openai
npm install @ai-sdk/anthropic
npm install @ai-sdk/google

# Framework-specific UI packages
npm install @ai-sdk/react
npm install @ai-sdk/svelte
npm install @ai-sdk/vue
```

## AI SDK Core

### Core Functions

#### `generateText()`
Generates text using a language model.

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const { text } = await generateText({
  model: openai('gpt-4o'),
  system: 'You are a helpful assistant.',
  prompt: 'Why is the sky blue?',
});
```

**Parameters:**
- `model`: Language model instance
- `system`: System prompt (optional)
- `prompt`: User prompt
- `messages`: Array of messages (alternative to prompt)
- `tools`: Available tools for the model
- `maxTokens`: Maximum tokens to generate
- `temperature`: Sampling temperature (0-2)
- `topP`: Nucleus sampling parameter
- `seed`: Random seed for reproducible outputs

**Returns:**
- `text`: Generated text string
- `finishReason`: Reason generation stopped
- `usage`: Token usage information
- `warnings`: Any warnings from the model

#### `streamText()`
Streams text generation in real-time.

```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = streamText({
  model: openai('gpt-4o'),
  prompt: 'Write a story about a robot.',
});

for await (const delta of result.textStream) {
  process.stdout.write(delta);
}
```

**Parameters:** Same as `generateText()`

**Returns:**
- `textStream`: Async iterable of text chunks
- `fullStream`: Stream with additional metadata
- `toDataStreamResponse()`: Convert to HTTP response
- `toUIMessageStreamResponse()`: Convert to UI message stream

#### `generateObject()`
Generates structured data using JSON schema.

```typescript
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    name: z.string(),
    age: z.number(),
  }),
  prompt: 'Generate a person profile.',
});
```

#### `streamObject()`
Streams structured data generation.

```typescript
import { streamObject } from 'ai';

const { partialObjectStream } = streamObject({
  model: openai('gpt-4o'),
  schema: mySchema,
  prompt: 'Generate data...',
});

for await (const partialObject of partialObjectStream) {
  console.log(partialObject);
}
```

### Model Providers

#### OpenAI
```typescript
import { openai } from '@ai-sdk/openai';

const model = openai('gpt-4o', {
  apiKey: process.env.OPENAI_API_KEY,
});
```

#### Anthropic
```typescript
import { anthropic } from '@ai-sdk/anthropic';

const model = anthropic('claude-3-sonnet-20240229');
```

#### Google
```typescript
import { google } from '@ai-sdk/google';

const model = google('gemini-pro');
```

### Tools and Function Calling

```typescript
import { generateText, tool } from 'ai';
import { z } from 'zod';

const weatherTool = tool({
  description: 'Get weather information',
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => {
    // Fetch weather data
    return { temperature: 72, condition: 'sunny' };
  },
});

const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'What is the weather in San Francisco?',
  tools: {
    getWeather: weatherTool,
  },
});
```

## AI SDK UI (@ai-sdk/react)

### Core Hooks

#### `useChat()`
Manages chat state and streaming for conversational interfaces.

```typescript
import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
  } = useChat({
    api: '/api/chat',
    initialMessages: [],
    onResponse: (response) => {
      console.log('Received response:', response);
    },
    onFinish: (message) => {
      console.log('Finished:', message);
    },
    onError: (error) => {
      console.error('Error:', error);
    },
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          <strong>{message.role}:</strong>
          {message.content}
        </div>
      ))}
      
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
}
```

**Parameters:**
- `api`: API endpoint for chat
- `initialMessages`: Initial message history
- `id`: Chat session ID
- `body`: Additional request body data
- `headers`: Custom headers
- `onResponse`: Response callback
- `onFinish`: Completion callback
- `onError`: Error callback
- `sendExtraMessageFields`: Include extra message fields

**Returns:**
- `messages`: Array of chat messages
- `input`: Current input value
- `handleInputChange`: Input change handler
- `handleSubmit`: Form submit handler
- `isLoading`: Loading state
- `error`: Error state
- `reload`: Reload last message
- `stop`: Stop current generation
- `append`: Add message programmatically
- `setMessages`: Set messages directly

#### `useCompletion()`
Handles text completion with streaming.

```typescript
import { useCompletion } from '@ai-sdk/react';

export default function Completion() {
  const {
    completion,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useCompletion({
    api: '/api/completion',
  });

  return (
    <div>
      <div>{completion}</div>
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Enter prompt..."
        />
        <button type="submit">Complete</button>
      </form>
    </div>
  );
}
```

**Returns:**
- `completion`: Current completion text
- `complete`: Trigger completion programmatically
- `setCompletion`: Set completion directly
- `stop`: Stop current completion

#### `useObject()`
Streams structured object generation.

```typescript
import { useObject } from '@ai-sdk/react';

export default function ObjectGeneration() {
  const { object, submit, isLoading } = useObject({
    api: '/api/object',
    schema: z.object({
      name: z.string(),
      ingredients: z.array(z.string()),
    }),
  });

  return (
    <div>
      <button onClick={() => submit('Generate a recipe')}>
        Generate Recipe
      </button>
      
      {object && (
        <div>
          <h3>{object.name}</h3>
          <ul>
            {object.ingredients?.map((ingredient, i) => (
              <li key={i}>{ingredient}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Message Types

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt?: Date;
  toolInvocations?: ToolInvocation[];
}

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: any;
  result?: any;
}
```

## Server-Side Implementation

### Next.js App Router API Route

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    system: 'You are a helpful assistant.',
  });

  return result.toUIMessageStreamResponse();
}
```

### Tool Integration

```typescript
// app/api/chat/route.ts
import { streamText, tool } from 'ai';
import { z } from 'zod';

const tools = {
  weather: tool({
    description: 'Get weather information',
    parameters: z.object({
      location: z.string(),
    }),
    execute: async ({ location }) => {
      // Implementation
      return { temperature: 72 };
    },
  }),
};

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    tools,
    toolCallStreaming: true,
  });

  return result.toUIMessageStreamResponse();
}
```

## Advanced Features

### Middleware
Add custom logic to model calls.

```typescript
import { generateText } from 'ai';

const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Hello',
  experimental_middleware: [
    {
      wrapGenerate: async ({ doGenerate, params }) => {
        console.log('Before generation:', params);
        const result = await doGenerate();
        console.log('After generation:', result);
        return result;
      },
    },
  ],
});
```

### Error Handling

```typescript
import { APICallError, InvalidResponseDataError } from 'ai';

try {
  const result = await generateText({
    model: openai('gpt-4o'),
    prompt: 'Hello',
  });
} catch (error) {
  if (APICallError.isAPICallError(error)) {
    console.log('API call failed:', error.message);
  } else if (InvalidResponseDataError.isInvalidResponseDataError(error)) {
    console.log('Invalid response:', error.message);
  }
}
```

### Telemetry

```typescript
import { generateText } from 'ai';

const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Hello',
  experimental_telemetry: {
    isEnabled: true,
    recordInputs: true,
    recordOutputs: true,
  },
});
```

## Framework Support

The AI SDK UI supports multiple frameworks:

| Framework | Package | useChat | useCompletion | useObject |
|-----------|---------|---------|---------------|-----------|
| React | `@ai-sdk/react` | ✅ | ✅ | ✅ |
| Svelte | `@ai-sdk/svelte` | ✅ | ✅ | ✅ |
| Vue.js | `@ai-sdk/vue` | ✅ | ✅ | ✅ |
| Angular | `@ai-sdk/angular` | ✅ | ✅ | ✅ |

## Best Practices

### 1. Environment Variables
Store API keys securely:

```bash
OPENAI_API_KEY=your_api_key_here
ANTHROPIC_API_KEY=your_api_key_here
```

### 2. Error Boundaries
Wrap AI components in error boundaries:

```typescript
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error }) {
  return <div>Something went wrong: {error.message}</div>;
}

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <ChatComponent />
</ErrorBoundary>
```

### 3. Rate Limiting
Implement rate limiting for API calls:

```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Hello',
  experimental_providerMetadata: {
    openai: {
      user: 'user-123', // For rate limiting
    },
  },
});
```

### 4. Streaming Performance
Use streaming for better user experience:

```typescript
// Prefer streaming for long responses
const { textStream } = streamText({
  model: openai('gpt-4o'),
  prompt: 'Write a long story...',
});
```

## Common Patterns

### 1. Chat with Memory
```typescript
const { messages, append } = useChat({
  api: '/api/chat',
  initialMessages: [
    { id: '1', role: 'system', content: 'You are a helpful assistant.' }
  ],
});
```

### 2. Function Calling UI
```typescript
const { messages } = useChat({
  api: '/api/chat',
  onToolCall: ({ toolCall }) => {
    console.log('Tool called:', toolCall);
  },
});
```

### 3. Custom Message Rendering
```typescript
{messages.map((message) => (
  <div key={message.id}>
    {message.toolInvocations?.map((tool) => (
      <ToolResult key={tool.toolCallId} tool={tool} />
    ))}
    <MessageContent content={message.content} />
  </div>
))}
```

## Current Project Usage

Based on the current codebase analysis:

### Dependencies Used
- `@ai-sdk/openai`: ^1.3.23
- `@assistant-ui/react`: ^0.10.27
- `@assistant-ui/react-ai-sdk`: ^0.10.16
- `ai`: ^4.3.19

### Implementation Pattern
The project uses:
1. **Backend**: `streamText()` with OpenAI in `/api/chat/route.ts`
2. **Frontend**: `useChatRuntime()` from `@assistant-ui/react-ai-sdk`
3. **UI Components**: Custom Thread and ThreadList components

### Example from Current Codebase

**API Route** (`src/app/api/chat/route.ts:1-24`):
```typescript
import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    toolCallStreaming: true,
    system,
    tools: {
      ...frontendTools(tools),
    },
  });

  return result.toDataStreamResponse();
}
```

**Frontend Component** (`src/app/assistant.tsx:1-22`):
```typescript
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

export const Assistant = () => {
  const runtime = useChatRuntime({
    api: "/api/chat",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="grid h-dvh grid-cols-[200px_1fr] gap-x-2 px-4 py-4">
        <ThreadList />
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
};
```

This documentation provides a comprehensive reference for using the AI SDK in your applications. For the most up-to-date information, refer to the [official AI SDK documentation](https://ai-sdk.dev/docs).