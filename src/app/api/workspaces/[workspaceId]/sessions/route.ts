import { NextRequest, NextResponse } from "next/server";
import { workspaceManager } from "@/lib/opencode-workspace";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    
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
    
    const { model } = body as { model: string };

    if (!model) {
      return NextResponse.json(
        { error: "Model is required" },
        { status: 400 }
      );
    }

    const workspace = workspaceManager.getWorkspace(workspaceId);
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const session = await workspaceManager.createSession(workspaceId, model);

    return NextResponse.json({
      id: session.id,
      workspaceId: session.workspaceId,
      model: session.model,
      port: workspace.port,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      status: session.status,
    });
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const sessions = workspaceManager.getWorkspaceSessions(workspaceId);

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Failed to get sessions:", error);
    return NextResponse.json(
      { error: "Failed to get sessions" },
      { status: 500 }
    );
  }
}