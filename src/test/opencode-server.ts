import { spawn, ChildProcess } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import Opencode from '@opencode-ai/sdk';

export interface TestOpenCodeServer {
  port: number;
  client: Opencode;
  tempDir: string;
  cleanup: () => Promise<void>;
}

export async function startTestOpenCodeServer(): Promise<TestOpenCodeServer> {
  // Create a temporary directory for the test workspace
  const tempDir = await mkdtemp(join(tmpdir(), 'opencode-test-'));
  
  return new Promise((resolve, reject) => {
    let process: ChildProcess;
    let port: number;
    let client: Opencode;
    
    const cleanup = async () => {
      if (process && !process.killed) {
        process.kill('SIGTERM');
        
        // Wait for graceful shutdown, then force kill if needed
        await new Promise<void>((resolveKill) => {
          const timeout = setTimeout(() => {
            if (process && !process.killed) {
              process.kill('SIGKILL');
            }
            resolveKill();
          }, 5000);
          
          process.on('exit', () => {
            clearTimeout(timeout);
            resolveKill();
          });
        });
      }
      
      // Clean up temp directory
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn('Failed to clean up temp directory:', error);
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout waiting for OpenCode server to start'));
    }, 30000);

    try {
      // Start opencode serve with port 0 (auto-assign)
      process = spawn('opencode', ['serve', '--port=0'], {
        cwd: tempDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        cleanup();
        reject(new Error(`Failed to start OpenCode process: ${error.message}`));
      });

      process.on('exit', (code) => {
        if (code !== 0) {
          clearTimeout(timeout);
          cleanup();
          reject(new Error(`OpenCode process exited with code ${code}`));
        }
      });

      process.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(`OpenCode test server stdout: ${output}`);
        
        // Parse port from output like "opencode server listening on http://127.0.0.1:54857"
        const portMatch = output.match(/server listening on http:\/\/127\.0\.0\.1:(\d+)/);
        if (portMatch) {
          port = parseInt(portMatch[1], 10);
          client = new Opencode({
            baseURL: `http://localhost:${port}`,
          });
          
          clearTimeout(timeout);
          resolve({
            port,
            client,
            tempDir,
            cleanup,
          });
        }
      });

      process.stderr?.on('data', (data) => {
        console.error(`OpenCode test server stderr: ${data}`);
        clearTimeout(timeout);
        cleanup();
        reject(new Error(`OpenCode server error: ${data.toString()}`));
      });

    } catch (error) {
      clearTimeout(timeout);
      cleanup();
      reject(error);
    }
  });
}

export async function waitForServerReady(client: Opencode, maxAttempts = 10): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await client.session.list();
      return;
    } catch (error) {
      if (i === maxAttempts - 1) {
        throw new Error(`Server not ready after ${maxAttempts} attempts: ${error}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}