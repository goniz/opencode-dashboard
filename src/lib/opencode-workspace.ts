import { spawn, ChildProcess } from "child_process";
import Opencode from "@opencode-ai/sdk";
import { OpenCodeError } from "./opencode-client";

export interface OpenCodeWorkspaceConfig {
  folder: string;
  model: string;
}

export interface ChatSession {
  id: string;
  workspaceId: string;
  model: string;
  createdAt: Date;
  lastActivity: Date;
  status: "active" | "inactive";
}

export interface ProcessMetadata {
  pid: number;
  startTime: Date;
  command: string[];
  cwd: string;
}

export interface OpenCodeWorkspace {
  id: string;
  folder: string;
  model: string;
  port: number;
  status: "starting" | "running" | "stopped" | "error";
  process?: ChildProcess;
  client?: Opencode;
  sessions: Map<string, ChatSession>;
  error?: OpenCodeWorkspaceError;
  processMetadata?: ProcessMetadata;
}

export class OpenCodeWorkspaceError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
    public readonly recoverySuggestion?: string
  ) {
    super(message);
    this.name = "OpenCodeWorkspaceError";
  }
}

class OpenCodeWorkspaceManager {
  private workspaces: Map<string, OpenCodeWorkspace> = new Map();
  private lastModified: number = Date.now();
  private changeListeners: Set<(workspaces: OpenCodeWorkspace[]) => void> = new Set();
  private isShuttingDown: boolean = false;
  private shutdownPromise?: Promise<void>;
  private processMonitoringInterval?: NodeJS.Timeout;

  private markModified(): void {
    this.lastModified = Date.now();
    this.notifyChange();
  }

  getLastModified(): number {
    return this.lastModified;
  }

  addChangeListener(callback: (workspaces: OpenCodeWorkspace[]) => void): () => void {
    this.changeListeners.add(callback);
    return () => this.changeListeners.delete(callback);
  }

  private notifyChange(): void {
    const workspaces = this.getAllWorkspaces();
    this.changeListeners.forEach(callback => {
      try {
        callback(workspaces);
      } catch (error) {
        console.error('Change listener error:', error);
      }
    });
  }

