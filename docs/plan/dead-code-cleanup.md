# Dead Code Cleanup Plan

**Status**: ⏳ Not Started  
**Created**: 2025-08-02  
**Last Updated**: 2025-08-02

## Overview

This plan identifies and removes dead code, unused components, orphaned files, and unnecessary assets from the opencode-dashboard project to improve maintainability, reduce bundle size, and eliminate confusion.

## Progress Tracking

- [ ] **Phase 1**: Root-Level Component Cleanup *(6/6 tasks)* ⏳ *Not Started*
- [ ] **Phase 2**: Unused Utility Cleanup *(2/2 tasks)* ⏳ *Not Started*
- [ ] **Phase 3**: Asset Cleanup *(6/6 tasks)* ⏳ *Not Started*
- [ ] **Phase 4**: Legacy API Cleanup *(3/3 tasks)* ⏳ *Not Started*
- [ ] **Phase 5**: Verification and Testing *(3/3 tasks)* ⏳ *Not Started*

---

## Phase 1: Root-Level Component Cleanup
**Status**: ⏳ Not Started  
**Goal**: Remove unused UI components that are duplicated or orphaned in the root directory

### Tasks
- [ ] **1.1** Remove unused root-level components
  - [ ] `button.tsx` - Shadcn/ui component not used (components use `../../button` imports)
  - [ ] `markdown-text.tsx` - Only used by `thread.tsx` which is also unused
  - [ ] `thread-list.tsx` - Assistant-ui component not integrated into main app
  - [ ] `thread.tsx` - Assistant-ui component not integrated into main app
  - [ ] `tooltip-icon-button.tsx` - Only used by unused thread components
  - [ ] `tooltip.tsx` - Only used by unused tooltip-icon-button component

- [ ] **1.2** Verify no active imports exist
  - [ ] Search codebase for any remaining imports of these components
  - [ ] Update any found imports to use proper component paths

- [ ] **1.3** Update import paths if needed
  - [ ] Ensure all active components import from `src/components/` directory
  - [ ] Fix any broken imports after cleanup

- [ ] **1.4** Test component removal impact
  - [ ] Run build to ensure no compilation errors
  - [ ] Test UI functionality to ensure no missing components

- [ ] **1.5** Document component architecture
  - [ ] Clarify that UI components should live in `src/components/`
  - [ ] Update any documentation referencing removed components

- [ ] **1.6** Clean up related dependencies
  - [ ] Check if any packages are only used by removed components
  - [ ] Remove unused dependencies from package.json if applicable

---

## Phase 2: Unused Utility Cleanup
**Status**: ⏳ Not Started  
**Goal**: Remove test utilities and unused helper functions

### Tasks
- [ ] **2.1** Remove test utilities from source
  - [ ] `src/lib/test-converter.ts` - Test file that should not be in production source
  - [ ] Move to `tests/` directory if needed for development, or remove entirely

- [ ] **2.2** Evaluate utility usage
  - [ ] `src/lib/port-utils.ts` - Verify if this is actually used in the application
  - [ ] Remove if no active imports found

---

## Phase 3: Asset Cleanup
**Status**: ⏳ Not Started  
**Goal**: Remove unused static assets and organize remaining ones

### Tasks
- [ ] **3.1** Remove unused SVG assets
  - [ ] `terminal-icon.svg` - No references found in codebase
  - [ ] `public/file.svg` - No references found in codebase
  - [ ] `public/globe.svg` - No references found in codebase
  - [ ] `public/next.svg` - Default Next.js asset, likely unused
  - [ ] `public/vercel.svg` - Default Vercel asset, likely unused
  - [ ] `public/window.svg` - No references found in codebase

- [ ] **3.2** Verify asset usage
  - [ ] Search for any dynamic imports or references
  - [ ] Check for usage in CSS files or style objects
  - [ ] Verify no external references (documentation, etc.)

- [ ] **3.3** Organize remaining assets
  - [ ] Move any kept assets to appropriate subdirectories
  - [ ] Update any references to moved assets

