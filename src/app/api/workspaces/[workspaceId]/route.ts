import { NextRequest, NextResponse } from "next/server";
import { workspaceManager } from "@/lib/opencode-workspace";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const workspace = workspaceManager.getWorkspace(workspaceId);

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: workspace.id,
      folder: workspace.folder,
      port: workspace.port,
      status: workspace.status,
      sessions: Array.from(workspace.sessions.values()),
      error: workspace.error?.message,
    });
  } catch (error) {
    console.error("Failed to get workspace:", error);
    return NextResponse.json(
      { error: "Failed to get workspace" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
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