  // Session management methods
  async createSession(workspaceId: string, model: string): Promise<ChatSession> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new OpenCodeWorkspaceError(`Workspace ${workspaceId} not found`);
    }

    if (workspace.status !== "running" || !workspace.client) {
      throw new OpenCodeWorkspaceError(`Workspace ${workspaceId} is not running or client not available`);
    }

    try {
      console.log(`Creating OpenCode session for workspace ${workspaceId} with model ${model}`);
      // Create an actual OpenCode session using the SDK
      const openCodeSession = await workspace.client.session.create();
      console.log(`Created OpenCode session ${openCodeSession.id}`);
      
      const session: ChatSession = {
        id: openCodeSession.id,
        workspaceId,
        model,
        createdAt: new Date(),
        lastActivity: new Date(),
        status: "active",
      };

      workspace.sessions.set(openCodeSession.id, session);
      this.markModified();
      return session;
    } catch (error) {
      console.error("Failed to create OpenCode session:", error);
      throw new OpenCodeWorkspaceError(
        "Failed to create OpenCode session",
        error,
        "Ensure the OpenCode server is running and accessible"
      );
    }
  }

  getSession(workspaceId: string, sessionId: string): ChatSession | undefined {
    const workspace = this.workspaces.get(workspaceId);
    return workspace?.sessions.get(sessionId);
  }

  deleteSession(workspaceId: string, sessionId: string): void {
    const workspace = this.workspaces.get(workspaceId);
    if (workspace) {
      workspace.sessions.delete(sessionId);
      this.markModified();
    }
  }

  getWorkspaceSessions(workspaceId: string): ChatSession[] {
    const workspace = this.workspaces.get(workspaceId);
    return workspace ? Array.from(workspace.sessions.values()) : [];
  }

  updateSessionActivity(workspaceId: string, sessionId: string): void {
    const session = this.getSession(workspaceId, sessionId);
    if (session) {
      session.lastActivity = new Date();
      this.markModified();
    }
  }

  async startWorkspace(config: OpenCodeWorkspaceConfig): Promise<OpenCodeWorkspace> {
    // Prevent new workspace creation during shutdown
    if (this.isShuttingDown) {
      throw new OpenCodeWorkspaceError('Cannot create workspace during shutdown');
    }

    const workspaceId = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    const workspace: OpenCodeWorkspace = {
      id: workspaceId,
      folder: config.folder,
      model: config.model,
      port: 0, // Will be set when we parse the actual port from stdout
      process: undefined,
      client: undefined,
      status: "starting",
      sessions: new Map<string, ChatSession>(),
    };

    try {
      // Check if opencode command exists
      await this.checkOpenCodeCommand();

      const command = ["serve", "--port=0", "--print-logs"];
      const process = spawn("opencode", command, {
        cwd: config.folder,
        stdio: ["pipe", "pipe", "inherit"],
        detached: false, // Keep in same process group for better cleanup
        killSignal: 'SIGTERM'
      });

      workspace.process = process;
      
      // Store process metadata for better tracking
      if (process.pid) {
        workspace.processMetadata = {
          pid: process.pid,
          startTime: new Date(),
          command: ["opencode", ...command],
          cwd: config.folder
        };
      }

      process.on("error", (error) => {
        console.error(`OpenCode process error:`, error);
        workspace.status = "error";
        workspace.error = new OpenCodeWorkspaceError(
          "Failed to start OpenCode process.",
          error,
          "Ensure the 'opencode' command is installed and accessible in your system's PATH."
        );
        this.markModified();
      });

      process.on("exit", (code) => {
        console.log(`OpenCode process exited with code ${code}`);
        if (code !== 0 && workspace.status !== "running") {
          workspace.status = "error";
          workspace.error = new OpenCodeWorkspaceError(
            `OpenCode process exited with error code ${code}.`,
            undefined,
            "Check the console for error messages from the 'opencode' command."
          );
        } else {
          workspace.status = "stopped";
        }
        this.workspaces.delete(workspaceId);
        this.markModified();
      });

      process.stdout?.on("data", (data) => {
        console.log(`OpenCode stdout: ${data}`);
        const output = data.toString();
        
        // Parse port from output like "opencode server listening on http://127.0.0.1:54857"
        const portMatch = output.match(/server listening on http:\/\/127\.0\.0\.1:(\d+)/);
        if (portMatch) {
          const actualPort = parseInt(portMatch[1], 10);
          workspace.port = actualPort;
          workspace.client = new Opencode({
            baseURL: `http://localhost:${actualPort}`,
          });
          
          // Initialize the app after creating the client
          workspace.client.app.init().then(() => {
            console.log(`OpenCode app initialized for workspace ${workspaceId}`);
            workspace.status = "running";
            this.markModified();
          }).catch((error) => {
            console.error(`Failed to initialize OpenCode app:`, error);
            workspace.status = "error";
            workspace.error = new OpenCodeWorkspaceError(
              "Failed to initialize OpenCode app.",
              error,
              "Ensure the OpenCode server is running properly."
            );
            this.markModified();
          });
        }
      });

      this.workspaces.set(workspaceId, workspace);
      this.markModified();

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(
            new OpenCodeWorkspaceError(
              "Timeout waiting for OpenCode server to start.",
              undefined,
              "Verify that the 'opencode' command can start successfully and that the port is not blocked."
            )
          );
        }, 30000);

        const checkStatus = () => {
          if (workspace.status === "running" && workspace.port > 0) {
            clearTimeout(timeout);
            resolve(workspace);
          } else if (workspace.status === "error") {
            clearTimeout(timeout);
            reject(
              workspace.error ||
                new OpenCodeWorkspaceError(
                  "Failed to start OpenCode server due to an unknown error."
                )
            );
          } else {
            setTimeout(checkStatus, 500);
          }
        };

        checkStatus();
      });

      return workspace;
    } catch (error) {
      workspace.status = "error";
      workspace.error =
        error instanceof OpenCodeWorkspaceError
          ? error
          : new OpenCodeWorkspaceError(
              "An unexpected error occurred while starting the workspace.",
              error
            );
      this.markModified();
      throw workspace.error;
    }
  }

  async stopWorkspace(workspaceId: string, options?: {
    timeout?: number;
    retryAttempts?: number;
    forceKill?: boolean;
  }): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new OpenCodeError(`Workspace ${workspaceId} not found`);
    }

    const config = {
      timeout: options?.timeout ?? 5000,
      retryAttempts: options?.retryAttempts ?? 3,
      forceKill: options?.forceKill ?? false
    };

    console.log(`[WorkspaceManager] Stopping workspace ${workspaceId}...`);

    // Clean up all sessions in the workspace
    workspace.sessions.clear();

    if (workspace.process && !workspace.process.killed) {
      const success = await this.terminateProcessWithRetry(workspace, config);
      if (!success) {
        console.warn(`[WorkspaceManager] Failed to cleanly terminate workspace ${workspaceId} after ${config.retryAttempts} attempts`);
      }
    }

    workspace.status = "stopped";
    this.workspaces.delete(workspaceId);
    this.markModified();
    console.log(`[WorkspaceManager] Workspace ${workspaceId} stopped and removed`);
  }

  getWorkspace(workspaceId: string): OpenCodeWorkspace | undefined {
    return this.workspaces.get(workspaceId);
  }

  getAllWorkspaces(): OpenCodeWorkspace[] {
    return Array.from(this.workspaces.values());
  }

  async stopAllWorkspaces(): Promise<void> {
    console.log(`[WorkspaceManager] Stopping all ${this.workspaces.size} workspaces...`);
    const stopPromises = Array.from(this.workspaces.keys()).map((id) =>
      this.stopWorkspace(id).catch((error) => {
        console.error(`[WorkspaceManager] Error stopping workspace ${id}:`, error);
      })
    );
    await Promise.all(stopPromises);
    console.log(`[WorkspaceManager] All workspaces stopped`);
  }

  /**
   * Initiate graceful shutdown of all workspaces
   */
  async initiateShutdown(): Promise<void> {
    if (this.isShuttingDown) {
      console.log('[WorkspaceManager] Shutdown already in progress, waiting for completion...');
      return this.shutdownPromise;
    }

    this.isShuttingDown = true;
    console.log('[WorkspaceManager] Initiating workspace manager shutdown...');

    this.shutdownPromise = this.executeShutdown();
    return this.shutdownPromise;
  }

  /**
   * Execute the shutdown process
   */
  private async executeShutdown(): Promise<void> {
    const startTime = Date.now();
    
    // Stop process monitoring if running
    if (this.processMonitoringInterval) {
      clearInterval(this.processMonitoringInterval);
      this.processMonitoringInterval = undefined;
    }

    // Stop all workspaces
    await this.stopAllWorkspaces();

    const duration = Date.now() - startTime;
    console.log(`[WorkspaceManager] Shutdown completed in ${duration}ms`);
  }

  /**
   * Terminate a process with retry logic and verification
   */
  private async terminateProcessWithRetry(
    workspace: OpenCodeWorkspace, 
    config: { timeout: number; retryAttempts: number; forceKill: boolean }
  ): Promise<boolean> {
    if (!workspace.process || workspace.process.killed) {
      return true;
    }

    const process = workspace.process;
    const pid = process.pid;

    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
      const isLastAttempt = attempt === config.retryAttempts;
      const signal = (config.forceKill || isLastAttempt) ? 'SIGKILL' : 'SIGTERM';
      
      console.log(`[WorkspaceManager] Terminating workspace ${workspace.id} process ${pid} with ${signal} (attempt ${attempt}/${config.retryAttempts})`);
      
      try {
        process.kill(signal);
        
        // Wait for process to terminate
        const terminated = await this.waitForProcessTermination(process, config.timeout);
        
        if (terminated) {
          console.log(`[WorkspaceManager] Process ${pid} terminated successfully on attempt ${attempt}`);
          return true;
        }
        
        console.warn(`[WorkspaceManager] Process ${pid} did not terminate within ${config.timeout}ms on attempt ${attempt}`);
        
        // If this isn't the last attempt, wait before retrying
        if (!isLastAttempt) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
        
      } catch (error) {
        console.error(`[WorkspaceManager] Error terminating process ${pid} on attempt ${attempt}:`, error);
        
        // If process doesn't exist anymore, consider it successful
        if (error instanceof Error && error.message.includes('ESRCH')) {
          console.log(`[WorkspaceManager] Process ${pid} no longer exists, considering termination successful`);
          return true;
        }
        
        // Log other errors but continue
        console.error(`[WorkspaceManager] Unexpected error terminating process ${pid}:`, error);
      }
    }

    console.error(`[WorkspaceManager] Failed to terminate process ${pid} after ${config.retryAttempts} attempts`);
    return false;
  }

  /**
   * Wait for a process to terminate
   */
  private async waitForProcessTermination(process: ChildProcess, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve(false);
      }, timeout);

      const cleanup = () => {
        clearTimeout(timeoutId);
        process.removeListener('exit', onExit);
        process.removeListener('error', onError);
      };

      const onExit = () => {
        cleanup();
        resolve(true);
      };

      const onError = () => {
        cleanup();
        resolve(true); // Process error usually means it's gone
      };

      // Check if process is already dead
      if (process.killed || process.exitCode !== null) {
        cleanup();
        resolve(true);
        return;
      }

      process.once('exit', onExit);
      process.once('error', onError);
    });
  }

  /**
   * Check if a process is alive
   */
  private isProcessAlive(process: ChildProcess): boolean {
    if (!process.pid || process.killed || process.exitCode !== null) {
      return false;
    }

    try {
      // Signal 0 checks if process exists without actually sending a signal
      process.kill(0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Start process health monitoring
   */
  startProcessMonitoring(): void {
    if (this.processMonitoringInterval) {
      return; // Already monitoring
    }

    console.log('[WorkspaceManager] Starting process health monitoring...');
    this.processMonitoringInterval = setInterval(() => {
      this.checkProcessHealth();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop process health monitoring
   */
  stopProcessMonitoring(): void {
    if (this.processMonitoringInterval) {
      clearInterval(this.processMonitoringInterval);
      this.processMonitoringInterval = undefined;
      console.log('[WorkspaceManager] Stopped process health monitoring');
    }
  }

  /**
   * Check health of all workspace processes
   */
  private checkProcessHealth(): void {
    if (this.isShuttingDown) {
      return; // Don't monitor during shutdown
    }

    this.workspaces.forEach(async (workspace) => {
      if (workspace.process && workspace.status === 'running') {
        if (!this.isProcessAlive(workspace.process)) {
          console.warn(`[WorkspaceManager] Detected dead process for workspace ${workspace.id}`);
          await this.cleanupDeadWorkspace(workspace.id);
        }
      }
    });
  }

  /**
   * Clean up a workspace with a dead process
   */
  private async cleanupDeadWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return;
    }

    console.log(`[WorkspaceManager] Cleaning up dead workspace ${workspaceId}`);
    workspace.status = 'error';
    workspace.error = new OpenCodeWorkspaceError(
      'OpenCode process died unexpectedly',
      undefined,
      'The workspace process may have crashed or been terminated externally'
    );
    workspace.sessions.clear();
    this.workspaces.delete(workspaceId);
    this.markModified();
  }

  private async checkOpenCodeCommand(): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn("opencode", ["--version"]);
      process.on("error", () => {
        reject(
          new OpenCodeWorkspaceError(
            "'opencode' command not found.",
            undefined,
            "Please ensure the OpenCode CLI is installed and in your system's PATH."
          )
        );
      });
      process.on("exit", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new OpenCodeWorkspaceError(
              `'opencode' command failed with exit code ${code}.`,
              undefined,
              "Verify your OpenCode CLI installation."
            )
          );
        }
      });
    });
  }
}

export const workspaceManager = new OpenCodeWorkspaceManager();