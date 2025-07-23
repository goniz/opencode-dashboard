import { spawn, ChildProcess } from "child_process";
import Opencode from "@opencode-ai/sdk";
import { findAvailablePort } from "./port-utils";

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
}

class OpenCodeSessionManager {
  private sessions: Map<string, OpenCodeSession> = new Map();

  async startSession(config: OpenCodeSessionConfig): Promise<OpenCodeSession> {
    const port = config.port || await findAvailablePort();
    const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const session: OpenCodeSession = {
      id: sessionId,
      folder: config.folder,
      model: config.model,
      port,
      process: null,
      client: null,
      status: "starting"
    };

    try {
      const process = spawn("opencode", ["--model", config.model", "serve", "--port", port.toString()], {
        cwd: config.folder,
        stdio: ["pipe", "pipe", "pipe"]
      });

      session.process = process;

      process.on("error", (error) => {
        console.error(`OpenCode process error:`, error);
        session.status = "error";
      });

      process.on("exit", (code) => {
        console.log(`OpenCode process exited with code ${code}`);
        session.status = "stopped";
        this.sessions.delete(sessionId);
      });

      process.stdout?.on("data", (data) => {
        console.log(`OpenCode stdout: ${data}`);
        if (data.toString().includes("Server running")) {
          session.status = "running";
          session.client = new Opencode({
            baseURL: `http://localhost:${port}`
          });
        }
      });

      process.stderr?.on("data", (data) => {
        console.error(`OpenCode stderr: ${data}`);
      });

      this.sessions.set(sessionId, session);

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout waiting for OpenCode server to start"));
        }, 30000);

        const checkStatus = () => {
          if (session.status === "running") {
            clearTimeout(timeout);
            resolve(session);
          } else if (session.status === "error") {
            clearTimeout(timeout);
            reject(new Error("Failed to start OpenCode server"));
          } else {
            setTimeout(checkStatus, 500);
          }
        };

        checkStatus();
      });

      return session;
    } catch (error) {
      session.status = "error";
      throw error;
    }
  }

  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.process && !session.process.killed) {
      session.process.kill("SIGTERM");
      
      setTimeout(() => {
        if (session.process && !session.process.killed) {
          session.process.kill("SIGKILL");
        }
      }, 5000);
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
    const stopPromises = Array.from(this.sessions.keys()).map(id => 
      this.stopSession(id).catch(console.error)
    );
    await Promise.all(stopPromises);
  }
}

export const sessionManager = new OpenCodeSessionManager();