- [ ] **3.4** Update asset imports
  - [ ] Ensure all remaining assets have proper imports
  - [ ] Use Next.js Image component where appropriate

- [ ] **3.5** Optimize remaining assets
  - [ ] Compress any large images
  - [ ] Convert to appropriate formats (WebP, etc.)

- [ ] **3.6** Document asset usage
  - [ ] Create asset inventory if needed
  - [ ] Document proper asset organization patterns

---

## Phase 4: Legacy API Cleanup
**Status**: ⏳ Not Started  
**Goal**: Remove obsolete API endpoints and unused dependencies

### Tasks
- [ ] **4.1** Remove legacy API routes
  - [ ] Delete `src/app/api/opencode/route.ts` if it exists
  - [ ] Delete `src/app/api/opencode-chat/route.ts` if it exists
  - [ ] Delete `src/app/api/folders/route.ts` if it exists

- [ ] **4.2** Clean up unused dependencies
  - [ ] Audit package.json for unused dependencies
  - [ ] Remove any packages only used by deleted components

- [ ] **4.3** Update API references
  - [ ] Update any remaining legacy API calls
  - [ ] Ensure all components use new workspace/session API structure

---

## Phase 5: Verification and Testing
**Status**: ⏳ Not Started  
**Goal**: Ensure cleanup doesn't break functionality and improves performance

### Tasks
- [ ] **5.1** Run comprehensive testing
  - [ ] Execute all existing tests
  - [ ] Test build process
  - [ ] Verify no runtime errors

- [ ] **5.2** Performance verification
  - [ ] Measure bundle size before/after cleanup
  - [ ] Verify faster build times
  - [ ] Check for any performance regressions

- [ ] **5.3** Documentation updates
  - [ ] Update README if needed
  - [ ] Update component documentation
  - [ ] Add guidelines for preventing future dead code

---

## Identified Dead Code

### Root-Level Components (Unused)
- `button.tsx` - Shadcn/ui Button component (duplicated in proper location)
- `markdown-text.tsx` - Markdown rendering component (only used by unused thread.tsx)
- `thread-list.tsx` - Assistant-ui ThreadList component (not integrated)
- `thread.tsx` - Assistant-ui Thread component (not integrated)
- `tooltip-icon-button.tsx` - Tooltip button wrapper (only used by unused components)
- `tooltip.tsx` - Tooltip component (only used by unused tooltip-icon-button)

### Utility Files
- `src/lib/test-converter.ts` - Test utilities in production source
- `src/lib/port-utils.ts` - Potentially unused port utility functions

### Static Assets
- `terminal-icon.svg` - Unused SVG icon
- `public/file.svg` - Unused file icon
- `public/globe.svg` - Unused globe icon  
- `public/next.svg` - Default Next.js logo (unused)
- `public/vercel.svg` - Default Vercel logo (unused)
- `public/window.svg` - Unused window icon

---

## Breaking Changes

⚠️ **This cleanup introduces minimal breaking changes:**
- Removed components were not actively used in the application
- Asset removal only affects unused static files
- No API or interface changes expected

## Benefits

✅ **Key Benefits:**
1. **Reduced Bundle Size**: Removing unused components and assets
2. **Cleaner Codebase**: Eliminates confusion about which components to use
3. **Faster Builds**: Fewer files to process during compilation
4. **Better Maintainability**: Clear component organization and structure
5. **Improved Developer Experience**: Less cognitive overhead when navigating codebase
6. **Security**: Removes test utilities from production code

---

## Completion Checklist

When marking phases as complete, update the progress tracking section at the top and change status indicators:

- ⏳ Not Started
- 🔄 In Progress  
- ✅ Complete
- ❌ Blocked

**Example of completed task:**
- [x] ~~**1.1** Remove unused root-level components~~ ✅ *Completed 2025-08-02*

**Example of completed phase:**
- [x] **Phase 1**: Root-Level Component Cleanup *(6/6 tasks)* ✅ *Completed 2025-08-02*