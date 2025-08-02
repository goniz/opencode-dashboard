# Assistant-UI LocalRuntime Migration Plan

## Overview

This plan outlines the migration from the current `useChatRuntime` (AI SDK) implementation to `LocalRuntime` from assistant-ui for better control over chat state management and integration with OpenCode sessions.

## Current Architecture Analysis

### Current Implementation
- **Runtime**: `useChatRuntime` from `@assistant-ui/react-ai-sdk`
- **Backend**: `/api/opencode-chat` route handling both streaming and non-streaming
- **Message Conversion**: Custom converter between OpenCode and useChat message formats
- **State Management**: AI SDK handles state internally
- **Session Management**: Manual session switching with message reloading

### Current Flow
1. User selects OpenCode session
2. Messages loaded from OpenCode API via `/api/opencode-chat` GET
3. Messages converted from OpenCode format to useChat format
4. Chat runtime initialized with converted messages
5. New messages sent via `/api/opencode-chat` POST
6. Manual sync required to get latest messages from OpenCode

## Target Architecture

### New Implementation
- **Runtime**: `LocalRuntime` from `@assistant-ui/react`
- **Backend**: Custom `ChatModelAdapter` that communicates with OpenCode
- **Message Management**: Built-in state management with automatic features
- **Session Persistence**: Thread history adapter for OpenCode session persistence
- **Multi-Session Support**: Thread list adapter for managing multiple OpenCode sessions

### Benefits of Migration
1. **Better State Management**: Built-in message editing, branching, and reloading
2. **Automatic Features**: No manual sync needed - real-time updates
3. **Thread Management**: Native support for multiple conversation threads
4. **Extensibility**: Adapter system for attachments, speech, feedback
5. **Consistency**: Standard assistant-ui patterns and behaviors

## Migration Plan

### Phase 1: Core LocalRuntime Setup

#### 1.1 Create OpenCode Chat Model Adapter
**File**: `src/lib/adapters/opencode-chat-adapter.ts`

```typescript
import type { ChatModelAdapter, ChatModelRunOptions, ChatModelRunResult } from "@assistant-ui/react";
import { parseModelString } from "@/lib/utils";
import { messageConverter } from "@/lib/message-converter";

export class OpenCodeChatAdapter implements ChatModelAdapter {
  constructor(
    private sessionId: string,
    private model: string,
    private provider: string
  ) {}

  async *run({ messages, abortSignal }: ChatModelRunOptions): AsyncGenerator<ChatModelRunResult> {
    // Convert assistant-ui messages to OpenCode format
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      throw new Error("Last message must be from user");
    }

    // Extract text content from message
    const messageContent = Array.isArray(lastMessage.content)
      ? lastMessage.content.filter(c => c.type === "text").map(c => c.text).join(" ")
      : lastMessage.content;

    // Call OpenCode API with streaming
    const response = await fetch("/api/opencode-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: this.sessionId,
        messages: [{ role: "user", content: messageContent }],
        model: this.model,
        provider: this.provider,
        stream: true,
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`OpenCode API error: ${response.statusText}`);
    }

    // Parse SSE stream
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";
    let currentText = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === "message_part_updated" && data.part?.text) {
                currentText = data.part.text;
                yield {
                  content: [{ type: "text", text: currentText }],
                };
              } else if (data.type === "chat_completed" && data.message) {
                // Final message from OpenCode
                const finalText = messageConverter.extractTextContent(data.message);
                yield {
                  content: [{ type: "text", text: finalText }],
                };
                return;
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (e) {
              console.warn("Failed to parse SSE data:", line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
```

#### 1.2 Create OpenCode Runtime Provider
**File**: `src/components/providers/opencode-runtime-provider.tsx`

```typescript
"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type LocalRuntimeOptions,
} from "@assistant-ui/react";
import { OpenCodeChatAdapter } from "@/lib/adapters/opencode-chat-adapter";
import { OpenCodeHistoryAdapter } from "@/lib/adapters/opencode-history-adapter";

interface OpenCodeRuntimeProviderProps {
  sessionId: string;
  model: string;
  provider: string;
  children: ReactNode;
}

export function OpenCodeRuntimeProvider({
  sessionId,
  model,
  provider,
  children,
}: OpenCodeRuntimeProviderProps) {
  const adapter = useMemo(
    () => new OpenCodeChatAdapter(sessionId, model, provider),
    [sessionId, model, provider]
  );

  const historyAdapter = useMemo(
    () => new OpenCodeHistoryAdapter(sessionId),
    [sessionId]
  );

  const runtimeOptions: LocalRuntimeOptions = {
    adapters: {
      history: historyAdapter,
    },
  };

  const runtime = useLocalRuntime(adapter, runtimeOptions);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

#### 1.3 Create OpenCode History Adapter
**File**: `src/lib/adapters/opencode-history-adapter.ts`

```typescript
import type { ThreadHistoryAdapter, ThreadMessage } from "@assistant-ui/react";
import { messageConverter } from "@/lib/message-converter";
import type { OpenCodeMessage } from "@/lib/message-types";

