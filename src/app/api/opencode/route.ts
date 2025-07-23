import { NextRequest, NextResponse } from "next/server";
import { sessionManager } from "@/lib/opencode-session";

export async function POST(request: NextRequest) {
  try {
    const { folder, model } = await request.json();

    if (!folder || !model) {
      return NextResponse.json(
        { error: "Folder and model are required" },
        { status: 400 }
      );
    }

    const session = await sessionManager.startSession({ folder, model });

    return NextResponse.json({
      sessionId: session.id,
      port: session.port,
      status: session.status
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
    const sessions = sessionManager.getAllSessions();
    return NextResponse.json({
      sessions: sessions.map(session => ({
        id: session.id,
        folder: session.folder,
        model: session.model,
        port: session.port,
        status: session.status
      }))
    });
  } catch (error) {
    console.error("Failed to get sessions:", error);
    return NextResponse.json(
      { error: "Failed to get sessions" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    await sessionManager.stopSession(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to stop session:", error);
    return NextResponse.json(
      { error: "Failed to stop session" },
      { status: 500 }
    );
  }
}