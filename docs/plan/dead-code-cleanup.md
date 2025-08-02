# Dead Code Cleanup Plan

**Status**: 🔄 In Progress  
**Created**: 2025-08-02  
**Last Updated**: 2025-08-02

## Overview

This plan identifies and removes dead code from the opencode-dashboard project, including unused dependencies, legacy API routes, and obsolete interfaces.

## Progress Tracking

- [ ] **Phase 1**: Identify Dead Code *(5/5 tasks)* ⏳ *In Progress*
- [ ] **Phase 2**: Remove Legacy API Routes *(3/3 tasks)* ⏳ *Not Started*
- [ ] **Phase 3**: Clean Up Dependencies *(2/2 tasks)* ⏳ *Not Started*
- [ ] **Phase 4**: Remove Unused Interfaces *(2/2 tasks)* ⏳ *Not Started*
- [ ] **Phase 5**: Final Verification *(2/2 tasks)* ⏳ *Not Started*

---

## Phase 1: Identify Dead Code
**Status**: 🔄 In Progress  
**Goal**: Catalog all unused code and dependencies

### Tasks
- [x] ~~**1.1** Identify unused npm dependencies~~ ✅ *Completed 2025-08-02*
  - [x] ~~`@ai-sdk/openai` - unused dependency~~
  - [x] ~~`@tailwindcss/postcss` - unused dev dependency~~
  - [x] ~~`eslint` - unused dev dependency~~
  - [x] ~~`eslint-config-next` - unused dev dependency~~
  - [x] ~~`tailwindcss` - unused dev dependency~~
  - [x] ~~`typescript` - unused dev dependency~~

- [x] ~~**1.2** Identify legacy API routes~~ ✅ *Completed 2025-08-02*
  - [x] ~~`/api/opencode` - legacy workspace management~~
  - [x] ~~`/api/opencode-chat` - legacy chat endpoints~~
  - [x] ~~`/api/folders` - legacy folder endpoints~~

- [x] ~~**1.3** Identify unused interfaces~~ ✅ *Completed 2025-08-02*
  - [x] ~~`OpenCodeSessionConfig` - replaced by workspace config~~
  - [x] ~~`OpenCodeSession` - replaced by workspace interfaces~~
  - [x] ~~`SessionError` - unused error type~~
  - [x] ~~`SessionState` - unused state type~~
  - [x] ~~`UseOpenCodeSessionReturn` - replaced by workspace return type~~

- [x] ~~**1.4** Identify legacy API usage~~ ✅ *Completed 2025-08-02*
  - [x] ~~`opencode-chat-interface.tsx:21` - uses `/api/opencode-chat`~~
  - [x] ~~`opencode-chat-interface.tsx:22` - uses `/api/opencode-chat`~~

- [x] ~~**1.5** Identify test files in source~~ ✅ *Completed 2025-08-02*
  - [x] ~~`src/lib/test-converter.ts` - test utilities in source~~

---

## Phase 2: Remove Legacy API Routes
**Status**: ⏳ Not Started  
**Goal**: Remove obsolete API endpoints

### Tasks
- [ ] **2.1** Remove `/api/opencode` endpoints
  - [ ] Delete `src/app/api/opencode/route.ts`
  - [ ] Update any remaining references

- [ ] **2.2** Remove `/api/opencode-chat` endpoints
  - [ ] Delete `src/app/api/opencode-chat/route.ts`
  - [ ] Update chat interface to use new endpoints

- [ ] **2.3** Remove `/api/folders` endpoints
  - [ ] Delete `src/app/api/folders/route.ts`
  - [ ] Update folder selector to use new endpoints

---

## Phase 3: Clean Up Dependencies
**Status**: ⏳ Not Started  
**Goal**: Remove unused npm packages

### Tasks
- [ ] **3.1** Remove unused dependencies
  ```bash
  npm uninstall @ai-sdk/openai
  ```

- [ ] **3.2** Remove unused dev dependencies
  ```bash
  npm uninstall @tailwindcss/postcss eslint eslint-config-next tailwindcss typescript
  ```

---

## Phase 4: Remove Unused Interfaces
**Status**: ⏳ Not Started  
**Goal**: Clean up obsolete TypeScript interfaces

### Tasks
- [ ] **4.1** Remove legacy session interfaces from `useOpenCodeWorkspace.ts`
  - [ ] Remove `OpenCodeSessionConfig`
  - [ ] Remove `OpenCodeSession`
  - [ ] Remove `SessionError`
  - [ ] Remove `SessionState`
  - [ ] Remove `UseOpenCodeSessionReturn`

- [ ] **4.2** Update context and hook exports
  - [ ] Update `OpenCodeWorkspaceContext.tsx` to remove legacy references
  - [ ] Update `useOpenCodeWorkspace.ts` to use workspace terminology consistently

---

## Phase 5: Final Verification
**Status**: ⏳ Not Started  
**Goal**: Ensure no regressions after cleanup

### Tasks
- [ ] **5.1** Verify build succeeds
  ```bash
  npm run build
  ```

- [ ] **5.2** Verify lint passes
  ```bash
  npm run lint
  ```

---

## Dead Code Summary

### Files to Remove
- `src/app/api/opencode/route.ts`
- `src/app/api/opencode-chat/route.ts`
- `src/app/api/folders/route.ts`
- `src/lib/test-converter.ts`

### Dependencies to Remove
- `@ai-sdk/openai`
- `@tailwindcss/postcss`
- `eslint`
- `eslint-config-next`
- `tailwindcss`
- `typescript`

### Interfaces to Remove
- `OpenCodeSessionConfig`
- `OpenCodeSession`
- `SessionError`
- `SessionState`
- `UseOpenCodeSessionReturn`

### Legacy API Usage to Update
- `opencode-chat-interface.tsx` - update from `/api/opencode-chat` to `/api/workspaces/[workspaceId]/sessions/[sessionId]/chat`

---

## Breaking Changes

⚠️ **This cleanup introduces breaking changes:**
- Removes legacy API endpoints
- Removes unused TypeScript interfaces
- Removes unused dependencies

## Benefits

✅ **Key Benefits:**
1. **Reduced Bundle Size** - Remove unused dependencies
2. **Cleaner Codebase** - Remove dead code and legacy interfaces
3. **Better Performance** - Fewer dependencies to install and maintain
4. **Improved Maintainability** - Clearer codebase structure
5. **Modern Architecture** - Fully migrated to workspace/session model

---

## Completion Checklist

When marking phases as complete, update the progress tracking section at the top and change status indicators:

- ⏳ Not Started
- 🔄 In Progress  
- ✅ Complete
- ❌ Blocked

**Example of completed task:**
- [x] ~~**1.1** Identify unused npm dependencies~~ ✅ *Completed 2025-08-02*

**Example of completed phase:**
- [x] **Phase 1**: Identify Dead Code *(5/5 tasks)* ✅ *Completed 2025-08-02*