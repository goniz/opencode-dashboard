# OpenCode Subprocess Cleanup Plan

**Status**: ⏳ Not Started  
**Created**: 2025-01-27  
**Last Updated**: 2025-08-04

## Overview

This plan ensures all OpenCode subprocesses are properly stopped and cleaned up during server shutdown scenarios (both clean and dirty shutdowns). Currently, the workspace manager spawns OpenCode subprocesses but lacks comprehensive cleanup handlers for various shutdown scenarios, potentially leaving zombie processes.

## Progress Tracking

- [ ] **Phase 1**: Global Process Cleanup Handler *(4/4 tasks)* ⏳ *Not Started*
- [ ] **Phase 2**: Enhanced Workspace Manager *(5/5 tasks)* ⏳ *Not Started*
- [ ] **Phase 3**: Next.js Integration & Coordination *(4/4 tasks)* ⏳ *Not Started*
- [ ] **Phase 4**: Testing & Monitoring *(4/4 tasks)* ⏳ *Not Started*

---

## Current Issues Identified

### Critical Problems
1. **No global shutdown handlers** - No listeners for SIGTERM, SIGINT, SIGQUIT process signals
2. **Unhandled crash scenarios** - No cleanup on uncaughtException or unhandledRejection
3. **Potential zombie processes** - OpenCode subprocesses could become orphaned if main process dies
4. **Race conditions** - Multiple shutdown events could interfere with cleanup
5. **No Next.js lifecycle integration** - Not hooked into Next.js server shutdown process

### Current Cleanup Limitations
- `stopWorkspace()` only handles individual workspace cleanup
- `stopAllWorkspaces()` exists but isn't called on process termination
- Process cleanup uses basic SIGTERM → SIGKILL pattern without verification
- No process group management for nested processes
- No cleanup retry logic or error recovery

---

## Phase 1: Global Process Cleanup Handler
**Status**: ⏳ Not Started  
**Goal**: Create comprehensive process signal handling and cleanup coordination

### Tasks
- [x] ~~**1.1** Create process cleanup module~~ ✅ *Completed 2025-08-04*
  ```typescript
  // src/lib/process-cleanup.ts
  interface CleanupHandler {
    name: string;
    priority: number; // Higher priority runs first
    cleanup: () => Promise<void>;
    timeout?: number; // Max time allowed for cleanup
  }

  class ProcessCleanupManager {
    private handlers: CleanupHandler[] = [];
    private isShuttingDown: boolean = false;
    private shutdownPromise?: Promise<void>;
    
    registerHandler(handler: CleanupHandler): void;
    unregisterHandler(name: string): void;
    initiateShutdown(signal?: string): Promise<void>;
    private executeCleanup(): Promise<void>;
  }
  ```

