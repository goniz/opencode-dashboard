# OpenCode Dashboard UI/UX Refactor to Google Jules Async Agent Interface

## Implementation Task List

### 1. Overall Architecture Changes

#### 1.1. Core Concept Mapping
- [x] **Jules Tasks** → **OpenCode Workspaces**
- [x] **Jules Task Sessions** → **OpenCode Workspace Sessions**
- [x] **Jules Codebases** → **OpenCode Folders/Projects**

#### 1.2. State Management
- [x] Replace the current `OpenCodeSessionContext` with a new `TaskContext` that manages:
  - [x] Workspaces (as tasks)
  - [x] Sessions (as sub-tasks or chat sessions within workspaces)
  - [x] Chat messages per session
  - [x] Execution status and plans

### 2. UI Component Refactoring

#### 2.1. Main Layout Changes
- [x] **Current**: Multi-view system with workspaces, workspace dashboard, chat, and tools views
- [x] **Target**: Simplified three-view system:
  1. [x] **Sidebar View** - List of workspaces/sessions
  2. [x] **New Task/Workspace View** - Create new workspace
  3. [x] **Chat View** - Chat interface with plan execution

#### 2.2. Color Scheme & Styling
- [x] **Current**: Light/dark mode with custom color variables
- [x] **Target**: Adopt Google Jules' dark theme with purple accent colors:
  - [x] Primary background: `gray-900`
  - [x] Text: `white`/`gray-200`/`gray-300`
  - [x] Accent color: `purple-600`
  - [x] Status colors: green (completed), orange (in-progress), blue (pending), red (failed)

#### 2.3. Typography & Spacing
- [x] **Current**: Responsive fluid typography and spacing
- [x] **Target**: Simplified consistent sizing with tighter spacing similar to Google Jules

### 3. Component Implementation Plan

#### 3.1. New Components to Create
- [x] **OpenCodeSidebar** - Replace current workspace manager
  - [x] Recent workspaces list with status indicators
  - [x] Codebase/folder navigation
  - [x] Search functionality
  - [x] Bottom navigation links

- [x] **NewWorkspaceForm** - Replace current quick start
  - [x] Folder selection with dropdown
  - [x] Branch selection
  - [x] Task/workspace description input
  - [x] Create button with loading state

- [x] **WorkspaceChat** - Enhanced chat interface
  - [x] Workspace header with back button
  - [x] Plan visualization with step-by-step execution
  - [x] Approval/rejection controls for plans
  - [x] Chat message input
  - [x] Command execution results

#### 3.2. Components to Modify
- [x] **Mobile Navigation** (`src/components/mobile-navigation.tsx`)
  - [x] Simplify to match Google Jules' minimal mobile UX
  - [x] Remove complex header animations
  - [x] Streamline navigation items

#### 3.3. Components to Remove/Replace
- [x] **WorkspaceManager** - Replace with OpenCodeSidebar
- [x] **WorkspaceDashboard** - Replace with WorkspaceChat
- [x] **AgentFlow** - Integrate into WorkspaceChat
- [x] **QuickStart** - Replace with NewWorkspaceForm
- [x] **SessionManager** - Integrate into sidebar
- [x] **ResponsiveSidebar** - Remove, use native sidebar

### 4. State Management Refactor

#### 4.1. New Context Structure
- [x] Create `TaskContext` that extends the existing OpenCode session context with:
  - [x] `workspaces` (equivalent to tasks)
  - [x] `currentWorkspace` (equivalent to currentTask)
  - [x] `chatMessages` (per workspace/session)
  - [x] `commandExecutions` (execution status)
  - [x] `codebases` (available folders/projects)
  - [x] `isLoading` state
  - [x] `currentView` state

#### 4.2. Hook Updates
- [x] Create `useTasks` hook that extends `useOpenCodeSession` with:
  - [x] `createWorkspace` (equivalent to createTask)
  - [x] `updateWorkspace` (equivalent to updateTask)
  - [x] `setCurrentWorkspace` (equivalent to setCurrentTask)
  - [x] `setView` (manage view states)
  - [x] `addChatMessage` (add messages to workspace chat)
  - [x] `createPlan` (generate execution plan)
  - [x] `approvePlan`/`rejectPlan` (plan approval workflow)
  - [x] `executePlan` (execute approved plans)
  - [x] `executeCommand` (run commands)

### 5. API Integration

