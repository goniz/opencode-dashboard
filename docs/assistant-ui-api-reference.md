# Assistant UI API Reference

## Overview

This document provides a comprehensive reference for the `@assistant-ui/react` and `@assistant-ui/react-ai-sdk` libraries. These libraries provide React components and hooks for building AI assistant interfaces with support for streaming, message editing, branching, and more.

## Table of Contents

1. [Installation](#installation)
2. [Core Concepts](#core-concepts)
3. [Runtime Providers](#runtime-providers)
4. [UI Components](#ui-components)
5. [Hooks](#hooks)
6. [AI SDK Integration](#ai-sdk-integration)
7. [Examples](#examples)
8. [Best Practices](#best-practices)

## Installation

### Basic Installation

```bash
npm install @assistant-ui/react @assistant-ui/react-ai-sdk @assistant-ui/react-markdown
```

### With AI SDK

```bash
npm install @assistant-ui/react @assistant-ui/react-ai-sdk ai @ai-sdk/openai
```

### Additional Dependencies

```bash
npm install @radix-ui/react-tooltip @radix-ui/react-slot lucide-react remark-gfm class-variance-authority clsx
```

## Core Concepts

### Runtime Architecture

Assistant UI uses a runtime-based architecture where different runtimes handle state management and backend communication:

- **LocalRuntime**: Assistant UI manages chat state internally
- **ExternalStoreRuntime**: You control the state (Redux, Zustand, etc.)
- **Pre-built Integrations**: Built on top of core runtimes for specific frameworks

### Message Flow

1. User inputs message via Composer
2. Runtime processes the message
3. Backend API is called
4. Response is streamed back
5. UI updates in real-time

## Runtime Providers

### AssistantRuntimeProvider

The root provider that wraps your application and provides runtime context.

```tsx
import { AssistantRuntimeProvider } from "@assistant-ui/react";

function App() {
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* Your app components */}
    </AssistantRuntimeProvider>
  );
}
```

**Props:**
- `runtime`: The runtime instance (LocalRuntime, ExternalStoreRuntime, or AI SDK runtime)

### useChatRuntime (AI SDK Integration)

Creates a runtime that integrates with Vercel AI SDK.

```tsx
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

const runtime = useChatRuntime({
  api: "/api/chat",
  // Additional options...
});
```

**Options:**
- `api`: API endpoint for chat requests
- `headers`: Additional headers for requests
- `body`: Additional body parameters
- `credentials`: Request credentials mode
- `fetch`: Custom fetch function

## UI Components

### Thread Components

#### ThreadPrimitive.Root

The root container for a conversation thread.

```tsx
import { ThreadPrimitive } from "@assistant-ui/react";

<ThreadPrimitive.Root className="thread-container">
  {/* Thread content */}
</ThreadPrimitive.Root>
```

**Props:**
- `className`: CSS class name
- `style`: Inline styles
- Standard HTML div props

#### ThreadPrimitive.Viewport

The scrollable viewport containing messages.

```tsx
<ThreadPrimitive.Viewport className="thread-viewport">
  <ThreadPrimitive.Messages />
</ThreadPrimitive.Viewport>
```

#### ThreadPrimitive.Messages

Renders the list of messages in the thread.

```tsx
<ThreadPrimitive.Messages
  components={{
    UserMessage: UserMessage,
    AssistantMessage: AssistantMessage,
    EditComposer: EditComposer,
  }}
/>
```

**Props:**
- `components`: Object mapping message types to React components

#### ThreadPrimitive.Empty

Conditional component that renders when thread is empty.

```tsx
<ThreadPrimitive.Empty>
  <div>How can I help you today?</div>
</ThreadPrimitive.Empty>
```

#### ThreadPrimitive.If

Conditional rendering based on thread state.

```tsx
<ThreadPrimitive.If empty={false}>
  <div>Thread has messages</div>
</ThreadPrimitive.If>

<ThreadPrimitive.If running>
  <div>Assistant is responding...</div>
</ThreadPrimitive.If>
```

**Props:**
- `empty`: Show when thread is empty (boolean)
- `running`: Show when assistant is generating response (boolean)

#### ThreadPrimitive.ScrollToBottom

Button to scroll to the bottom of the thread.

```tsx
<ThreadPrimitive.ScrollToBottom asChild>
  <button>Scroll to bottom</button>
</ThreadPrimitive.ScrollToBottom>
```

#### ThreadPrimitive.Suggestion

Clickable suggestion that can populate the composer.

```tsx
<ThreadPrimitive.Suggestion
  prompt="What is the weather in Tokyo?"
  method="replace"
  autoSend
>
  <span>What is the weather in Tokyo?</span>
</ThreadPrimitive.Suggestion>
```

**Props:**
- `prompt`: The text to insert into composer
- `method`: How to handle existing text ("replace" | "append")
- `autoSend`: Whether to automatically send the message (boolean)

### Message Components

#### MessagePrimitive.Root

Container for individual messages.

```tsx
import { MessagePrimitive } from "@assistant-ui/react";

<MessagePrimitive.Root className="message-container">
  {/* Message content */}
</MessagePrimitive.Root>
```

#### MessagePrimitive.Content

Renders the message content with support for different content types.

```tsx
<MessagePrimitive.Content 
  components={{ 
    Text: MarkdownText 
  }} 
/>
```

**Props:**
- `components`: Object mapping content types to React components

#### MessagePrimitive.If

Conditional rendering based on message state.

```tsx
<MessagePrimitive.If copied>
  <CheckIcon />
</MessagePrimitive.If>

<MessagePrimitive.If copied={false}>
  <CopyIcon />
</MessagePrimitive.If>
```

**Props:**
- `copied`: Show when message is copied (boolean)
- `speaking`: Show when message is being read aloud (boolean)

### Composer Components

#### ComposerPrimitive.Root

Container for the message input area.

```tsx
import { ComposerPrimitive } from "@assistant-ui/react";

<ComposerPrimitive.Root className="composer-container">
  {/* Composer content */}
</ComposerPrimitive.Root>
```

#### ComposerPrimitive.Input

The text input field for composing messages.

```tsx
<ComposerPrimitive.Input
  placeholder="Write a message..."
  autoFocus
  rows={1}
  className="composer-input"
/>
```

**Props:**
- `placeholder`: Placeholder text
- `autoFocus`: Auto-focus on mount (boolean)
- `rows`: Number of rows for textarea
- Standard textarea props

#### ComposerPrimitive.Send

Button to send the composed message.

```tsx
<ComposerPrimitive.Send asChild>
  <button>Send</button>
</ComposerPrimitive.Send>
```

#### ComposerPrimitive.Cancel

Button to cancel message generation.

```tsx
<ComposerPrimitive.Cancel asChild>
  <button>Cancel</button>
</ComposerPrimitive.Cancel>
```

### Action Bar Components

#### ActionBarPrimitive.Root

Container for message action buttons.

```tsx
import { ActionBarPrimitive } from "@assistant-ui/react";

<ActionBarPrimitive.Root
  hideWhenRunning
  autohide="not-last"
  className="action-bar"
>
  {/* Action buttons */}
</ActionBarPrimitive.Root>
```

**Props:**
- `hideWhenRunning`: Hide when assistant is responding (boolean)
- `autohide`: Auto-hide behavior ("always" | "not-last" | "never")
- `autohideFloat`: Floating behavior for auto-hide

#### ActionBarPrimitive.Edit

Button to edit a message.

```tsx
<ActionBarPrimitive.Edit asChild>
  <button>Edit</button>
</ActionBarPrimitive.Edit>
```

#### ActionBarPrimitive.Copy

Button to copy message content.

```tsx
<ActionBarPrimitive.Copy asChild>
  <button>Copy</button>
</ActionBarPrimitive.Copy>
```

#### ActionBarPrimitive.Reload

Button to regenerate assistant response.

```tsx
<ActionBarPrimitive.Reload asChild>
  <button>Reload</button>
</ActionBarPrimitive.Reload>
```

### Branch Picker Components

#### BranchPickerPrimitive.Root

Container for message branch navigation.

```tsx
import { BranchPickerPrimitive } from "@assistant-ui/react";

<BranchPickerPrimitive.Root
  hideWhenSingleBranch
  className="branch-picker"
>
  {/* Branch navigation */}
</BranchPickerPrimitive.Root>
```

**Props:**
- `hideWhenSingleBranch`: Hide when only one branch exists (boolean)

#### BranchPickerPrimitive.Previous

Button to navigate to previous branch.

```tsx
<BranchPickerPrimitive.Previous asChild>
  <button>Previous</button>
</BranchPickerPrimitive.Previous>
```

#### BranchPickerPrimitive.Next

Button to navigate to next branch.

```tsx
<BranchPickerPrimitive.Next asChild>
  <button>Next</button>
</BranchPickerPrimitive.Next>
```

#### BranchPickerPrimitive.Number

Displays current branch number.

```tsx
<BranchPickerPrimitive.Number />
```

#### BranchPickerPrimitive.Count

Displays total number of branches.

```tsx
<BranchPickerPrimitive.Count />
```

### Thread List Components

#### ThreadListPrimitive.Root

Container for the thread list.

```tsx
import { ThreadListPrimitive } from "@assistant-ui/react";

<ThreadListPrimitive.Root className="thread-list">
  {/* Thread list content */}
</ThreadListPrimitive.Root>
```

#### ThreadListPrimitive.New

Button to create a new thread.

```tsx
<ThreadListPrimitive.New asChild>
  <button>New Thread</button>
</ThreadListPrimitive.New>
```

#### ThreadListPrimitive.Items

Renders the list of thread items.

```tsx
<ThreadListPrimitive.Items 
  components={{ 
    ThreadListItem: ThreadListItem 
  }} 
/>
```

#### ThreadListItemPrimitive.Root

Container for individual thread list items.

```tsx
import { ThreadListItemPrimitive } from "@assistant-ui/react";

<ThreadListItemPrimitive.Root className="thread-item">
  {/* Thread item content */}
</ThreadListItemPrimitive.Root>
```

#### ThreadListItemPrimitive.Trigger

Button to switch to this thread.

```tsx
<ThreadListItemPrimitive.Trigger className="thread-trigger">
  <ThreadListItemPrimitive.Title fallback="New Chat" />
</ThreadListItemPrimitive.Trigger>
```

#### ThreadListItemPrimitive.Title

Displays the thread title.

```tsx
<ThreadListItemPrimitive.Title fallback="New Chat" />
```

**Props:**
- `fallback`: Text to show when thread has no title

#### ThreadListItemPrimitive.Archive

Button to archive the thread.

```tsx
<ThreadListItemPrimitive.Archive asChild>
  <button>Archive</button>
</ThreadListItemPrimitive.Archive>
```

### Error Components

#### ErrorPrimitive.Root

Container for error messages.

```tsx
import { ErrorPrimitive } from "@assistant-ui/react";

<ErrorPrimitive.Root className="error-container">
  <ErrorPrimitive.Message />
</ErrorPrimitive.Root>
```

#### ErrorPrimitive.Message

Displays the error message.

```tsx
<ErrorPrimitive.Message className="error-text" />
```

## Hooks

### useAssistantRuntime

Access the current runtime instance.

```tsx
import { useAssistantRuntime } from "@assistant-ui/react";

const MyComponent = () => {
  const runtime = useAssistantRuntime();
  // Use runtime methods...
};
```

### useThread

Access thread state and methods.

```tsx
import { useThread } from "@assistant-ui/react";

const MyComponent = () => {
  const thread = useThread();
  
  // Thread properties
  const { messages, isRunning, isDisabled } = thread;
  
  // Thread methods
  const { append, startRun, cancelRun } = thread;
};
```

### useMessage

Access message state within a message component.

```tsx
import { useMessage } from "@assistant-ui/react";

const MyMessage = () => {
  const message = useMessage();
  
  // Message properties
  const { role, content, createdAt } = message;
  
  // Message methods
  const { reload, edit, copy } = message;
};
```

### useComposer

Access composer state and methods.

```tsx
import { useComposer } from "@assistant-ui/react";

const MyComposer = () => {
  const composer = useComposer();
  
  // Composer properties
  const { value, isEditing } = composer;
  
  // Composer methods
  const { setValue, send, cancel } = composer;
};
```

## AI SDK Integration

### Backend Setup

Create an API route that works with the AI SDK:

```typescript
// app/api/chat/route.ts
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
      // Add backend tools here
    },
  });

  return result.toDataStreamResponse();
}
```

### Frontend Integration

```tsx
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { AssistantRuntimeProvider } from "@assistant-ui/react";

const MyApp = () => {
  const runtime = useChatRuntime({
    api: "/api/chat",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* Your UI components */}
    </AssistantRuntimeProvider>
  );
};
```

### Frontend Tools

The `frontendTools` function enables client-side tool execution:

```typescript
import { frontendTools } from "@assistant-ui/react-ai-sdk";

// In your API route
tools: {
  ...frontendTools(tools),
  // Backend tools...
}
```

## Examples

### Basic Chat Interface

```tsx
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "./components/Thread";

export default function ChatApp() {
  const runtime = useChatRuntime({
    api: "/api/chat",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-screen">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
```

### Chat with Thread List

```tsx
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "./components/Thread";
import { ThreadList } from "./components/ThreadList";

export default function ChatApp() {
  const runtime = useChatRuntime({
    api: "/api/chat",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="grid h-screen grid-cols-[200px_1fr] gap-x-2 px-4 py-4">
        <ThreadList />
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
```

### Custom Message Component

```tsx
import { MessagePrimitive } from "@assistant-ui/react";
import { MarkdownText } from "./MarkdownText";

const CustomAssistantMessage = () => {
  return (
    <MessagePrimitive.Root className="assistant-message">
      <div className="message-content">
        <MessagePrimitive.Content components={{ Text: MarkdownText }} />
      </div>
      <div className="message-actions">
        <ActionBarPrimitive.Copy asChild>
          <button>Copy</button>
        </ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Reload asChild>
          <button>Regenerate</button>
        </ActionBarPrimitive.Reload>
      </div>
    </MessagePrimitive.Root>
  );
};
```

## Best Practices

### Performance

1. **Use React.memo** for message components to prevent unnecessary re-renders
2. **Implement virtualization** for long conversation threads
3. **Lazy load** thread history when using thread lists

### Accessibility

1. **Provide proper ARIA labels** for interactive elements
2. **Ensure keyboard navigation** works for all components
3. **Use semantic HTML** elements where appropriate

### Error Handling

1. **Implement error boundaries** around assistant components
2. **Provide fallback UI** for failed message generation
3. **Handle network errors** gracefully in your API routes

### Styling

1. **Use CSS custom properties** for theming
2. **Follow the component composition pattern** for customization
3. **Leverage the `asChild` prop** for maximum flexibility

### State Management

1. **Choose the right runtime** for your use case
2. **Keep message state immutable** when using ExternalStoreRuntime
3. **Handle optimistic updates** properly for better UX

## Version Compatibility

- `@assistant-ui/react`: ^0.10.27
- `@assistant-ui/react-ai-sdk`: ^0.10.16
- `@assistant-ui/react-markdown`: ^0.10.6
- React: ^18.0.0 or ^19.0.0
- TypeScript: ^4.9.0 or ^5.0.0

## Resources

- [Official Documentation](https://www.assistant-ui.com/docs)
- [GitHub Repository](https://github.com/assistant-ui/assistant-ui)
- [Examples](https://github.com/assistant-ui/assistant-ui/tree/main/examples)
- [Discord Community](https://discord.gg/S9dwgCNEFs)

## License

MIT License - see the [LICENSE](https://github.com/assistant-ui/assistant-ui/blob/main/LICENSE) file for details.