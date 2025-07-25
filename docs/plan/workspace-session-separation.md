# Workspace/Session Separation Plan

**Status**: 🔄 In Progress  
**Created**: 2025-01-24  
**Last Updated**: 2025-01-24

## Overview

This plan separates two distinct concepts that were previously conflated:
- **Workspace**: A running OpenCode instance (folder + port + process)
- **Session**: An individual chat conversation within a workspace with its own model (maps to OpenCode SDK session)
- **Relationship**: One workspace can have multiple concurrent sessions, each with potentially different models

## Progress Tracking

- [x] **Phase 1**: Complete Refactoring *(4/4 tasks)* ✅ *Completed 2025-01-24*
- [x] **Phase 2**: Object-Centric API Restructure *(3/3 tasks)* ✅ *Completed 2025-01-25*
- [x] **Phase 3**: Component Restructure *(4/4 tasks)* ✅ *Completed 2025-01-25*
- [x] **Phase 4**: Complete Integration *(4/4 tasks)* ✅ *Completed 2025-01-25*

---

## Phase 1: Complete Refactoring
**Status**: ✅ Complete  
**Goal**: Rename all concepts and update APIs immediately

### Tasks
- [x] ~~**1.1** Rename core library files~~ ✅ *Completed 2025-01-24*
  - [x] ~~`src/lib/opencode-session.ts` → `src/lib/opencode-workspace.ts`~~
  - [x] ~~`OpenCodeSession` → `OpenCodeWorkspace`~~
  - [x] ~~`OpenCodeSessionManager` → `OpenCodeWorkspaceManager`~~
  - [x] ~~`sessionManager` → `workspaceManager`~~

- [x] ~~**1.2** Update data structures~~ ✅ *Completed 2025-01-24*
  ```typescript
  interface OpenCodeWorkspace {
    id: string;           // workspace identifier
    folder: string;
    port: number;
    status: "starting" | "running" | "stopped" | "error";
    process?: ChildProcess;
    client?: Opencode;
    sessions: Map<string, ChatSession>; // NEW
  }

  interface ChatSession {
    id: string;           // OpenCode SDK session ID
    workspaceId: string;
    model: string;        // Model for this specific session
    createdAt: Date;
    lastActivity: Date;
    status: "active" | "inactive";
  }
  ```

- [x] ~~**1.3** Update hooks and contexts~~ ✅ *Completed 2025-01-24*
  - [x] ~~`src/hooks/useOpenCodeSession.ts` → `src/hooks/useOpenCodeWorkspace.ts`~~
  - [x] ~~`src/contexts/OpenCodeSessionContext.tsx` → `src/contexts/OpenCodeWorkspaceContext.tsx`~~
  - [x] ~~Create `src/hooks/useWorkspaceSessions.ts`~~

- [x] ~~**1.4** Add session management to workspace manager~~ ✅ *Completed 2025-01-24*
  - [x] ~~Session creation/deletion methods~~
  - [x] ~~Session tracking per workspace~~
  - [x] ~~Session cleanup on workspace shutdown~~

---

## Phase 2: Object-Centric API Restructure
**Status**: ✅ Complete  
**Goal**: RESTful API design with workspace as primary resource

### Tasks
- [x] ~~**2.1** Create nested API structure~~ ✅ *Completed 2025-01-25*
  ```
  /api/workspaces/
  ├── route.ts                    # Workspace CRUD operations
  ├── [workspaceId]/
  │   ├── route.ts               # Individual workspace operations
  │   ├── sessions/
  │   │   ├── route.ts           # Session CRUD within workspace
  │   │   └── [sessionId]/
  │   │       ├── route.ts       # Individual session operations
  │   │       └── chat/
  │   │           └── route.ts   # Chat operations for specific session
  ```

- [x] ~~**2.2** Implement workspace endpoints~~ ✅ *Completed 2025-01-25*
  - [x] ~~`POST /api/workspaces` - Create workspace~~
  - [x] ~~`GET /api/workspaces` - List all workspaces~~
  - [x] ~~`GET /api/workspaces/[workspaceId]` - Get specific workspace~~
  - [x] ~~`DELETE /api/workspaces/[workspaceId]` - Delete workspace~~

- [x] ~~**2.3** Implement session and chat endpoints~~ ✅ *Completed 2025-01-25*
  - [x] ~~`POST /api/workspaces/[workspaceId]/sessions` - Create session~~
  - [x] ~~`GET /api/workspaces/[workspaceId]/sessions` - List sessions~~
  - [x] ~~`GET /api/workspaces/[workspaceId]/sessions/[sessionId]` - Get session~~
  - [x] ~~`DELETE /api/workspaces/[workspaceId]/sessions/[sessionId]` - Delete session~~
  - [x] ~~`POST /api/workspaces/[workspaceId]/sessions/[sessionId]/chat` - Send message~~
  - [x] ~~`GET /api/workspaces/[workspaceId]/sessions/[sessionId]/chat` - Get chat history~~

