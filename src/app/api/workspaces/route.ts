import { NextRequest, NextResponse } from "next/server";
import { workspaceManager } from "@/lib/opencode-workspace";
import type { OpenCodeWorkspaceConfig } from "@/lib/opencode-workspace";

export async function POST(request: NextRequest) {
  try {
    // Check payload size before parsing
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
      return NextResponse.json(
        { error: "Payload too large" },
        { status: 413 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      // Handle both malformed JSON and oversized payloads
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('body size') || errorMessage.includes('payload')) {
        return NextResponse.json(
          { error: "Payload too large" },
          { status: 413 }
        );
      }
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    
    const { folder, model } = body as { folder: string; model: string };

    if (!folder) {
      return NextResponse.json(
        { error: "Folder path is required" },
        { status: 400 }
      );
    }

    if (!model) {
      return NextResponse.json(
        { error: "Model is required" },
        { status: 400 }
      );
    }

    const config: OpenCodeWorkspaceConfig = { folder, model };
    const workspace = await workspaceManager.startWorkspace(config);

    return NextResponse.json({
      id: workspace.id,
      folder: workspace.folder,
      model: workspace.model,
      port: workspace.port,
      status: workspace.status,
      sessions: Array.from(workspace.sessions.values()),
    });
  } catch (error) {
    console.error("Failed to create workspace:", error);
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('id');
    
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    await workspaceManager.stopWorkspace(workspaceId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete workspace:", error);
    return NextResponse.json(
      { error: "Failed to delete workspace" },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const workspaces = workspaceManager.getAllWorkspaces();
    
    return NextResponse.json(
      workspaces.map((workspace) => ({
        id: workspace.id,
        folder: workspace.folder,
        model: workspace.model,
        port: workspace.port,
        status: workspace.status,
        sessions: Array.from(workspace.sessions.values()),
      }))
    );
  } catch (error) {
    console.error("Failed to get workspaces:", error);
    return NextResponse.json(
      { error: "Failed to get workspaces" },
      { status: 500 }
    );
  }
}