# Workspace/Session Separation Plan

**Status**: 🔄 In Progress  
**Created**: 2025-01-24  
**Last Updated**: 2025-01-24

## Overview

This plan separates two distinct concepts that were previously conflated:
- **Workspace**: A running OpenCode instance (folder + model + port + process)
- **Session**: An individual chat conversation within a workspace (maps to OpenCode SDK session)
- **Relationship**: One workspace can have multiple concurrent sessions

## Progress Tracking

- [ ] **Phase 1**: Complete Refactoring *(0/4 tasks)*
- [ ] **Phase 2**: Object-Centric API Restructure *(0/3 tasks)*
- [ ] **Phase 3**: Component Restructure *(0/4 tasks)*
- [ ] **Phase 4**: Complete Integration *(0/4 tasks)*

---

## Phase 1: Complete Refactoring
**Status**: ⏳ Not Started  
**Goal**: Rename all concepts and update APIs immediately

### Tasks
- [ ] **1.1** Rename core library files
  - [ ] `src/lib/opencode-session.ts` → `src/lib/opencode-workspace.ts`
  - [ ] `OpenCodeSession` → `OpenCodeWorkspace`
  - [ ] `OpenCodeSessionManager` → `OpenCodeWorkspaceManager`
  - [ ] `sessionManager` → `workspaceManager`

- [ ] **1.2** Update data structures
  ```typescript
  interface OpenCodeWorkspace {
    id: string;           // workspace identifier
    folder: string;
    model: string;
    port: number;
    status: "starting" | "running" | "stopped" | "error";
    process?: ChildProcess;
    client?: Opencode;
    sessions: Map<string, ChatSession>; // NEW
  }

  interface ChatSession {
    id: string;           // OpenCode SDK session ID
    workspaceId: string;
    createdAt: Date;
    lastActivity: Date;
    status: "active" | "inactive";
  }
  ```

- [ ] **1.3** Update hooks and contexts
  - [ ] `src/hooks/useOpenCodeSession.ts` → `src/hooks/useOpenCodeWorkspace.ts`
  - [ ] `src/contexts/OpenCodeSessionContext.tsx` → `src/contexts/OpenCodeWorkspaceContext.tsx`
  - [ ] Create `src/hooks/useWorkspaceSessions.ts`

- [ ] **1.4** Add session management to workspace manager
  - [ ] Session creation/deletion methods
  - [ ] Session tracking per workspace
  - [ ] Session cleanup on workspace shutdown

---

## Phase 2: Object-Centric API Restructure
**Status**: ⏳ Not Started  
**Goal**: RESTful API design with workspace as primary resource

### Tasks
- [ ] **2.1** Create nested API structure
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

- [ ] **2.2** Implement workspace endpoints
  - [ ] `POST /api/workspaces` - Create workspace
  - [ ] `GET /api/workspaces` - List all workspaces
  - [ ] `GET /api/workspaces/[workspaceId]` - Get specific workspace
  - [ ] `DELETE /api/workspaces/[workspaceId]` - Delete workspace

- [ ] **2.3** Implement session and chat endpoints
  - [ ] `POST /api/workspaces/[workspaceId]/sessions` - Create session
  - [ ] `GET /api/workspaces/[workspaceId]/sessions` - List sessions
  - [ ] `GET /api/workspaces/[workspaceId]/sessions/[sessionId]` - Get session
  - [ ] `DELETE /api/workspaces/[workspaceId]/sessions/[sessionId]` - Delete session
  - [ ] `POST /api/workspaces/[workspaceId]/sessions/[sessionId]/chat` - Send message
  - [ ] `GET /api/workspaces/[workspaceId]/sessions/[sessionId]/chat` - Get chat history

### API Examples
```typescript
// Create workspace
POST /api/workspaces
{ folder: "/path", model: "gpt-4" }

// Create session in workspace
POST /api/workspaces/workspace-123/sessions
{ }

// Send chat message
POST /api/workspaces/workspace-123/sessions/session-abc/chat
{ messages: [...], model: "gpt-4", stream: true }

// Get chat history
GET /api/workspaces/workspace-123/sessions/session-abc/chat
```

---

## Phase 3: Component Restructure
**Status**: ⏳ Not Started  
**Goal**: Update all components with new terminology and functionality

### Tasks
- [ ] **3.1** Rename existing components
  - [ ] `src/components/session-manager.tsx` → `src/components/workspace-manager.tsx`
  - [ ] `src/components/session-starter.tsx` → `src/components/workspace-starter.tsx`
  - [ ] `src/components/session-dashboard.tsx` → `src/components/workspace-dashboard.tsx`
  - [ ] Update `src/components/opencode-chat-interface.tsx` for workspace + session

- [ ] **3.2** Create new session management components
  - [ ] `src/components/session-manager.tsx` (NEW - manages sessions within workspace)
  - [ ] `src/components/session-tabs.tsx` (NEW - tab interface for multiple sessions)
  - [ ] `src/components/session-creator.tsx` (NEW - create new session in workspace)

- [ ] **3.3** Update all API calls to use new nested endpoints
  - [ ] Update workspace management calls
  - [ ] Update session management calls
  - [ ] Update chat API calls

- [ ] **3.4** Update UI text and terminology
  - [ ] All "Session" text → "Workspace" where appropriate
  - [ ] Add session management UI within workspace view
  - [ ] Show workspace info + active session info in chat

---

## Phase 4: Complete Integration
**Status**: ⏳ Not Started  
**Goal**: Full workspace + session functionality

### Tasks
- [ ] **4.1** Workspace Manager Features
  - [ ] Create/delete workspaces
  - [ ] Show session count per workspace
  - [ ] Workspace status monitoring

- [ ] **4.2** Session Management Features
  - [ ] Create multiple sessions per workspace
  - [ ] Switch between sessions within workspace
  - [ ] Session cleanup and management
  - [ ] Session-specific chat history

- [ ] **4.3** Chat Interface Features
  - [ ] Clear workspace + session identification
  - [ ] Session tabs or selector
  - [ ] Create new session button
  - [ ] Session-specific chat history

- [ ] **4.4** Testing and Error Handling
  - [ ] Test multi-session functionality
  - [ ] Ensure proper cleanup and error handling
  - [ ] Test workspace shutdown with active sessions
  - [ ] Test session creation failures

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