export class OpenCodeHistoryAdapter implements ThreadHistoryAdapter {
  constructor(private sessionId: string) {}

  async load(): Promise<{ messages: ThreadMessage[] }> {
    try {
      const response = await fetch(`/api/opencode-chat?sessionId=${this.sessionId}`);
      if (!response.ok) {
        console.warn("Failed to load messages from OpenCode");
        return { messages: [] };
      }

      const data = await response.json();
      const openCodeMessages: OpenCodeMessage[] = data.messages || [];

      // Convert OpenCode messages to assistant-ui ThreadMessage format
      const messages: ThreadMessage[] = openCodeMessages.map((msg) => {
        const converted = messageConverter.openCodeToUseChat(msg);
        return {
          id: converted.id,
          role: converted.role,
          content: Array.isArray(converted.content) 
            ? converted.content 
            : [{ type: "text", text: converted.content }],
          createdAt: converted.createdAt || new Date(),
        };
      });

      return { messages };
    } catch (error) {
      console.error("Error loading OpenCode messages:", error);
      return { messages: [] };
    }
  }

  async append(message: ThreadMessage): Promise<void> {
    // OpenCode handles message persistence automatically
    // No need to manually save messages as they're stored in OpenCode session
    console.log("Message appended to OpenCode session:", message.id);
  }
}
```

### Phase 2: Update Chat Interface Component

#### 2.1 Modify OpenCodeChatInterface
**File**: `src/components/opencode-chat-interface.tsx`

Key changes:
1. Remove `useChatRuntime` import and usage
2. Remove manual message loading and conversion logic
3. Replace `AssistantRuntimeProvider` with `OpenCodeRuntimeProvider`
4. Remove sync button (automatic with LocalRuntime)
5. Simplify state management

```typescript
// Remove these imports
// import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
// import { messageConverter } from "@/lib/message-converter";
// import type { Message as UseChatMessage } from "ai";

// Add these imports
import { OpenCodeRuntimeProvider } from "@/components/providers/opencode-runtime-provider";

// Remove state for message management
// const [initialMessages, setInitialMessages] = useState<Array<UseChatMessage & { role: "user" | "assistant" | "system" }>>([]);
// const [isSyncing, setIsSyncing] = useState(false);

// Remove loadMessagesFromOpenCode function

// Replace runtime creation
// const runtime = useChatRuntime({...});

// In the render section, replace AssistantRuntimeProvider
<OpenCodeRuntimeProvider
  sessionId={selectedOpenCodeSessionId}
  model={parsedModel.modelID}
  provider={parsedModel.providerID}
>
  <div className="flex-1">
    <Thread />
  </div>
</OpenCodeRuntimeProvider>
```

### Phase 3: Multi-Session Support

#### 3.1 Create OpenCode Thread List Adapter
**File**: `src/lib/adapters/opencode-thread-list-adapter.ts`

```typescript
import type { RemoteThreadListAdapter, RemoteThreadListResponse } from "@assistant-ui/react";
import { useOpenCodeSessionContext } from "@/contexts/OpenCodeWorkspaceContext";

export class OpenCodeThreadListAdapter implements RemoteThreadListAdapter {
  constructor(private getActiveSessions: () => Array<{ id: string; folder: string; model: string }>) {}

  async list(): Promise<RemoteThreadListResponse> {
    const sessions = this.getActiveSessions();
    
    return {
      threads: sessions.map((session) => ({
        status: "regular" as const,
        remoteId: session.id,
        title: `${session.folder.split("/").pop()} - ${session.model}`,
      })),
    };
  }

  async initialize(threadId: string): Promise<{ remoteId: string }> {
    // OpenCode sessions are created externally
    // Return the threadId as remoteId
    return { remoteId: threadId };
  }

  async rename(remoteId: string, newTitle: string): Promise<void> {
    // OpenCode doesn't support renaming sessions
    console.log(`Rename not supported for OpenCode session ${remoteId}`);
  }

  async archive(remoteId: string): Promise<void> {
    // Could stop the OpenCode session
    console.log(`Archive not implemented for OpenCode session ${remoteId}`);
  }

  async unarchive(remoteId: string): Promise<void> {
    console.log(`Unarchive not implemented for OpenCode session ${remoteId}`);
  }

  async delete(remoteId: string): Promise<void> {
    // Could stop and remove the OpenCode session
    console.log(`Delete not implemented for OpenCode session ${remoteId}`);
  }

  async generateTitle(remoteId: string, messages: readonly ThreadMessage[]): Promise<AssistantStream> {
    // Return empty stream - titles are generated from folder/model info
    return new ReadableStream();
  }
}
```

#### 3.2 Create Multi-Session Runtime Provider
**File**: `src/components/providers/opencode-multi-session-provider.tsx`

```typescript
"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  AssistantRuntimeProvider,
  useLocalThreadRuntime,
  unstable_useRemoteThreadListRuntime as useRemoteThreadListRuntime,
  useThreadListItem,
  RuntimeAdapterProvider,
} from "@assistant-ui/react";
import { OpenCodeChatAdapter } from "@/lib/adapters/opencode-chat-adapter";
import { OpenCodeHistoryAdapter } from "@/lib/adapters/opencode-history-adapter";
import { OpenCodeThreadListAdapter } from "@/lib/adapters/opencode-thread-list-adapter";
import { useOpenCodeSessionContext } from "@/contexts/OpenCodeWorkspaceContext";

