import { NextRequest, NextResponse } from "next/server";
import { workspaceManager } from "@/lib/opencode-workspace";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; sessionId: string }> }
) {
  try {
    const { workspaceId, sessionId } = await params;
    const session = workspaceManager.getSession(workspaceId, sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: session.id,
      workspaceId: session.workspaceId,
      model: session.model,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      status: session.status,
    });
  } catch (error) {
    console.error("Failed to get session:", error);
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; sessionId: string }> }
) {
  try {
    const { workspaceId, sessionId } = await params;
    
    const session = workspaceManager.getSession(workspaceId, sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    workspaceManager.deleteSession(workspaceId, sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}