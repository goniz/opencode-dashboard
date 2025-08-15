# Google Jules Async Agent UI/UX Refactor - Updated Implementation Plan

## Overview

This document outlines the implementation plan for the Google Jules Async Agent UI/UX refactor for the OpenCode Dashboard. Based on analysis of the existing plan and the jules-clone implementation, we can leverage some of the work that has already been started while integrating it with the existing OpenCode functionality.

## Current Status Analysis

The jules-clone directory contains a partial implementation of the Jules UI with:
1. TaskContext with reducer-based state management
2. Basic UI components (sidebar, new task form, task chat)
3. useTasks hook with plan management functionality
4. Type definitions for tasks, plans, chat messages, etc.

However, this implementation is not yet integrated with the actual OpenCode backend APIs and uses mock data.

## Integration Strategy

We will integrate the Jules UI concepts with the existing OpenCode functionality by:
1. Extending the existing OpenCodeSessionContext rather than replacing it
2. Reusing existing API integration logic
3. Adapting Jules UI components to work with OpenCode data structures
4. Maintaining backward compatibility

## Implementation Phases

### Phase 1: Foundation (Week 1)

#### Task 1.1: Integrate TaskContext with OpenCodeSessionContext

**Implementation Plan:**
1. **Files to Create/Modify:**
   - `src/contexts/TaskContext.tsx` (new file, based on jules-clone but integrated with OpenCode)
   - `src/hooks/useTasks.ts` (new file, extending useOpenCodeSession)

2. **Key Functionality:**
   - Create a TaskContext that extends OpenCodeSessionContext
   - Map OpenCode workspaces to Jules tasks
   - Map OpenCode sessions to Jules task sessions
   - Integrate existing SSE connection for real-time updates

3. **API Integration:**
   - Use existing `/api/workspaces` endpoints
   - Use existing SSE connection at `/api/workspaces/stream`
   - Maintain compatibility with current OpenCode data structures

4. **Components to Reuse:**
   - OpenCodeSessionContext as base
   - Existing SSE connection logic
   - Current workspace data structures

#### Task 1.2: Adapt Jules UI Components for OpenCode

**Implementation Plan:**
1. **Files to Create:**
   - `src/components/OpenCodeSidebar.tsx` (adapted from JulesSidebar)
   - `src/components/NewWorkspaceForm.tsx` (adapted from NewTaskForm)
   - `src/components/WorkspaceChat.tsx` (adapted from TaskChat)

2. **Key Functionality:**
   - Adapt Jules sidebar design to display OpenCode workspaces
   - Modify new task form to create OpenCode workspaces
   - Adjust chat interface to work with OpenCode sessions

3. **API Integration:**
   - `/api/workspaces` for workspace listing and creation
   - `/api/folders` for folder selection
   - `/api/models` for model selection

4. **Components to Reuse:**
   - Existing FolderSelector and ModelSelector components
   - Current button and input components
   - Existing mobile navigation patterns

#### Task 1.3: Update Root Layout and Styling

**Implementation Plan:**
1. **Files to Modify:**
   - `src/app/layout.tsx` (update to use TaskProvider)
   - `src/app/globals.css` (add dark theme and Jules styling)

2. **Key Functionality:**
   - Replace OpenCodeSessionProvider with TaskProvider
   - Implement dark theme as default with purple accents
   - Add Google Jules color scheme and typography

3. **API Integration:**
   - None (layout-level changes)

4. **Components to Reuse:**
   - Existing font loading (Geist fonts)
   - Current layout structure

### Phase 2: Core Features (Week 2)

#### Task 2.1: Implement Workspace Creation Flow

**Implementation Plan:**
1. **Files to Modify:**
   - `src/components/NewWorkspaceForm.tsx` (enhance with OpenCode integration)
   - `src/hooks/useTasks.ts` (add workspace creation functions)

2. **Key Functionality:**
   - Implement form validation for folder and model selection
   - Handle workspace creation through OpenCode API
   - Add loading states and error handling
   - Provide user feedback during creation process

3. **API Integration:**
   - `/api/workspaces` (POST) - Create new workspace
   - `/api/folders` (GET) - Get available folders
   - `/api/models` (GET) - Get available models

4. **Components to Reuse:**
   - Existing FolderSelector and ModelSelector components
   - Current error display patterns
   - Existing loading state implementations

#### Task 2.2: Integrate Plan Generation and Approval Workflow

**Implementation Plan:**
1. **Files to Create/Modify:**
   - `src/components/PlanVisualization.tsx` (new component)
   - `src/hooks/useTasks.ts` (add plan functions)
   - `src/components/WorkspaceChat.tsx` (add plan integration)

