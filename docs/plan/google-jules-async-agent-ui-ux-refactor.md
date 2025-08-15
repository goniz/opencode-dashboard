# OpenCode Dashboard UI/UX Refactor to Google Jules Async Agent Interface

## 1. Overall Architecture Changes

### 1.1. Core Concept Mapping
- **Jules Tasks** → **OpenCode Workspaces**
- **Jules Task Sessions** → **OpenCode Workspace Sessions**
- **Jules Codebases** → **OpenCode Folders/Projects**

### 1.2. State Management
Replace the current `OpenCodeSessionContext` with a new `TaskContext` that manages:
- Workspaces (as tasks)
- Sessions (as sub-tasks or chat sessions within workspaces)
- Chat messages per session
- Execution status and plans

## 2. UI Component Refactoring

### 2.1. Main Layout Changes
- **Current**: Multi-view system with workspaces, workspace dashboard, chat, and tools views
- **Target**: Simplified three-view system:
  1. **Sidebar View** - List of workspaces/sessions
  2. **New Task/Workspace View** - Create new workspace
  3. **Chat View** - Chat interface with plan execution

### 2.2. Color Scheme & Styling
- **Current**: Light/dark mode with custom color variables
- **Target**: Adopt Google Jules' dark theme with purple accent colors:
  - Primary background: `gray-900`
  - Text: `white`/`gray-200`/`gray-300`
  - Accent color: `purple-600`
  - Status colors: green (completed), orange (in-progress), blue (pending), red (failed)

### 2.3. Typography & Spacing
- **Current**: Responsive fluid typography and spacing
- **Target**: Simplified consistent sizing with tighter spacing similar to Google Jules

## 3. Component Implementation Plan

### 3.1. New Components to Create
1. **OpenCodeSidebar** - Replace current workspace manager
   - Recent workspaces list with status indicators
   - Codebase/folder navigation
   - Search functionality
   - Bottom navigation links

2. **NewWorkspaceForm** - Replace current quick start
   - Folder selection with dropdown
   - Branch selection
   - Task/workspace description input
   - Create button with loading state

3. **WorkspaceChat** - Enhanced chat interface
   - Workspace header with back button
   - Plan visualization with step-by-step execution
   - Approval/rejection controls for plans
   - Chat message input
   - Command execution results

### 3.2. Components to Modify
1. **Root Layout** (`src/app/layout.tsx`)
   - Update to use dark theme by default
   - Integrate new TaskProvider context

2. **Mobile Navigation** (`src/components/mobile-navigation.tsx`)
   - Simplify to match Google Jules' minimal mobile UX
   - Remove complex header animations
   - Streamline navigation items

### 3.3. Components to Remove/Replace
1. **WorkspaceManager** - Replace with OpenCodeSidebar
2. **WorkspaceDashboard** - Replace with WorkspaceChat
3. **AgentFlow** - Integrate into WorkspaceChat
4. **QuickStart** - Replace with NewWorkspaceForm
5. **SessionManager** - Integrate into sidebar
6. **ResponsiveSidebar** - Remove, use native sidebar

## 4. State Management Refactor

### 4.1. New Context Structure
Create `TaskContext` that extends the existing OpenCode session context with:
- `workspaces` (equivalent to tasks)
- `currentWorkspace` (equivalent to currentTask)
- `chatMessages` (per workspace/session)
- `commandExecutions` (execution status)
- `codebases` (available folders/projects)
- `isLoading` state
- `currentView` state

### 4.2. Hook Updates
Create `useTasks` hook that extends `useOpenCodeSession` with:
- `createWorkspace` (equivalent to createTask)
- `updateWorkspace` (equivalent to updateTask)
- `setCurrentWorkspace` (equivalent to setCurrentTask)
- `setView` (manage view states)
- `addChatMessage` (add messages to workspace chat)
- `createPlan` (generate execution plan)
- `approvePlan`/`rejectPlan` (plan approval workflow)
- `executePlan` (execute approved plans)
- `executeCommand` (run commands)

## 5. API Integration