#### 5.1. Backend Endpoint Mapping
- [x] **Jules Task Creation** → **OpenCode Workspace Creation** (`/api/workspaces`)
- [x] **Jules Plan Execution** → **OpenCode Agent Plan** (`/api/agent/plan`)
- [x] **Jules Chat Messages** → **OpenCode Chat Messages** (`/api/workspaces/[workspaceId]/sessions/[sessionId]/chat`)
- [x] **Jules Command Execution** → **OpenCode Tool Execution** (existing tool endpoints)

#### 5.2. Data Structure Mapping
- [x] **Jules Task** → **OpenCode Workspace**
  ```typescript
  // Jules
  interface Task {
    id: string
    title: string
    status: "pending" | "in-progress" | "completed" | "failed"
    repository?: string
    branch?: string
    plan?: TaskPlan
  }
  
  // OpenCode (mapped)
  interface Workspace {
    id: string
    title: string // folder name + model
    status: "pending" | "in-progress" | "completed" | "failed" | "running" | "stopped" | "error"
    folder: string
    model: string
    port: number
    plan?: WorkspacePlan
  }
  ```

### 6. Implementation Steps

#### Phase 1: Foundation (Week 1) - COMPLETED
**Parallelizable Tasks:**
- [x] Task 1.1: Create new `TaskContext` that extends `OpenCodeSessionContext` (**can be done in parallel with Task 1.4**)
- [x] Task 1.2: Implement state management for workspaces as tasks (**can be done in parallel with Task 1.3**)
- [x] Task 1.3: Create basic UI components (sidebar, new workspace form, chat) (**can be done in parallel with Task 1.2**)
- [x] Task 1.4: Update root layout to use dark theme and new context (**can be done in parallel with Task 1.1**)

#### Phase 2: Core Features (Week 2) - COMPLETED
**Parallelizable Tasks:**
- [x] Task 2.1: Implement workspace creation flow using existing APIs (**can be done in parallel with Task 2.2**)
- [x] Task 2.2: Integrate with existing OpenCode API endpoints (**can be done in parallel with Task 2.1**)
- [x] Task 2.3: Implement plan generation and approval workflow (**can be done in parallel with Task 2.4**)
- [x] Task 2.4: Create chat interface with message history (**can be done in parallel with Task 2.3**)

#### Phase 3: Enhancement & Polish (Week 3) - IN PROGRESS
**Parallelizable Tasks:**
- [ ] Task 3.1: Add command execution visualization (**can be done in parallel with Tasks 3.2, 3.3, 3.5**)
- [ ] Task 3.2: Implement status indicators and progress tracking (**can be done in parallel with Tasks 3.1, 3.3, 3.5**)
- [ ] Task 3.3: Add search and filtering capabilities (**can be done in parallel with Tasks 3.1, 3.2, 3.5**)
- [x] Task 3.4: Polish mobile responsiveness (**COMPLETED**)
- [ ] Task 3.5: Add animations and transitions (**can be done in parallel with Tasks 3.1, 3.2, 3.3**)

#### Phase 4: Testing & Refinement (Week 4) - PENDING
**Parallelizable Tasks:**
- [ ] Task 4.1: Test all workflows with existing OpenCode functionality (**can be done in parallel with Tasks 4.2, 4.3, 4.4**)
- [ ] Task 4.2: Ensure backward compatibility with current API (**can be done in parallel with Tasks 4.1, 4.3, 4.4**)
- [ ] Task 4.3: Optimize performance and loading states (**can be done in parallel with Tasks 4.1, 4.2, 4.4**)
- [ ] Task 4.4: Fix any UI/UX issues (**can be done in parallel with Tasks 4.1, 4.2, 4.3**)
- [ ] Task 4.5: Update documentation and README (**should be done after Tasks 4.1-4.4 are completed**)

### 7. Key UI/UX Improvements

#### 7.1. Simplified Navigation
- [x] Single sidebar for all workspace management
- [x] Clear view states (sidebar, new workspace, chat)
- [x] Minimal mobile navigation with bottom bar

#### 7.2. Enhanced Plan Visualization
- [x] Step-by-step plan execution with status indicators
- [x] Visual approval/rejection workflow
- [ ] Progress tracking for long-running operations

#### 7.3. Improved Chat Experience
- [x] Integrated plan display within chat
- [x] Command execution results inline
- [ ] Better message grouping and timestamps

#### 7.4. Consistent Styling
- [x] Unified dark theme with purple accents
- [x] Consistent spacing and typography
- [ ] Improved visual hierarchy and focus states

### 8. Technical Considerations