2. **Key Functionality:**
   - Implement plan generation through `/api/agent/plan`
   - Create visual plan display with step-by-step execution
   - Add approval/rejection controls for plans
   - Handle plan execution status updates

3. **API Integration:**
   - `/api/agent/plan` (POST) - Generate execution plan
   - SSE connection for real-time plan updates

4. **Components to Reuse:**
   - Existing button components for controls
   - Current error handling patterns
   - Existing status indicator components

#### Task 2.3: Implement Chat Interface with Message History

**Implementation Plan:**
1. **Files to Modify:**
   - `src/components/WorkspaceChat.tsx` (enhance chat functionality)
   - `src/hooks/useTasks.ts` (add chat message functions)

2. **Key Functionality:**
   - Implement chat message display with history
   - Add message input and submission
   - Handle different message types (user, assistant, tool)
   - Implement auto-scrolling for new messages

3. **API Integration:**
   - `/api/workspaces/[workspaceId]/sessions/[sessionId]/chat` (GET/POST)
   - SSE connection for real-time message updates

4. **Components to Reuse:**
   - Existing chat message components
   - Markdown text rendering
   - Current message synchronization logic

### Phase 3: Enhancement & Polish (Week 3)

#### Task 3.1: Add Command Execution Visualization

**Implementation Plan:**
1. **Files to Create/Modify:**
   - `src/components/CommandExecutionDisplay.tsx` (new component)
   - `src/components/WorkspaceChat.tsx` (integrate command display)

2. **Key Functionality:**
   - Visualize command execution steps
   - Show real-time command output
   - Display execution status (running, completed, failed)
   - Add collapsible sections for command details

3. **API Integration:**
   - Tool execution endpoints
   - SSE for real-time command updates

4. **Components to Reuse:**
   - Existing tool UI components
   - Current error display patterns
   - Markdown text rendering for command output

#### Task 3.2: Implement Status Indicators and Progress Tracking

**Implementation Plan:**
1. **Files to Modify:**
   - `src/components/OpenCodeSidebar.tsx` (add status indicators)
   - `src/components/WorkspaceChat.tsx` (add progress tracking)
   - `src/components/StatusIndicator.tsx` (new component)

2. **Key Functionality:**
   - Add visual status indicators for workspaces/tasks
   - Implement progress tracking for long-running operations
   - Create consistent status color scheme (green, orange, blue, red)
   - Add tooltips with detailed status information

3. **API Integration:**
   - SSE connection for real-time status updates
   - Workspace status endpoints

4. **Components to Reuse:**
   - Existing status display patterns
   - Current tooltip components
   - Color utility classes

#### Task 3.3: Add Search and Filtering Capabilities

**Implementation Plan:**
1. **Files to Create/Modify:**
   - `src/components/OpenCodeSidebar.tsx` (add search functionality)
   - `src/components/SearchBar.tsx` (new component)

2. **Key Functionality:**
   - Implement workspace search by name/description
   - Add filtering by status, model, or folder
   - Add keyboard shortcuts for search focus
   - Implement debounced search to reduce API calls

3. **API Integration:**
   - `/api/workspaces` with query parameters
   - Client-side filtering of existing data

4. **Components to Reuse:**
   - Existing input components
   - Current filtering patterns from other components

#### Task 3.4: Polish Mobile Responsiveness

**Implementation Plan:**
1. **Files to Modify:**
   - `src/components/OpenCodeSidebar.tsx` (mobile optimization)
   - `src/components/NewWorkspaceForm.tsx` (mobile forms)
   - `src/components/WorkspaceChat.tsx` (mobile chat)
   - `src/components/MobileNavigation.tsx` (update for new views)

2. **Key Functionality:**
   - Implement bottom navigation bar for main views
   - Optimize touch targets for mobile (minimum 44px)
   - Add collapsible sections for mobile
   - Implement responsive layouts for all breakpoints

3. **API Integration:**
   - None (UI-only changes)

4. **Components to Reuse:**
   - Existing mobile navigation patterns
   - Current responsive utility classes
   - Touch-friendly button components

#### Task 3.5: Add Animations and Transitions

**Implementation Plan:**
1. **Files to Modify:**
   - `src/app/globals.css` (add animation utilities)
   - All new components (add transition effects)

2. **Key Functionality:**
   - Add smooth transitions between views
   - Implement loading animations for async operations
   - Add hover/focus animations for interactive elements
   - Create consistent animation timing and easing

3. **API Integration:**
   - None (UI-only changes)

4. **Components to Reuse:**
   - Existing animation patterns
   - Current loading state implementations
   - CSS transition utilities