### 5.1. Backend Endpoint Mapping
- **Jules Task Creation** → **OpenCode Workspace Creation** (`/api/workspaces`)
- **Jules Plan Execution** → **OpenCode Agent Plan** (`/api/agent/plan`)
- **Jules Chat Messages** → **OpenCode Chat Messages** (`/api/workspaces/[workspaceId]/sessions/[sessionId]/chat`)
- **Jules Command Execution** → **OpenCode Tool Execution** (existing tool endpoints)

### 5.2. Data Structure Mapping
- **Jules Task** → **OpenCode Workspace**
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

## 6. Implementation Steps

### Phase 1: Foundation (Week 1)
**Parallelizable Tasks:**
- Task 1.1: Create new `TaskContext` that extends `OpenCodeSessionContext` (**can be done in parallel with Task 1.4**)
- Task 1.2: Implement state management for workspaces as tasks (**can be done in parallel with Task 1.3**)
- Task 1.3: Create basic UI components (sidebar, new workspace form, chat) (**can be done in parallel with Task 1.2**)
- Task 1.4: Update root layout to use dark theme and new context (**can be done in parallel with Task 1.1**)

### Phase 2: Core Features (Week 2)
**Parallelizable Tasks:**
- Task 2.1: Implement workspace creation flow using existing APIs (**can be done in parallel with Task 2.2**)
- Task 2.2: Integrate with existing OpenCode API endpoints (**can be done in parallel with Task 2.1**)
- Task 2.3: Implement plan generation and approval workflow (**can be done in parallel with Task 2.4**)
- Task 2.4: Create chat interface with message history (**can be done in parallel with Task 2.3**)

### Phase 3: Enhancement & Polish (Week 3)
**Parallelizable Tasks:**
- Task 3.1: Add command execution visualization (**can be done in parallel with Tasks 3.2, 3.3, 3.4, 3.5**)
- Task 3.2: Implement status indicators and progress tracking (**can be done in parallel with Tasks 3.1, 3.3, 3.4, 3.5**)
- Task 3.3: Add search and filtering capabilities (**can be done in parallel with Tasks 3.1, 3.2, 3.4, 3.5**)
- Task 3.4: Polish mobile responsiveness (**can be done in parallel with Tasks 3.1, 3.2, 3.3, 3.5**)
- Task 3.5: Add animations and transitions (**can be done in parallel with Tasks 3.1, 3.2, 3.3, 3.4**)

### Phase 4: Testing & Refinement (Week 4)
**Parallelizable Tasks:**
- Task 4.1: Test all workflows with existing OpenCode functionality (**can be done in parallel with Tasks 4.2, 4.3, 4.4**)
- Task 4.2: Ensure backward compatibility with current API (**can be done in parallel with Tasks 4.1, 4.3, 4.4**)
- Task 4.3: Optimize performance and loading states (**can be done in parallel with Tasks 4.1, 4.2, 4.4**)
- Task 4.4: Fix any UI/UX issues (**can be done in parallel with Tasks 4.1, 4.2, 4.3**)
- Task 4.5: Update documentation and README (**should be done after Tasks 4.1-4.4 are completed**)

## 7. Key UI/UX Improvements

### 7.1. Simplified Navigation
- Single sidebar for all workspace management
- Clear view states (sidebar, new workspace, chat)
- Minimal mobile navigation with bottom bar

### 7.2. Enhanced Plan Visualization
- Step-by-step plan execution with status indicators
- Visual approval/rejection workflow
- Progress tracking for long-running operations

### 7.3. Improved Chat Experience
- Integrated plan display within chat
- Command execution results inline
- Better message grouping and timestamps

### 7.4. Consistent Styling
- Unified dark theme with purple accents
- Consistent spacing and typography
- Improved visual hierarchy and focus states

## 8. Technical Considerations

### 8.1. Backward Compatibility
- Maintain existing API endpoints
- Ensure current workspace data structures still work
- Provide migration path for existing users

### 8.2. Performance Optimization
- Implement virtualized lists for workspace/sidebar items
- Optimize chat message rendering
- Use memoization for expensive computations

