import { NextRequest } from "next/server";
import { workspaceManager } from "@/lib/opencode-workspace";

export async function GET(request: NextRequest) {
  // Set up SSE headers
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  const encoder = new TextEncoder();
  let isAlive = true;
  let lastSentTimestamp = 0;

  const stream = new ReadableStream({
    start(controller) {
      // Send workspace data only if changes detected
      const sendWorkspaceUpdate = (force = false) => {
        if (!isAlive) return;
        
        const currentTimestamp = workspaceManager.getLastModified();
        
        // Only send update if data has changed since last send or forced
        if (!force && currentTimestamp <= lastSentTimestamp) {
          return;
        }
        
        try {
          const workspaces = workspaceManager.getAllWorkspaces();
          const data = workspaces.map((workspace) => ({
            id: workspace.id,
            folder: workspace.folder,
            model: workspace.model,
            port: workspace.port,
            status: workspace.status,
            sessions: Array.from(workspace.sessions.values()),
          }));

          const message = `data: ${JSON.stringify({
            type: "workspace_update",
            data,
            timestamp: new Date().toISOString(),
          })}\n\n`;

          controller.enqueue(encoder.encode(message));
          lastSentTimestamp = currentTimestamp;
        } catch (error) {
          console.error("Error sending workspace update:", error);
          const errorMessage = `data: ${JSON.stringify({
            type: "error",
            error: "Failed to fetch workspace data",
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(errorMessage));
        }
      };

      // Send initial data (forced)
      sendWorkspaceUpdate(true);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        if (!isAlive) {
          clearInterval(heartbeatInterval);
          return;
        }

        const heartbeat = `data: ${JSON.stringify({
          type: "heartbeat",
          timestamp: new Date().toISOString(),
        })}\n\n`;

        try {
          controller.enqueue(encoder.encode(heartbeat));
        } catch {
          console.error("Error sending heartbeat");
          clearInterval(heartbeatInterval);
          isAlive = false;
        }
      }, 30000);

      // Check for changes every 500ms, but only send updates when data changes
      const updateInterval = setInterval(() => {
        if (!isAlive) {
          clearInterval(updateInterval);
          return;
        }
        sendWorkspaceUpdate();
      }, 500);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        isAlive = false;
        clearInterval(heartbeatInterval);
        clearInterval(updateInterval);
        try {
          controller.close();
        } catch {
          // Connection already closed
        }
      });
    },

    cancel() {
      isAlive = false;
    },
  });

  return new Response(stream, { headers });
}