### Phase 4: Testing & Refinement (Week 4)

#### Task 4.1: Test Integration with Existing OpenCode Functionality

**Implementation Plan:**
1. **Files to Create:**
   - `tests/test_task_integration.ts` (new test file)

2. **Key Functionality:**
   - Test TaskContext integration with OpenCodeSessionContext
   - Verify workspace creation and management workflows
   - Test plan generation and approval process
   - Validate chat interface with message history

3. **API Integration:**
   - All existing OpenCode API endpoints through integration tests

4. **Components to Reuse:**
   - Existing test patterns and utilities
   - Current API testing infrastructure

#### Task 4.2: Ensure Backward Compatibility

**Implementation Plan:**
1. **Files to Modify:**
   - Existing API route tests (update if needed)
   - `tests/test_backward_compatibility.ts` (new test file)

2. **Key Functionality:**
   - Verify all existing API endpoints still work
   - Test data structure compatibility
   - Ensure SSE connections work with both old and new clients
   - Validate error handling remains consistent

3. **API Integration:**
   - All existing OpenCode API endpoints

4. **Components to Reuse:**
   - Existing API test infrastructure
   - Current integration test patterns

#### Task 4.3: Optimize Performance and Loading States

**Implementation Plan:**
1. **Files to Modify:**
   - All new components (add performance optimizations)
   - `src/hooks/useTasks.ts` (add memoization)

2. **Key Functionality:**
   - Implement React.memo for components with static props
   - Add virtualized lists for long item lists
   - Optimize chat message rendering with windowing
   - Implement proper loading states and skeleton UI

3. **API Integration:**
   - None (performance optimizations)

4. **Components to Reuse:**
   - Existing performance optimization patterns
   - Current loading state implementations

#### Task 4.4: Fix UI/UX Issues and Accessibility

**Implementation Plan:**
1. **Files to Modify:**
   - All new components (based on testing feedback)
   - `src/app/globals.css` (refine styling)

2. **Key Functionality:**
   - Address accessibility issues
   - Fix responsive design problems
   - Improve visual hierarchy and focus states
   - Optimize touch interactions

3. **API Integration:**
   - None (UI fixes)

4. **Components to Reuse:**
   - Existing accessibility patterns
   - Current responsive design utilities

#### Task 4.5: Update Documentation

**Implementation Plan:**
1. **Files to Modify:**
   - `README.md` (update with new UI features)
   - `docs/plan/IMPLEMENTATION_SUMMARY.md` (update with actual implementation)
   - New documentation files for new components

2. **Key Functionality:**
   - Document new UI components and their usage
   - Update API documentation if needed
   - Add migration guide for existing users
   - Include examples and best practices

3. **API Integration:**
   - None (documentation only)

4. **Components to Reuse:**
   - Existing documentation patterns
   - Current README structure

## Parallelization Opportunities

### Component-Level Parallelization
1. **OpenCodeSidebar** and **Root Layout** can be developed simultaneously
2. **NewWorkspaceForm** and **WorkspaceChat** can be developed simultaneously
3. **TaskContext** and **useTasks** hook can be developed simultaneously
4. **Plan visualization** and **chat interface** can be developed simultaneously
5. **Mobile responsiveness** can be implemented in parallel with desktop UI
6. **Styling system** can be developed alongside component implementation

### API Integration Parallelization
1. **Workspace creation API** integration can happen in parallel with **plan generation API** integration
2. **Chat message handling** can be developed in parallel with **command execution tracking**
3. **Search functionality** can be implemented independently of core features

### Testing Parallelization
1. **Unit tests** for individual components can be written as components are developed
2. **Integration tests** for API endpoints can be written in parallel with implementation
3. **UI testing** across different breakpoints can be done in parallel
4. **Accessibility testing** can be performed alongside UI development

## Key Implementation Notes

1. **Data Mapping:**
   - Jules Tasks → OpenCode Workspaces
   - Jules Task Sessions → OpenCode Workspace Sessions
   - Jules Codebases → OpenCode Folders/Projects

2. **State Management:**
   - Extend existing OpenCodeSessionContext rather than replace
   - Maintain backward compatibility with current APIs
   - Use reducer pattern for complex state management

3. **UI/UX Improvements:**
   - Simplified three-view system (Sidebar, New Workspace, Chat)
   - Dark theme with purple accent colors
   - Enhanced plan visualization and approval workflow
   - Improved chat experience with integrated command execution

4. **Technical Considerations:**
   - Maintain existing error handling patterns
   - Implement proper loading states
   - Optimize for mobile with bottom navigation
   - Ensure accessibility compliance