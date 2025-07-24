import { spawn, ChildProcess } from "child_process";
import Opencode from "@opencode-ai/sdk";
import { findAvailablePort } from "./port-utils";
import { OpenCodeError } from "./opencode-client";

export interface OpenCodeWorkspaceConfig {
  folder: string;
  model: string;
  port?: number;
}

export interface OpenCodeWorkspace {
  id: string;
  folder: string;
  model: string;
  port: number;
  process: ChildProcess | null;
  client: Opencode | null;
  status: "starting" | "running" | "stopped" | "error";
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

  async startWorkspace(config: OpenCodeWorkspaceConfig): Promise<OpenCodeWorkspace> {
    const port = config.port || (await findAvailablePort());
    const workspaceId = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    const workspace: OpenCodeWorkspace = {
      id: workspaceId,
      folder: config.folder,
      model: config.model,
      port,
      process: null,
      client: null,
      status: "starting",
    };

    try {
      // Check if opencode command exists
      await this.checkOpenCodeCommand();

      const process = spawn("opencode", ["serve", "--port", port.toString()], {
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
      });

      process.stdout?.on("data", (data) => {
        console.log(`OpenCode stdout: ${data}`);
        if (data.toString().includes("server listening")) {
          workspace.status = "running";
          workspace.client = new Opencode({
            baseURL: `http://localhost:${port}`,
          });
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
      });

      this.workspaces.set(workspaceId, workspace);

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
          if (workspace.status === "running") {
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
      throw workspace.error;
    }
  }

  async stopWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new OpenCodeError(`Workspace ${workspaceId} not found`);
    }

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