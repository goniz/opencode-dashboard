# Streamlined Navigation & UX Plan

**Status**: ⏳ Not Started  
**Created**: 2025-01-26  
**Last Updated**: 2025-01-26

## Overview

This plan reduces the number of clicks required to get from workspace creation to active chat from 5+ clicks to 2 clicks, while improving the overall user experience through streamlined workflows and intelligent defaults.

## Progress Tracking

- [ ] **Phase 1**: Quick Start Workflow *(4/4 tasks)* ⏳ *Not Started*
- [ ] **Phase 2**: Persistent Chat Interface *(5/5 tasks)* ⏳ *Not Started*
- [ ] **Phase 3**: Smart Defaults & Preferences *(4/4 tasks)* ⏳ *Not Started*
- [ ] **Phase 4**: Advanced UX Optimizations *(5/5 tasks)* ⏳ *Not Started*

---

## Current vs. Target User Flows

### Current Flow (5+ clicks)
```
1. Home Page
2. → Click "New Workspace"
3. → Select Folder (browse/select)
4. → Select Model (choose from list)
5. → Click "Open Chat"
6. → Chat Interface
```

### Target Flow (2 clicks)
```
1. Home Page with Quick Start
2. → Click folder + model in one step OR select recent
3. → Auto-open Chat Interface
```

---

## Phase 1: Quick Start Workflow
**Status**: ⏳ Not Started  
**Goal**: Create unified workspace creation with immediate chat access

### Tasks
- [ ] **1.1** Create Quick Start component
  - [ ] Combined folder + model selection interface
  - [ ] Recent folders quick-access list
  - [ ] Workspace templates (React, Python, Node.js, etc.)
  - [ ] One-click workspace creation with auto-chat

- [ ] **1.2** Implement Recent Folders system
  - [ ] Track recently used folders in localStorage
  - [ ] Display recent folders with last-used model
  - [ ] One-click workspace creation from recent items
  - [ ] Folder usage analytics and sorting

- [ ] **1.3** Create Workspace Templates
  ```typescript
  interface WorkspaceTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    defaultModel: string;
    folderPattern?: string; // e.g., "package.json" for Node.js
    quickActions?: string[]; // Common tasks for this type
  }
  ```
  - [ ] React/Next.js template
  - [ ] Python/Django template  
  - [ ] Node.js/Express template
  - [ ] Generic template

- [ ] **1.4** Auto-chat functionality
  - [ ] Automatically open chat when workspace is created
  - [ ] Skip intermediate workspace dashboard
  - [ ] Provide quick access back to workspace management
  - [ ] Remember user preference for auto-chat behavior

---

## Phase 2: Persistent Chat Interface
**Status**: ⏳ Not Started  
**Goal**: Keep chat accessible while managing workspaces

### Tasks
- [ ] **2.1** Implement split-view layout
  - [ ] Resizable sidebar for workspace management
  - [ ] Persistent chat area that doesn't reload
  - [ ] Quick workspace switcher in chat header
  - [ ] Collapsible workspace panel

- [ ] **2.2** Create floating chat interface
  - [ ] Minimizable chat window
  - [ ] Chat continues while browsing workspaces
  - [ ] Quick expand/collapse functionality
  - [ ] Position memory across sessions

- [ ] **2.3** Implement workspace quick-switcher
  - [ ] Keyboard shortcut (Cmd/Ctrl + K) for workspace search
  - [ ] Fuzzy search by folder name or project
  - [ ] Recent workspaces at top of list
  - [ ] Switch workspace without losing chat context

- [ ] **2.4** Add breadcrumb navigation
  - [ ] Clear workspace → session → chat hierarchy
  - [ ] Clickable breadcrumbs for quick navigation
  - [ ] Context-aware navigation options
  - [ ] Mobile-friendly breadcrumb design

- [ ] **2.5** Session continuity features
  - [ ] Preserve chat state when switching workspaces
  - [ ] Auto-save draft messages
  - [ ] Session restoration after browser refresh
  - [ ] Cross-workspace session management

---

## Phase 3: Smart Defaults & Preferences
**Status**: ⏳ Not Started  
**Goal**: Reduce decision fatigue with intelligent defaults

### Tasks
- [ ] **3.1** Implement user preferences system
  ```typescript
  interface UserPreferences {
    defaultModel: string;
    autoOpenChat: boolean;
    recentFoldersLimit: number;
    preferredWorkspaceView: 'grid' | 'list';
    chatBehavior: 'persistent' | 'modal' | 'fullscreen';
    keyboardShortcuts: boolean;
  }
  ```
  - [ ] Persistent preferences in localStorage
  - [ ] Settings panel for preference management
  - [ ] Import/export preferences
  - [ ] Reset to defaults option

- [ ] **3.2** Smart model selection
  - [ ] Remember last-used model per folder
  - [ ] Suggest models based on project type detection
  - [ ] Model performance recommendations
  - [ ] Quick model switching in active sessions

- [ ] **3.3** Project type detection
  - [ ] Detect React/Next.js projects (package.json, next.config.js)
  - [ ] Detect Python projects (requirements.txt, pyproject.toml)
  - [ ] Detect Node.js projects (package.json, node_modules)
  - [ ] Auto-suggest appropriate models and templates

- [ ] **3.4** Intelligent workspace organization
  - [ ] Auto-categorize workspaces by project type
  - [ ] Smart sorting (recent, frequent, alphabetical)
  - [ ] Workspace tagging and filtering
  - [ ] Search across workspace history