interface OpenCodeMultiSessionProviderProps {
  children: ReactNode;
}

export function OpenCodeMultiSessionProvider({ children }: OpenCodeMultiSessionProviderProps) {
  const { sessions } = useOpenCodeSessionContext();

  const threadListAdapter = useMemo(() => {
    return new OpenCodeThreadListAdapter(() => 
      sessions.flatMap(session => 
        session.sessions?.map(s => ({
          id: s.id,
          folder: session.folder,
          model: session.model,
        })) || []
      )
    );
  }, [sessions]);

  const runtime = useRemoteThreadListRuntime({
    runtimeHook: () => {
      return useLocalThreadRuntime((options) => {
        // This will be called for each thread
        const threadItem = useThreadListItem();
        const sessionId = threadItem.remoteId;
        
        if (!sessionId) {
          throw new Error("No session ID available");
        }

        // Find session details
        const session = sessions.find(s => 
          s.sessions?.some(ss => ss.id === sessionId)
        );
        
        if (!session) {
          throw new Error(`Session ${sessionId} not found`);
        }

        const { providerID, modelID } = parseModelString(session.model);
        
        return new OpenCodeChatAdapter(sessionId, modelID, providerID);
      });
    },
    adapter: {
      ...threadListAdapter,
      unstable_Provider: ({ children }) => {
        const threadItem = useThreadListItem();
        const sessionId = threadItem.remoteId;

        const historyAdapter = useMemo(
          () => sessionId ? new OpenCodeHistoryAdapter(sessionId) : null,
          [sessionId]
        );

        const adapters = useMemo(
          () => historyAdapter ? { history: historyAdapter } : {},
          [historyAdapter]
        );

        return (
          <RuntimeAdapterProvider adapters={adapters}>
            {children}
          </RuntimeAdapterProvider>
        );
      },
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

### Phase 4: Enhanced Features

#### 4.1 Add Tool Support
- Implement tool calling for OpenCode commands
- Add human-in-the-loop approval for destructive operations

#### 4.2 Add Attachment Support
- File upload adapter for code files
- Image attachment support for screenshots

#### 4.3 Add Speech Support
- Text-to-speech for assistant responses
- Voice input for user messages

### Phase 5: Testing and Validation

#### 5.1 Unit Tests
- Test message conversion between formats
- Test adapter implementations
- Test error handling

#### 5.2 Integration Tests
- Test full chat flow with OpenCode sessions
- Test session switching
- Test message persistence

#### 5.3 User Acceptance Testing
- Verify all existing functionality works
- Test new features (branching, editing)
- Performance testing

## Implementation Timeline

### Week 1: Core Migration
- [x] Implement OpenCodeChatAdapter
- [x] Implement OpenCodeHistoryAdapter  
- [x] Create OpenCodeRuntimeProvider
- [x] Update OpenCodeChatInterface to use LocalRuntime

### Week 2: Multi-Session Support
- [ ] Implement OpenCodeThreadListAdapter
- [ ] Create OpenCodeMultiSessionProvider
- [ ] Update UI for thread management
- [ ] Test session switching

### Week 3: Enhanced Features
- [ ] Add tool support
- [ ] Add attachment support
- [ ] Add speech support
- [ ] Polish UI/UX

### Week 4: Testing and Polish
- [ ] Write comprehensive tests
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Bug fixes and refinements

## Risk Mitigation

### Compatibility Risks
- **Risk**: Breaking changes in message format
- **Mitigation**: Maintain backward compatibility in message converter

### Performance Risks  
- **Risk**: Slower message loading with new architecture
- **Mitigation**: Implement caching and optimize API calls

### User Experience Risks
- **Risk**: Loss of existing functionality during migration
- **Mitigation**: Feature parity testing and gradual rollout

## Success Criteria

1. **Functional Parity**: All existing chat functionality works
2. **Enhanced Features**: Message editing, branching, and automatic sync work
3. **Performance**: No regression in chat response times
4. **Reliability**: Improved error handling and recovery
5. **Maintainability**: Cleaner, more modular code architecture

## Rollback Plan

If issues arise during migration:
1. Keep current implementation in separate branch
2. Feature flag to switch between implementations
3. Quick rollback capability via environment variable
4. Monitoring and alerting for runtime errors

## Future Enhancements

After successful migration:
1. **Advanced Tool Integration**: More OpenCode commands as tools
2. **Collaborative Features**: Multi-user session support
3. **AI Assistance**: Code suggestions and completions
4. **Analytics**: Usage tracking and performance metrics