### 8.3. Error Handling
- Maintain existing error handling patterns
- Add user-friendly error messages
- Implement graceful degradation for failed operations

## 9. Component-Specific Implementation Details

### 9.1. OpenCodeSidebar Implementation
- Use existing `useOpenCodeSession` hook to get workspace data
- Display workspaces with status indicators (running, stopped, error)
- Implement search functionality for filtering workspaces
- Add "New Workspace" button at the top
- Include codebase navigation section
- Add bottom navigation links (Docs, Discord, etc.)

### 9.2. NewWorkspaceForm Implementation
- Use folder selector component from existing codebase
- Implement model selector with proper API integration
- Add repository/branch selection (optional)
- Include task description input
- Add create button with loading state
- Handle form validation and error states

### 9.3. WorkspaceChat Implementation
- Display workspace information in header
- Show chat messages in main content area
- Implement plan visualization with steps
- Add plan approval/rejection controls
- Include chat input at the bottom
- Show command execution results
- Add back navigation to sidebar

### 9.4. TaskContext Implementation
- Extend existing OpenCode session context
- Add plan management functionality
- Implement chat message handling
- Add command execution tracking
- Maintain backward compatibility with existing APIs

## 10. Styling Guidelines

### 10.1. Color Palette
- Background: `#111827` (gray-900)
- Text primary: `#FFFFFF` (white)
- Text secondary: `#D1D5DB` (gray-300)
- Text tertiary: `#9CA3AF` (gray-400)
- Accent: `#9333EA` (purple-600)
- Success: `#10B981` (green-500)
- Warning: `#F59E0B` (amber-500)
- Error: `#EF4444` (red-500)

### 10.2. Typography
- Headers: Geist Sans, semibold
- Body: Geist Sans, normal
- Code: Geist Mono
- Font sizes: Use consistent scale (12px, 14px, 16px, 18px, 20px, 24px)

### 10.3. Spacing
- Use 4px base unit
- Consistent padding/margin: 4px, 8px, 12px, 16px, 24px, 32px
- Component heights: 36px (small), 44px (default), 56px (large)

### 10.4. Borders & Shadows
- Border radius: 6px (default), 8px (cards), 12px (modals)
- Border color: `#374151` (gray-700)
- Shadows: Subtle elevation for depth

## 11. Mobile Responsiveness

### 11.1. Breakpoints
- Mobile: 0-768px
- Tablet: 769px-1024px
- Desktop: 1025px+

### 11.2. Mobile-Specific Features
- Bottom navigation bar for main views
- Collapsible header that hides on scroll
- Slide-out sidebar for additional options
- Touch-friendly button sizes (minimum 44px)
- Simplified forms with clear focus states

## 12. Accessibility Considerations

### 12.1. Keyboard Navigation
- Ensure all interactive elements are keyboard accessible
- Implement proper focus management
- Add keyboard shortcuts for common actions

### 12.2. Screen Reader Support
- Use semantic HTML elements
- Add appropriate ARIA labels
- Implement proper heading hierarchy

### 12.3. Color Contrast
- Maintain minimum 4.5:1 contrast ratio for text
- Ensure interactive elements have clear focus indicators
- Test with color blindness simulators

## 13. Performance Optimization

### 13.1. Rendering Optimization
- Use React.memo for components with static props
- Implement virtualized lists for long item lists
- Optimize chat message rendering with windowing

### 13.2. Data Fetching
- Implement proper loading states
- Add error boundaries for API calls
- Use caching for frequently accessed data

### 13.3. Bundle Optimization
- Code-split non-critical components
- Optimize image assets
- Minimize third-party dependencies

## 14. Testing Strategy

### 14.1. Unit Tests
- Test context provider functionality
- Test hook implementations
- Test component rendering with different props

### 14.2. Integration Tests
- Test API integration points
- Test end-to-end workflows
- Test error handling scenarios

### 14.3. UI Tests
- Test responsive design across breakpoints
- Test accessibility features
- Test cross-browser compatibility

## 15. Migration Path