#### 8.1. Backward Compatibility
- [x] Maintain existing API endpoints
- [x] Ensure current workspace data structures still work
- [ ] Provide migration path for existing users

#### 8.2. Performance Optimization
- [ ] Implement virtualized lists for workspace/sidebar items
- [ ] Optimize chat message rendering
- [ ] Use memoization for expensive computations

#### 8.3. Error Handling
- [x] Maintain existing error handling patterns
- [ ] Add user-friendly error messages
- [ ] Implement graceful degradation for failed operations

### 9. Component-Specific Implementation Details

#### 9.1. OpenCodeSidebar Implementation
- [x] Use existing `useOpenCodeSession` hook to get workspace data
- [x] Display workspaces with status indicators (running, stopped, error)
- [x] Implement search functionality for filtering workspaces
- [x] Add "New Workspace" button at the top
- [x] Include codebase navigation section
- [x] Add bottom navigation links (Docs, Discord, etc.)

#### 9.2. NewWorkspaceForm Implementation
- [x] Use folder selector component from existing codebase
- [x] Implement model selector with proper API integration
- [x] Add repository/branch selection (optional)
- [x] Include task description input
- [x] Add create button with loading state
- [x] Handle form validation and error states

#### 9.3. WorkspaceChat Implementation
- [x] Display workspace information in header
- [x] Show chat messages in main content area
- [x] Implement plan visualization with steps
- [x] Add plan approval/rejection controls
- [x] Include chat input at the bottom
- [x] Show command execution results
- [x] Add back navigation to sidebar

#### 9.4. TaskContext Implementation
- [x] Extend existing OpenCode session context
- [x] Add plan management functionality
- [x] Implement chat message handling
- [x] Add command execution tracking
- [x] Maintain backward compatibility with existing APIs

### 10. Styling Guidelines

#### 10.1. Color Palette
- [x] Background: `#111827` (gray-900)
- [x] Text primary: `#FFFFFF` (white)
- [x] Text secondary: `#D1D5DB` (gray-300)
- [x] Text tertiary: `#9CA3AF` (gray-400)
- [x] Accent: `#9333EA` (purple-600)
- [x] Success: `#10B981` (green-500)
- [x] Warning: `#F59E0B` (amber-500)
- [x] Error: `#EF4444` (red-500)

#### 10.2. Typography
- [x] Headers: Geist Sans, semibold
- [x] Body: Geist Sans, normal
- [x] Code: Geist Mono
- [x] Font sizes: Use consistent scale (12px, 14px, 16px, 18px, 20px, 24px)

#### 10.3. Spacing
- [x] Use 4px base unit
- [x] Consistent padding/margin: 4px, 8px, 12px, 16px, 24px, 32px
- [x] Component heights: 36px (small), 44px (default), 56px (large)

#### 10.4. Borders & Shadows
- [x] Border radius: 6px (default), 8px (cards), 12px (modals)
- [x] Border color: `#374151` (gray-700)
- [x] Shadows: Subtle elevation for depth

### 11. Mobile Responsiveness

#### 11.1. Breakpoints
- [x] Mobile: 0-768px
- [x] Tablet: 769px-1024px
- [x] Desktop: 1025px+

#### 11.2. Mobile-Specific Features
- [x] Bottom navigation bar for main views
- [x] Simplified fixed header (removed collapsible behavior)
- [x] Touch-friendly button sizes (minimum 44px)
- [x] Simplified forms with clear focus states

### 12. Accessibility Considerations

#### 12.1. Keyboard Navigation
- [ ] Ensure all interactive elements are keyboard accessible
- [ ] Implement proper focus management
- [ ] Add keyboard shortcuts for common actions

#### 12.2. Screen Reader Support
- [ ] Use semantic HTML elements
- [ ] Add appropriate ARIA labels
- [ ] Implement proper heading hierarchy

#### 12.3. Color Contrast
- [ ] Maintain minimum 4.5:1 contrast ratio for text
- [ ] Ensure interactive elements have clear focus indicators
- [ ] Test with color blindness simulators

### 13. Performance Optimization

#### 13.1. Rendering Optimization
- [ ] Use React.memo for components with static props
- [ ] Implement virtualized lists for long item lists
- [ ] Optimize chat message rendering with windowing

#### 13.2. Data Fetching
- [ ] Implement proper loading states
- [ ] Add error boundaries for API calls
- [ ] Use caching for frequently accessed data

#### 13.3. Bundle Optimization
- [ ] Code-split non-critical components
- [ ] Optimize image assets
- [ ] Minimize third-party dependencies