---

## Phase 4: Advanced UX Optimizations
**Status**: ⏳ Not Started  
**Goal**: Polish the experience with advanced UX patterns

### Tasks
- [ ] **4.1** Implement keyboard shortcuts
  ```typescript
  const shortcuts = {
    'cmd+k': 'Open workspace switcher',
    'cmd+n': 'New workspace quick start',
    'cmd+t': 'New session in current workspace',
    'cmd+w': 'Close current session',
    'cmd+shift+w': 'Close workspace',
    'cmd+1-9': 'Switch to workspace N',
    'esc': 'Close modals/return to main view'
  };
  ```
  - [ ] Global keyboard shortcut handler
  - [ ] Visual shortcut hints in UI
  - [ ] Customizable shortcut preferences
  - [ ] Help overlay with all shortcuts

- [ ] **4.2** Add progressive disclosure
  - [ ] Hide advanced options behind "Advanced" toggles
  - [ ] Show more options as users become experienced
  - [ ] Contextual help and onboarding
  - [ ] Adaptive UI based on usage patterns

- [ ] **4.3** Implement smart loading states
  - [ ] Skeleton screens for workspace loading
  - [ ] Progressive loading of workspace list
  - [ ] Optimistic UI updates
  - [ ] Background workspace status updates

- [ ] **4.4** Add contextual actions
  - [ ] Right-click context menus
  - [ ] Hover actions on workspace cards
  - [ ] Bulk operations (select multiple workspaces)
  - [ ] Quick actions based on workspace state

- [ ] **4.5** Implement undo/redo functionality
  - [ ] Undo workspace deletion (with timeout)
  - [ ] Undo session closure
  - [ ] Action history and replay
  - [ ] Confirmation dialogs for destructive actions

---

## Component Architecture Changes

### New Quick Start Component
```typescript
interface QuickStartProps {
  onWorkspaceCreated: (workspace: OpenCodeWorkspace) => void;
  recentFolders: RecentFolder[];
  templates: WorkspaceTemplate[];
}

const QuickStart = ({ onWorkspaceCreated, recentFolders, templates }: QuickStartProps) => {
  return (
    <div className="quick-start">
      {/* Recent Folders Section */}
      <RecentFolders folders={recentFolders} onSelect={createFromRecent} />
      
      {/* Templates Section */}
      <WorkspaceTemplates templates={templates} onSelect={createFromTemplate} />
      
      {/* Custom Creation */}
      <CustomWorkspaceCreator onSubmit={createCustomWorkspace} />
    </div>
  );
};
```

### Enhanced Workspace Manager
```typescript
interface WorkspaceManagerProps {
  view: 'quick-start' | 'management' | 'split-view';
  persistentChat?: boolean;
  onViewChange: (view: string) => void;
}
```

### Persistent Chat Layout
```typescript
const PersistentChatLayout = () => {
  return (
    <div className="flex h-screen">
      <ResizablePanel defaultSize={300} minSize={250} maxSize={500}>
        <WorkspaceManager view="management" />
      </ResizablePanel>
      <div className="flex-1">
        <OpenCodeChatInterface persistent={true} />
      </div>
    </div>
  );
};
```

---

## User Experience Metrics

### Success Metrics
- **Time to First Chat**: Reduce from 30+ seconds to <10 seconds
- **Click Reduction**: From 5+ clicks to 2 clicks maximum
- **User Retention**: Measure return usage after first session
- **Task Completion**: Track successful workspace → chat flows

### Measurement Points
- [ ] Time from page load to first message sent
- [ ] Number of clicks in workspace creation flow
- [ ] Abandonment rate in workspace creation
- [ ] Frequency of workspace switching
- [ ] Usage of quick start vs. manual creation

---

## Breaking Changes

⚠️ **This plan may introduce breaking changes:**
- Main page layout will change significantly
- Workspace creation flow will be completely redesigned
- Navigation patterns will change
- Some existing UI patterns may be deprecated
- URL structure may change for new flows

## Benefits

✅ **Key Benefits:**
1. **Faster Onboarding**: New users can start chatting in seconds
2. **Reduced Friction**: Fewer steps to accomplish common tasks
3. **Better Retention**: Smoother experience encourages continued use
4. **Power User Features**: Advanced shortcuts and preferences
5. **Intelligent Defaults**: Less decision fatigue for users
6. **Persistent Context**: Chat doesn't get lost during navigation

---

## A/B Testing Strategy

### Test Variations
1. **Quick Start vs. Traditional**: Compare conversion rates
2. **Auto-chat vs. Manual**: Measure user preference
3. **Split View vs. Modal Chat**: Test engagement levels
4. **Template vs. Custom**: Track creation method preferences

### Success Criteria
- 50% reduction in time to first chat
- 80% reduction in clicks for repeat users
- 25% increase in session duration
- 40% increase in workspace creation completion rate

---

## Completion Checklist

When marking phases as complete, update the progress tracking section at the top and change status indicators:

- ⏳ Not Started
- 🔄 In Progress  
- ✅ Complete
- ❌ Blocked

**Example of completed task:**
- [x] ~~**1.1** Create Quick Start component~~ ✅ *Completed 2025-01-26*

**Example of completed phase:**
- [x] **Phase 1**: Quick Start Workflow *(4/4 tasks)* ✅ *Completed 2025-01-26*