### 15.1. Backward Compatibility
- Maintain existing API endpoints
- Keep current workspace data structures
- Provide migration utilities for existing users

### 15.2. Deprecation Strategy
- Mark old components as deprecated
- Provide clear migration documentation
- Maintain old components for one major release

### 15.3. User Communication
- Add in-app notifications about UI changes
- Provide detailed release notes
- Offer support for transition period

## 16. Specific Implementation Notes

### 16.1. Leveraging Existing Components
- Reuse `FolderSelector` component for folder selection
- Reuse `ModelSelector` component for model selection
- Reuse `Button` component with updated styling
- Reuse `FloatingActionButton` for mobile actions

### 16.2. API Integration Points
- `/api/workspaces` - Workspace creation and management
- `/api/workspaces/[workspaceId]/sessions` - Session management
- `/api/agent/plan` - Plan generation
- `/api/workspaces/[workspaceId]/sessions/[sessionId]/chat` - Chat messages
- Existing tool execution endpoints

### 16.3. Data Flow
1. User creates workspace through NewWorkspaceForm
2. Workspace is created via existing API endpoints
3. Workspace appears in OpenCodeSidebar
4. User selects workspace to open chat
5. WorkspaceChat loads with existing session data
6. User requests plan generation through chat
7. Plan is generated and displayed for approval
8. User approves plan and execution begins
9. Command execution results are displayed in chat

### 16.4. Error Handling
- Maintain existing error handling patterns from OpenCode
- Add user-friendly error messages for plan generation
- Implement retry mechanisms for failed operations
- Provide clear recovery paths for common errors

## 17. Parallel Implementation Opportunities

### High-Level Parallelization Strategy
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

### Component-Level Parallelization
- **OpenCodeSidebar** and **Root Layout** can be developed simultaneously
- **NewWorkspaceForm** and **WorkspaceChat** can be developed simultaneously
- **TaskContext** and **useTasks** hook can be developed simultaneously
- **Plan visualization** and **chat interface** can be developed simultaneously
- **Mobile responsiveness** can be implemented in parallel with desktop UI
- **Styling system** can be developed alongside component implementation

### API Integration Parallelization
- **Workspace creation API** integration can happen in parallel with **plan generation API** integration
- **Chat message handling** can be developed in parallel with **command execution tracking**
- **Search functionality** can be implemented independently of core features

### Testing Parallelization
- **Unit tests** for individual components can be written as components are developed
- **Integration tests** for API endpoints can be written in parallel with implementation
- **UI testing** across different breakpoints can be done in parallel
- **Accessibility testing** can be performed alongside UI development

## 18. Implementation Progress

### Completed Tasks:
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

## 19. Key Deliverables Created

1. **Main Implementation Plan**: 
   - File: `docs/plan/google-jules-async-agent-ui-ux-refactor.md`
   - Comprehensive 417-line document detailing the refactor approach
   - Includes parallelization information for all phases and tasks

2. **Implementation Summary**:
   - File: `docs/plan/IMPLEMENTATION_SUMMARY.md`
   - High-level overview of the refactor plan
   - Summary of parallel implementation opportunities

## 20. Plan Highlights

### Core Architecture Changes:
- Simplified three-view system (Sidebar, New Workspace, Chat)
- Dark theme with purple accent colors
- Enhanced plan visualization and approval workflow

### Parallel Implementation Opportunities:
- Phase 1: Foundation tasks can be done in parallel (Context, UI components, Layout)
- Phase 2: Core features can be implemented concurrently (API integration, workflows)
- Phase 3: All enhancement tasks can be done in parallel
- Phase 4: Testing and refinement can be parallelized

### Component Development:
- OpenCodeSidebar (replaces WorkspaceManager)
- NewWorkspaceForm (replaces QuickStart)
- WorkspaceChat (enhanced chat interface)
- TaskContext (extended state management)

## 21. Next Steps

The plan is now ready for implementation by development teams. Key parallelization opportunities have been identified to enable efficient concurrent development across multiple developers or teams.

The plan maintains backward compatibility with existing OpenCode functionality while providing a modern, Google Jules-inspired UI/UX.