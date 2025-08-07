import { NextRequest, NextResponse } from "next/server";
import { workspaceManager } from "@/lib/opencode-workspace";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    console.log(`[DEBUG] GET workspace ${workspaceId} at ${new Date().toISOString()}`);
    const workspace = workspaceManager.getWorkspace(workspaceId);

    if (!workspace) {
      console.log(`[DEBUG] Workspace ${workspaceId} not found in GET request`);
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    console.log(`[DEBUG] Workspace ${workspaceId} found, status: ${workspace.status}`);

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
    console.log(`[DEBUG] DELETE workspace ${workspaceId} at ${new Date().toISOString()}`);
    console.log(`[DEBUG] DELETE request stack trace:`, new Error().stack);
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