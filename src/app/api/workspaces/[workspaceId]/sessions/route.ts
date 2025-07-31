import { NextRequest, NextResponse } from "next/server";
import { workspaceManager } from "@/lib/opencode-workspace";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
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