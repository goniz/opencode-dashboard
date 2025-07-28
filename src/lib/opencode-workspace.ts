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
  createSession(workspaceId: string, model: string): ChatSession {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new OpenCodeWorkspaceError(`Workspace ${workspaceId} not found`);
    }

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const session: ChatSession = {
      id: sessionId,
      workspaceId,
      model,
      createdAt: new Date(),
      lastActivity: new Date(),
      status: "active",
    };

    workspace.sessions.set(sessionId, session);
    this.markModified();
    return session;
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

      const process = spawn("opencode", ["serve", "--port=0"], {
        cwd: config.folder,
        stdio: ["pipe", "pipe", "pipe"],
      });

      workspace.process = process;

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
          workspace.status = "running";
          workspace.client = new Opencode({
            baseURL: `http://localhost:${actualPort}`,
          });
          this.markModified();
        }
      });

      process.stderr?.on("data", (data) => {
        console.error(`OpenCode stderr: ${data}`);
        workspace.status = "error";
        workspace.error = new OpenCodeWorkspaceError(
          "An error occurred in the OpenCode process.",
          data.toString(),
          "Review the OpenCode logs for details."
        );
        this.markModified();
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

  async stopWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new OpenCodeError(`Workspace ${workspaceId} not found`);
    }

    // Clean up all sessions in the workspace
    workspace.sessions.clear();

    if (workspace.process && !workspace.process.killed) {
      workspace.process.kill("SIGTERM");

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          if (workspace.process && !workspace.process.killed) {
            workspace.process.kill("SIGKILL");
          }
          resolve();
        }, 5000);
      });
    }

    workspace.status = "stopped";
    this.workspaces.delete(workspaceId);
    this.markModified();
  }

  getWorkspace(workspaceId: string): OpenCodeWorkspace | undefined {
    return this.workspaces.get(workspaceId);
  }

  getAllWorkspaces(): OpenCodeWorkspace[] {
    return Array.from(this.workspaces.values());
  }

  async stopAllWorkspaces(): Promise<void> {
    const stopPromises = Array.from(this.workspaces.keys()).map((id) =>
      this.stopWorkspace(id).catch(console.error)
    );
    await Promise.all(stopPromises);
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