### 14. Testing Strategy

#### 14.1. Unit Tests
- [ ] Test context provider functionality
- [ ] Test hook implementations
- [ ] Test component rendering with different props

#### 14.2. Integration Tests
- [ ] Test API integration points
- [ ] Test end-to-end workflows
- [ ] Test error handling scenarios

#### 14.3. UI Tests
- [ ] Test responsive design across breakpoints
- [ ] Test accessibility features
- [ ] Test cross-browser compatibility

### 15. Migration Path

#### 15.1. Backward Compatibility
- [x] Maintain existing API endpoints
- [x] Keep current workspace data structures
- [ ] Provide migration utilities for existing users

#### 15.2. Deprecation Strategy
- [ ] Mark old components as deprecated
- [ ] Provide clear migration documentation
- [ ] Maintain old components for one major release

#### 15.3. User Communication
- [ ] Add in-app notifications about UI changes
- [ ] Provide detailed release notes
- [ ] Offer support for transition period

### 16. Specific Implementation Notes

#### 16.1. Leveraging Existing Components
- [x] Reuse `FolderSelector` component for folder selection
- [x] Reuse `ModelSelector` component for model selection
- [x] Reuse `Button` component with updated styling
- [x] Reuse `FloatingActionButton` for mobile actions

#### 16.2. API Integration Points
- [x] `/api/workspaces` - Workspace creation and management
- [x] `/api/workspaces/[workspaceId]/sessions` - Session management
- [x] `/api/agent/plan` - Plan generation
- [x] `/api/workspaces/[workspaceId]/sessions/[sessionId]/chat` - Chat messages
- [x] Existing tool execution endpoints

#### 16.3. Data Flow
1. [x] User creates workspace through NewWorkspaceForm
2. [x] Workspace is created via existing API endpoints
3. [x] Workspace appears in OpenCodeSidebar
4. [x] User selects workspace to open chat
5. [x] WorkspaceChat loads with existing session data
6. [x] User requests plan generation through chat
7. [x] Plan is generated and displayed for approval
8. [x] User approves plan and execution begins
9. [x] Command execution results are displayed in chat

#### 16.4. Error Handling
- [x] Maintain existing error handling patterns from OpenCode
- [ ] Add user-friendly error messages for plan generation
- [ ] Implement retry mechanisms for failed operations
- [ ] Provide clear recovery paths for common errors

### 17. Parallel Implementation Opportunities

#### High-Level Parallelization Strategy
The refactor can be implemented with significant parallelization across teams or developers:

1. **Frontend UI Development** (2-3 developers):
   - Developer 1: OpenCodeSidebar component and layout updates
   - Developer 2: NewWorkspaceForm and mobile responsiveness
   - Developer 3: WorkspaceChat interface and plan visualization

2. **State Management & API Integration** (2 developers):
   - Developer 1: TaskContext extension and state management
   - Developer 2: API integration and plan workflow implementation

3. **Styling & Polish** (1-2 developers):
   - Developer 1: Dark theme implementation and styling system
   - Developer 2: Animations, transitions, and visual polish

#### Component-Level Parallelization
- [x] **OpenCodeSidebar** and **Root Layout** can be developed simultaneously
- [x] **NewWorkspaceForm** and **WorkspaceChat** can be developed simultaneously
- [x] **TaskContext** and **useTasks** hook can be developed simultaneously
- [x] **Plan visualization** and **chat interface** can be developed simultaneously
- [x] **Mobile responsiveness** can be implemented in parallel with desktop UI
- [ ] **Styling system** can be developed alongside component implementation

#### API Integration Parallelization
- [x] **Workspace creation API** integration can happen in parallel with **plan generation API** integration
- [x] **Chat message handling** can be developed in parallel with **command execution tracking**
- [x] **Search functionality** can be implemented independently of core features

#### Testing Parallelization
- [x] **Unit tests** for individual components can be written as components are developed
- [x] **Integration tests** for API endpoints can be written in parallel with implementation
- [x] **UI testing** across different breakpoints can be done in parallel
- [ ] **Accessibility testing** can be performed alongside UI development

### 18. Implementation Progress

#### Completed Tasks:
1. **Task 1.2: State Management for Workspaces as Tasks** - COMPLETED
   - Enhanced `src/hooks/useTasks.ts` with comprehensive task management functionality
   - Implemented task data structures mapping to workspaces
   - Added task status management (pending, in-progress, completed, failed)
   - Implemented plan state management within tasks
   - Added task creation/update functions
   - Integrated with `/api/workspaces` for task/workspace creation
   - Integrated with `/api/agent/plan` for plan generation
   - Reused existing workspace data structures and SSE update handling