- [x] ~~**1.2** Implement signal handlers~~ ✅ *Completed 2025-08-04*
  ```typescript
  // Handle all relevant process signals
  const signals = ['SIGTERM', 'SIGINT', 'SIGQUIT', 'SIGHUP'] as const;
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, initiating graceful shutdown...`);
      await cleanupManager.initiateShutdown(signal);
      process.exit(0);
    });
  });
  ```
  
  **Implementation Notes:**
  - Added `initializeSignalHandlers()` function to `src/lib/process-cleanup.ts`
  - Handles SIGTERM, SIGINT, SIGQUIT, and SIGHUP signals
  - Uses existing `processCleanupManager` singleton for coordination
  - Includes duplicate initialization protection
  - Provides logging for signal reception and handler initialization

- [x] ~~**1.3** Add exception and rejection handlers~~ ✅ *Completed 2025-08-04*
  ```typescript
  // Handle unhandled exceptions
  process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    await cleanupManager.initiateShutdown('uncaughtException');
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    await cleanupManager.initiateShutdown('unhandledRejection');
    process.exit(1);
  });
  ```
  
  **Implementation Notes:**
  - Added `initializeExceptionHandlers()` function to `src/lib/process-cleanup.ts`
  - Handles uncaughtException and unhandledRejection events
  - Uses existing `processCleanupManager` singleton for coordination
  - Includes duplicate initialization protection and error handling during cleanup
  - Added `initializeAllHandlers()` convenience function for complete setup
  - Provides logging for exception reception and handler initialization

- [ ] **1.4** Implement graceful shutdown with timeout
  ```typescript
  interface ShutdownConfig {
    gracefulTimeout: number; // Default: 10 seconds
    forceTimeout: number;    // Default: 5 seconds
    retryAttempts: number;   // Default: 3
    retryDelay: number;      // Default: 1 second
  }
  
  // Graceful shutdown with fallback to force termination
  // Cleanup verification and retry logic
  // Comprehensive logging for debugging
  ```

---

## Phase 2: Enhanced Workspace Manager
**Status**: ⏳ Not Started  
**Goal**: Improve workspace process management and cleanup reliability

### Tasks
- [ ] **2.1** Add shutdown state management
  ```typescript
  // Enhance OpenCodeWorkspaceManager
  class OpenCodeWorkspaceManager {
    private isShuttingDown: boolean = false;
    private shutdownPromise?: Promise<void>;
    
    // Prevent new workspace creation during shutdown
    async startWorkspace(config: OpenCodeWorkspaceConfig): Promise<OpenCodeWorkspace> {
      if (this.isShuttingDown) {
        throw new OpenCodeWorkspaceError('Cannot create workspace during shutdown');
      }
      // ... existing logic
    }
    
    // Graceful shutdown with proper coordination
    async initiateShutdown(): Promise<void>;
  }
  ```

- [ ] **2.2** Implement process group management
  ```typescript
  // Use process groups for better cleanup
  const process = spawn("opencode", ["serve", "--port=0", "--print-logs"], {
    cwd: config.folder,
    stdio: ["pipe", "pipe", "inherit"],
    detached: false, // Keep in same process group
    killSignal: 'SIGTERM'
  });
  
  // Store process metadata for better tracking
  interface ProcessMetadata {
    pid: number;
    startTime: Date;
    command: string[];
    cwd: string;
  }
  ```

- [ ] **2.3** Enhance stopWorkspace with verification
  ```typescript
  async stopWorkspace(workspaceId: string, options?: {
    timeout?: number;
    retryAttempts?: number;
    forceKill?: boolean;
  }): Promise<void> {
    // 1. Send SIGTERM and wait for graceful shutdown
    // 2. Verify process has actually terminated
    // 3. Retry with exponential backoff if needed
    // 4. Force kill with SIGKILL as last resort
    // 5. Clean up process tree if necessary
    // 6. Verify cleanup success
  }
  ```

- [ ] **2.4** Add process health monitoring
  ```typescript
  // Monitor process health and auto-cleanup dead processes
  private startProcessMonitoring(): void {
    setInterval(() => {
      this.workspaces.forEach(async (workspace) => {
        if (workspace.process && !this.isProcessAlive(workspace.process)) {
          console.warn(`Detected dead process for workspace ${workspace.id}`);
          await this.cleanupDeadWorkspace(workspace.id);
        }
      });
    }, 30000); // Check every 30 seconds
  }
  
  private isProcessAlive(process: ChildProcess): boolean;
  private async cleanupDeadWorkspace(workspaceId: string): Promise<void>;
  ```

- [ ] **2.5** Implement cleanup retry logic
  ```typescript
  // Exponential backoff retry for failed cleanup attempts
  private async retryCleanup(
    workspaceId: string, 
    attempts: number = 3,
    delay: number = 1000
  ): Promise<boolean> {
    for (let i = 0; i < attempts; i++) {
      try {
        await this.stopWorkspace(workspaceId, { forceKill: i === attempts - 1 });
        return true;
      } catch (error) {
        if (i < attempts - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    return false;
  }
  ```

---

## Phase 3: Next.js Integration & Coordination
**Status**: ⏳ Not Started  
**Goal**: Integrate cleanup handlers with Next.js application lifecycle

### Tasks
- [ ] **3.1** Create shutdown coordinator module
  ```typescript
  // src/lib/shutdown-manager.ts
  class ShutdownManager {
    private static instance: ShutdownManager;
    private cleanupManager: ProcessCleanupManager;
    private workspaceManager: OpenCodeWorkspaceManager;
    
    static getInstance(): ShutdownManager;
    async initialize(): Promise<void>;
    async registerWorkspaceCleanup(): Promise<void>;
    async shutdown(signal?: string): Promise<void>;
  }
  ```

- [ ] **3.2** Initialize cleanup handlers on app startup
  ```typescript
  // src/lib/app-initialization.ts
  export async function initializeCleanupHandlers(): Promise<void> {
    const shutdownManager = ShutdownManager.getInstance();
    await shutdownManager.initialize();
    
    // Register workspace cleanup handler
    await shutdownManager.registerWorkspaceCleanup();
    
    console.log('Process cleanup handlers initialized');
  }
  ```

- [ ] **3.3** Hook into Next.js application lifecycle
  ```typescript
  // src/app/layout.tsx or middleware.ts
  import { initializeCleanupHandlers } from '@/lib/app-initialization';
  
  // Initialize cleanup handlers when the app starts
  if (typeof window === 'undefined') { // Server-side only
    initializeCleanupHandlers().catch(console.error);
  }
  ```

- [ ] **3.4** Add development vs production configuration
  ```typescript
  interface CleanupConfig {
    development: {
      gracefulTimeout: 5000;   // Shorter timeout for dev
      enableVerboseLogging: true;
      enableProcessMonitoring: true;
    };
    production: {
      gracefulTimeout: 15000;  // Longer timeout for prod
      enableVerboseLogging: false;
      enableProcessMonitoring: true;
      enableMetrics: true;
    };
  }
  ```

---

## Phase 4: Testing & Monitoring
**Status**: ⏳ Not Started  
**Goal**: Validate cleanup functionality and add monitoring capabilities

### Tasks
- [ ] **4.1** Create comprehensive test suite
  ```typescript
  // tests/cleanup/
  ├── process-cleanup.test.ts     # Unit tests for cleanup manager
  ├── workspace-cleanup.test.ts   # Workspace-specific cleanup tests
  ├── signal-handling.test.ts     # Signal handler tests
  └── integration-cleanup.test.ts # End-to-end cleanup tests
  ```
  - [ ] Test graceful shutdown scenarios (SIGTERM, SIGINT)
  - [ ] Test crash scenarios (uncaughtException, unhandledRejection)
  - [ ] Test timeout and retry logic
  - [ ] Test multiple workspace cleanup
  - [ ] Test cleanup verification

- [ ] **4.2** Add monitoring and metrics
  ```typescript
  interface CleanupMetrics {
    totalShutdowns: number;
    successfulCleanups: number;
    failedCleanups: number;
    averageCleanupTime: number;
    timeoutOccurrences: number;
    retryAttempts: number;
    orphanedProcesses: number;
  }
  
  // Log metrics for monitoring
  class CleanupMetrics {
    recordShutdown(signal: string, duration: number, success: boolean): void;
    recordProcessCleanup(workspaceId: string, success: boolean, attempts: number): void;
    getMetrics(): CleanupMetrics;
  }
  ```

- [ ] **4.3** Implement health checks
  ```typescript
  // API endpoint for health monitoring
  // GET /api/health/processes
  export async function GET() {
    const workspaces = workspaceManager.getAllWorkspaces();
    const healthStatus = {
      totalWorkspaces: workspaces.length,
      runningWorkspaces: workspaces.filter(w => w.status === 'running').length,
      healthyProcesses: 0,
      orphanedProcesses: 0,
      lastCleanupTime: null,
      cleanupHandlersRegistered: true
    };
    
    // Check process health
    for (const workspace of workspaces) {
      if (workspace.process) {
        if (isProcessAlive(workspace.process)) {
          healthStatus.healthyProcesses++;
        } else {
          healthStatus.orphanedProcesses++;
        }
      }
    }
    
    return NextResponse.json(healthStatus);
  }
  ```

- [ ] **4.4** Add comprehensive logging
  ```typescript
  // Enhanced logging for debugging and monitoring
  interface CleanupLogger {
    logShutdownInitiated(signal: string): void;
    logWorkspaceCleanupStarted(workspaceId: string): void;
    logWorkspaceCleanupCompleted(workspaceId: string, duration: number): void;
    logWorkspaceCleanupFailed(workspaceId: string, error: Error, attempts: number): void;
    logProcessTerminated(pid: number, signal: string): void;
    logOrphanedProcessDetected(workspaceId: string, pid: number): void;
    logShutdownCompleted(totalDuration: number, successCount: number, failureCount: number): void;
  }
  ```

---

## Implementation Strategy

### Development Approach
1. **Start with Phase 1** - Build the foundation with process cleanup manager
2. **Enhance existing code** - Improve workspace manager incrementally
3. **Add integration points** - Hook into Next.js lifecycle carefully
4. **Test thoroughly** - Validate each phase before moving to the next

### Rollout Plan
```typescript
// Feature flag for gradual rollout
const CLEANUP_CONFIG = {
  enableGlobalHandlers: process.env.ENABLE_PROCESS_CLEANUP === 'true',
  enableProcessMonitoring: process.env.ENABLE_PROCESS_MONITORING === 'true',
  enableMetrics: process.env.ENABLE_CLEANUP_METRICS === 'true',
  gracefulTimeout: parseInt(process.env.CLEANUP_TIMEOUT || '10000'),
};
```

### Backward Compatibility
- Existing `stopWorkspace()` and `stopAllWorkspaces()` methods remain functional
- New cleanup handlers are additive, not replacing existing logic
- Configuration-driven feature enablement
- Graceful degradation if cleanup handlers fail

---

## Error Handling & Recovery

### Cleanup Failure Scenarios
1. **Process won't terminate** - Escalate from SIGTERM to SIGKILL
2. **Cleanup timeout** - Log error and continue with other processes
3. **Multiple shutdown signals** - Prevent duplicate cleanup attempts
4. **Cleanup handler crashes** - Isolate failures and continue with other handlers

### Recovery Mechanisms
```typescript
// Cleanup verification and recovery
async function verifyCleanup(workspaceId: string): Promise<boolean> {
  const workspace = this.workspaces.get(workspaceId);
  if (!workspace?.process) return true;
  
  // Check if process is actually dead
  try {
    process.kill(workspace.process.pid!, 0); // Signal 0 checks if process exists
    return false; // Process still exists
  } catch (error) {
    return true; // Process is dead
  }
}

// Orphaned process recovery
async function cleanupOrphanedProcesses(): Promise<void> {
  // Find and terminate any OpenCode processes that aren't tracked
  // Use system commands to find processes by name/command
  // Clean up any remaining OpenCode processes
}
```

---

## Security Considerations

### Process Security
- **Principle of least privilege** - Only terminate processes we own
- **Process validation** - Verify process identity before termination
- **Signal handling security** - Prevent signal injection attacks
- **Resource cleanup** - Ensure no sensitive data remains in memory

### Implementation Security
```typescript
// Secure process termination
async function secureProcessTermination(process: ChildProcess): Promise<void> {
  // Validate process ownership
  if (process.pid && !isOwnedProcess(process.pid)) {
    throw new Error('Cannot terminate process not owned by this application');
  }
  
  // Clear sensitive data from process memory if possible
  await clearProcessMemory(process);
  
  // Terminate securely
  await terminateProcess(process);
}
```

---

## Performance Impact

### Optimization Strategies
- **Lazy initialization** - Only initialize cleanup handlers when needed
- **Efficient monitoring** - Use minimal resources for process health checks
- **Batch operations** - Group cleanup operations where possible
- **Timeout management** - Prevent cleanup from blocking indefinitely

### Performance Metrics
- Cleanup handler initialization time: < 100ms
- Individual workspace cleanup time: < 2 seconds
- Total shutdown time: < 15 seconds (configurable)
- Memory overhead: < 1MB for cleanup infrastructure

---

## Breaking Changes

⚠️ **This plan introduces minimal breaking changes:**
- New environment variables for configuration
- Additional logging output during shutdown
- Slightly longer shutdown times due to graceful cleanup
- New health check endpoint (additive)

## Benefits

✅ **Key Benefits:**
1. **Reliability** - No more orphaned OpenCode processes
2. **Resource Management** - Proper cleanup prevents resource leaks
3. **Operational Excellence** - Graceful shutdowns improve system stability
4. **Monitoring** - Visibility into process health and cleanup success
5. **Developer Experience** - Better debugging and error handling
6. **Production Ready** - Robust process management for production deployments

---

## Completion Checklist

When marking phases as complete, update the progress tracking section at the top and change status indicators:

- ⏳ Not Started
- 🔄 In Progress  
- ✅ Complete
- ❌ Blocked

**Example of completed task:**
- [x] ~~**1.1** Create process cleanup module~~ ✅ *Completed 2025-01-27*

**Example of completed phase:**
- [x] **Phase 1**: Global Process Cleanup Handler *(4/4 tasks)* ✅ *Completed 2025-01-27*