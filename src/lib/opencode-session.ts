import { spawn, ChildProcess } from "child_process";
import Opencode from "@opencode-ai/sdk";
import { findAvailablePort } from "./port-utils";
import { OpenCodeError } from "./opencode-client";

export interface OpenCodeSessionConfig {
  folder: string;
  model: string;
  port?: number;
}

export interface OpenCodeSession {
  id: string;
  folder: string;
  model: string;
  port: number;
  process: ChildProcess | null;
  client: Opencode | null;
  status: "starting" | "running" | "stopped" | "error";
  error?: OpenCodeSessionError;
}

export class OpenCodeSessionError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
    public readonly recoverySuggestion?: string
  ) {
    super(message);
    this.name = "OpenCodeSessionError";
  }
}

class OpenCodeSessionManager {
  private sessions: Map<string, OpenCodeSession> = new Map();

  async startSession(config: OpenCodeSessionConfig): Promise<OpenCodeSession> {
    const port = config.port || (await findAvailablePort());
    const sessionId = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    const session: OpenCodeSession = {
      id: sessionId,
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

      session.process = process;

      process.on("error", (error) => {
        console.error(`OpenCode process error:`, error);
        session.status = "error";
        session.error = new OpenCodeSessionError(
          "Failed to start OpenCode process.",
          error,
          "Ensure the 'opencode' command is installed and accessible in your system's PATH."
        );
      });

      process.on("exit", (code) => {
        console.log(`OpenCode process exited with code ${code}`);
        if (code !== 0 && session.status !== "running") {
          session.status = "error";
          session.error = new OpenCodeSessionError(
            `OpenCode process exited with error code ${code}.`,
            undefined,
            "Check the console for error messages from the 'opencode' command."
          );
        } else {
          session.status = "stopped";
        }
        this.sessions.delete(sessionId);
      });

      process.stdout?.on("data", (data) => {
        console.log(`OpenCode stdout: ${data}`);
        if (data.toString().includes("server listening")) {
          session.status = "running";
          session.client = new Opencode({
            baseURL: `http://localhost:${port}`,
          });
        }
      });

      process.stderr?.on("data", (data) => {
        console.error(`OpenCode stderr: ${data}`);
        session.status = "error";
        session.error = new OpenCodeSessionError(
          "An error occurred in the OpenCode process.",
          data.toString(),
          "Review the OpenCode logs for details."
        );
      });

      this.sessions.set(sessionId, session);

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(
            new OpenCodeSessionError(
              "Timeout waiting for OpenCode server to start.",
              undefined,
              "Verify that the 'opencode' command can start successfully and that the port is not blocked."
            )
          );
        }, 30000);

        const checkStatus = () => {
          if (session.status === "running") {
            clearTimeout(timeout);
            resolve(session);
          } else if (session.status === "error") {
            clearTimeout(timeout);
            reject(
              session.error ||
                new OpenCodeSessionError(
                  "Failed to start OpenCode server due to an unknown error."
                )
            );
          } else {
            setTimeout(checkStatus, 500);
          }
        };

        checkStatus();
      });

      return session;
    } catch (error) {
      session.status = "error";
      session.error =
        error instanceof OpenCodeSessionError
          ? error
          : new OpenCodeSessionError(
              "An unexpected error occurred while starting the session.",
              error
            );
      throw session.error;
    }
  }

  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new OpenCodeError(`Session ${sessionId} not found`);
    }

    if (session.process && !session.process.killed) {
      session.process.kill("SIGTERM");

      await new Promise((resolve) => {
        setTimeout(() => {
          if (session.process && !session.process.killed) {
            session.process.kill("SIGKILL");
          }
          resolve();
        }, 5000);
      });
    }

    session.status = "stopped";
    this.sessions.delete(sessionId);
  }

  getSession(sessionId: string): OpenCodeSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): OpenCodeSession[] {
    return Array.from(this.sessions.values());
  }

  async stopAllSessions(): Promise<void> {
    const stopPromises = Array.from(this.sessions.keys()).map((id) =>
      this.stopSession(id).catch(console.error)
    );
    await Promise.all(stopPromises);
  }

  private async checkOpenCodeCommand(): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn("opencode", ["--version"]);
      process.on("error", () => {
        reject(
          new OpenCodeSessionError(
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
            new OpenCodeSessionError(
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

export const sessionManager = new OpenCodeSessionManager();