2. **OpenCodeSidebar Component Implementation** - COMPLETED
   - Created `OpenCodeSidebar` component in `src/components/ui/opencode-sidebar.tsx`
   - Implemented workspace list with status indicators (running, stopped, error)
   - Added search functionality for filtering workspaces and codebases
   - Integrated "New Workspace" button
   - Added codebase navigation section
   - Implemented bottom navigation links (Docs, Community, Settings)
   - Connected component to `useTaskContext` for data management

3. **NewWorkspaceForm Component Implementation** - COMPLETED
   - Created `NewWorkspaceForm` component in `src/components/ui/new-workspace-form.tsx`
   - Implemented folder selection with integrated folder browser
   - Added simplified workflow without immediate model selection
   - Integrated with `useTaskContext` for workspace creation
   - Designed with Google Jules dark theme styling (purple accents)
   - Added back navigation to sidebar view

4. **Root Layout Update** - COMPLETED
   - Updated `src/app/layout.tsx` to use `TaskProvider` instead of `OpenCodeSessionProvider`
   - Added default dark theme background colors
   - Maintained backward compatibility with existing functionality

5. **Google Jules Dark Theme Implementation** - COMPLETED
   - Updated `src/app/globals.css` with Google Jules color palette
   - Implemented dark theme as default (gray-900 background with white text)
   - Added purple accent colors for primary actions and UI elements
   - Added status colors for workspace states
   - Created custom component styles for buttons and status indicators

6. **WorkspaceChat Component Implementation** - COMPLETED
   - Created `WorkspaceChat` component in `src/components/ui/workspace-chat.tsx`
   - Implemented chat interface with integrated plan visualization
   - Added plan approval/rejection workflow
   - Integrated with `useTaskContext` for task and plan management
   - Designed with Google Jules dark theme styling (purple accents)
   - Added back navigation to sidebar view
   - Integrated existing OpenCode chat functionality through Thread component

7. **Task 3.4: Polish Mobile Responsiveness** - COMPLETED
   - Updated `src/components/mobile-navigation.tsx` to match Google Jules minimal mobile UX design
   - Replaced slide-out drawer with fixed bottom navigation bar using purple accent colors
   - Simplified mobile header with back button navigation
   - Updated mobile navigation props to use `onBackToWorkspaces` instead of `onBackToSidebar`
   - Extended mobile navigation to handle all view states including workspace-dashboard, tools, and workspaces
   - Ensured touch-friendly button sizes (minimum 44px) for mobile usability
   - Replaced deprecated components in main page:
     * `WorkspaceDashboard` → `WorkspaceChat`
     * `AgentFlow` → `WorkspaceChat`
     * `QuickStart` → `NewWorkspaceForm`
     * `WorkspaceManager` → `OpenCodeSidebar`

### 19. Key Deliverables Created

1. **Main Implementation Plan**: 
   - File: `docs/plan/google-jules-async-agent-ui-ux-refactor.md`
   - Comprehensive 417-line document detailing the refactor approach
   - Includes parallelization information for all phases and tasks

2. **Implementation Summary**:
   - File: `docs/plan/IMPLEMENTATION_SUMMARY.md`
   - High-level overview of the refactor plan
   - Summary of parallel implementation opportunities

### 20. Plan Highlights

#### Core Architecture Changes:
- [x] Simplified three-view system (Sidebar, New Workspace, Chat)
- [x] Dark theme with purple accent colors
- [x] Enhanced plan visualization and approval workflow

#### Parallel Implementation Opportunities:
- [x] Phase 1: Foundation tasks can be done in parallel (Context, UI components, Layout)
- [x] Phase 2: Core features can be implemented concurrently (API integration, workflows)
- [ ] Phase 3: All enhancement tasks can be done in parallel
- [ ] Phase 4: Testing and refinement can be parallelized

#### Component Development:
- [x] OpenCodeSidebar (replaces WorkspaceManager)
- [x] NewWorkspaceForm (replaces QuickStart)
- [x] WorkspaceChat (enhanced chat interface)
- [x] TaskContext (extended state management)

### 21. Next Steps

The plan is now ready for implementation by development teams. Key parallelization opportunities have been identified to enable efficient concurrent development across multiple developers or teams.

The plan maintains backward compatibility with existing OpenCode functionality while providing a modern, Google Jules-inspired UI/UX.