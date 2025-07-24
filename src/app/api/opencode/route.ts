import { NextRequest, NextResponse } from "next/server";
import { workspaceManager } from "@/lib/opencode-workspace";

export async function POST(request: NextRequest) {
  try {
    const { folder, model } = await request.json();

    if (!folder || !model) {
      return NextResponse.json(
        { error: "Folder and model are required" },
        { status: 400 }
      );
    }

    const workspace = await workspaceManager.startWorkspace({ folder, model });

    return NextResponse.json({
      workspaceId: workspace.id,
      port: workspace.port,
      status: workspace.status
    });
  } catch (error) {
    console.error("Failed to start OpenCode session:", error);
    return NextResponse.json(
      { error: "Failed to start OpenCode session" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const workspaces = workspaceManager.getAllWorkspaces();
    return NextResponse.json({
      workspaces: workspaces.map(workspace => ({
        id: workspace.id,
        folder: workspace.folder,
        port: workspace.port,
        status: workspace.status,
        sessionCount: workspace.sessions.size
      }))
    });
  } catch (error) {
    console.error("Failed to get workspaces:", error);
    return NextResponse.json(
      { error: "Failed to get workspaces" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    await workspaceManager.stopWorkspace(workspaceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to stop workspace:", error);
    return NextResponse.json(
      { error: "Failed to stop workspace" },
      { status: 500 }
    );
  }
}