### API Examples
```typescript
// Create workspace
POST /api/workspaces
{ folder: "/path" }

// Create session in workspace
POST /api/workspaces/workspace-123/sessions
{ model: "gpt-4" }

// Send chat message
POST /api/workspaces/workspace-123/sessions/session-abc/chat
{ messages: [...], stream: true }

// Get chat history
GET /api/workspaces/workspace-123/sessions/session-abc/chat
```

---

## Phase 3: Component Restructure
**Status**: 🔄 In Progress  
**Goal**: Update all components with new terminology and functionality

### Tasks
- [x] ~~**3.1** Rename existing components~~ ✅ *Completed 2025-01-25*
  - [x] ~~`src/components/session-manager.tsx` → `src/components/workspace-manager.tsx`~~
  - [x] ~~`src/components/session-starter.tsx` → `src/components/workspace-starter.tsx`~~
  - [x] ~~`src/components/session-dashboard.tsx` → `src/components/workspace-dashboard.tsx`~~
  - [ ] Update `src/components/opencode-chat-interface.tsx` for workspace + session

- [x] ~~**3.2** Create new session management components~~ ✅ *Completed 2025-01-25*
  - [x] ~~`src/components/session-manager.tsx` (NEW - manages sessions within workspace)~~
  - [x] ~~`src/components/session-tabs.tsx` (NEW - tab interface for multiple sessions)~~
  - [x] ~~`src/components/session-creator.tsx` (NEW - create new session in workspace)~~

- [x] ~~**3.3** Update all API calls to use new nested endpoints~~ ✅ *Completed 2025-01-25*
  - [x] ~~Update workspace management calls~~
  - [x] ~~Update session management calls~~
  - [x] ~~Update chat API calls~~

- [x] ~~**3.4** Update UI text and terminology~~ ✅ *Completed 2025-01-25*
  - [x] ~~All "Session" text → "Workspace" where appropriate~~
  - [x] ~~Add session management UI within workspace view~~
  - [x] ~~Show workspace info + active session info in chat~~

---

## Phase 4: Complete Integration
**Status**: ✅ Complete  
**Goal**: Full workspace + session functionality

### Tasks
- [x] ~~**4.1** Workspace Manager Features~~ ✅ *Completed 2025-01-25*
  - [x] ~~Create/delete workspaces~~
  - [x] ~~Show session count per workspace~~
  - [x] ~~Workspace status monitoring~~

- [x] ~~**4.2** Session Management Features~~ ✅ *Completed 2025-01-25*
  - [x] ~~Create multiple sessions per workspace~~
  - [x] ~~Switch between sessions within workspace~~
  - [x] ~~Session cleanup and management~~
  - [x] ~~Session-specific chat history~~

- [x] ~~**4.3** Chat Interface Features~~ ✅ *Completed 2025-01-25*
  - [x] ~~Clear workspace + session identification~~
  - [x] ~~Session tabs or selector~~
  - [x] ~~Create new session button~~
  - [x] ~~Session-specific chat history~~

- [x] ~~**4.4** Testing and Error Handling~~ ✅ *Completed 2025-01-25*
  - [x] ~~Test multi-session functionality~~
  - [x] ~~Ensure proper cleanup and error handling~~
  - [x] ~~Test workspace shutdown with active sessions~~
  - [x] ~~Test session creation failures~~

---

## Breaking Changes

⚠️ **This plan introduces breaking changes:**
- All API endpoints change
- Component props and interfaces change
- Hook names and return values change
- Local storage keys may change
- URL structure may change

## Benefits

✅ **Key Benefits:**
1. **Clean Architecture**: No legacy code or confusing mappings
2. **RESTful Design**: Clear resource hierarchy (workspace → session → chat)
3. **Intuitive URLs**: `/workspaces/123/sessions/abc/chat` is self-documenting
4. **Better Organization**: Related operations grouped under parent resource
5. **Scalable**: Easy to add more nested resources if needed
6. **Multiple Conversations**: Users can have multiple chat contexts per project

---

## Completion Checklist

When marking phases as complete, update the progress tracking section at the top and change status indicators:

- ⏳ Not Started
- 🔄 In Progress  
- ✅ Complete
- ❌ Blocked

**Example of completed task:**
- [x] ~~**1.1** Rename core library files~~ ✅ *Completed 2025-01-24*

**Example of completed phase:**
- [x] **Phase 1**: Complete Refactoring *(4/4 tasks)* ✅ *Completed 2025-01-24*