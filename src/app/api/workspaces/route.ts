import { NextRequest, NextResponse } from "next/server";
import { workspaceManager } from "@/lib/opencode-workspace";
import type { OpenCodeWorkspaceConfig } from "@/lib/opencode-workspace";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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