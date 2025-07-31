import { NextRequest, NextResponse } from "next/server";
import { workspaceManager, type OpenCodeWorkspace } from "@/lib/opencode-workspace";
import { withOpenCodeErrorHandling } from "@/lib/opencode-client";
import { parseModelString } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { sessionId, messages, model, stream = false } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required and cannot be empty" },
        { status: 400 }
      );
    }

    if (!model) {
      return NextResponse.json(
        { error: "Model is required" },
        { status: 400 }
      );
    }

    // Parse model string to extract provider and model ID
    const { providerID, modelID } = parseModelString(model);

    // Find the workspace that contains this session
    let session: OpenCodeWorkspace | null = null;
    
    // Search through all workspaces to find the one containing this session
    for (const ws of workspaceManager.getAllWorkspaces()) {
      const chatSession = ws.sessions.get(sessionId);
      if (chatSession) {
        session = ws;
        break;
      }
    }
    
    if (!session) {
      return NextResponse.json(
        { error: `Session ${sessionId} not found` },
        { status: 404 }
      );
    }

    if (session.status !== "running" || !session.client) {
      return NextResponse.json(
        { error: `Session ${sessionId} is not running or client not available` },
        { status: 400 }
      );
    }

    // Get the latest user message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return NextResponse.json(
        { error: "Last message must be from user" },
        { status: 400 }
      );
    }

    // Ensure content is a string (handle array case for compatibility)
    let messageContent: string;
    if (Array.isArray(lastMessage.content)) {
      messageContent = lastMessage.content.join(' ');
    } else if (typeof lastMessage.content === 'string') {
      messageContent = lastMessage.content;
    } else {
      messageContent = String(lastMessage.content || '');
    }

    if (!messageContent.trim()) {
      return NextResponse.json(
        { error: "Message content cannot be empty" },
        { status: 400 }
      );
    }

    console.log(`🔍 Chat request - SessionID: ${sessionId}, Model: ${model}, Provider: ${providerID}, ModelID: ${modelID}`);
    console.log(`📝 Message content length: ${messageContent.length}`);

    // Prepare the chat parameters according to OpenCode SDK
    // Based on Zod validation error, these fields are required: providerID, modelID, parts
    const chatParams = {
      providerID,
      modelID,
      parts: [
        {
          text: messageContent,
          type: "text" as const
        }
      ]
    };

    console.log(`🚀 Chat params prepared:`, JSON.stringify(chatParams, null, 2));

    if (stream) {
      // Handle streaming response using Server-Sent Events
      const encoder = new TextEncoder();
      
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            // Start the chat request
            const chatPromise = withOpenCodeErrorHandling(
              () => session.client!.session.chat(sessionId, chatParams),
              { operation: "session.chat", sessionId, messageLength: lastMessage.content.length }
            );

            // Send initial message indicating chat started
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: "chat_started", 
              sessionId 
            })}\n\n`));

            // Set up event stream to listen for message updates
            let eventStream: Awaited<ReturnType<typeof session.client.event.list>> | null = null;
            try {
              eventStream = await withOpenCodeErrorHandling(
                () => session.client!.event.list({ stream: true }),
                { operation: "event.list", sessionId }
              );
            } catch (error) {
              console.warn("Could not establish event stream, proceeding without real-time updates:", error);
            }
            
            // Start event listening in background if available
            if (eventStream) {
              (async () => {
                try {
                  for await (const event of eventStream) {
                    // Filter events related to our session
                    if (event.type === "message.part.updated") {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: "message_part_updated",
                        part: event.properties.part
                      })}\n\n`));
                    } else if (event.type === "message.updated") {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: "message_updated",
                        message: event.properties.info
                      })}\n\n`));
                    }
                  }
                } catch (error) {
                  console.error("Event stream error:", error);
                }
              })();
            }

            // Wait for the main chat request to complete
            const [chatResult] = await Promise.allSettled([chatPromise]);

            // Send final result
            if (chatResult.status === "fulfilled") {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: "chat_completed",
                message: chatResult.value,
                sessionId
              })}\n\n`));
            } else {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: "error",
                error: chatResult.reason?.message || "Chat failed"
              })}\n\n`));
            }

          } catch (error) {
            console.error("Stream error:", error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: "error",
              error: error instanceof Error ? error.message : "Stream processing error"
            })}\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    } else {
      // Handle non-streaming response
      try {
        // First, verify the session exists on the OpenCode server
        await withOpenCodeErrorHandling(
          () => session.client!.session.messages(sessionId),
          { operation: "session.messages", sessionId }
        );
        
        const response = await withOpenCodeErrorHandling(
          () => session.client!.session.chat(sessionId, chatParams),
          { operation: "session.chat", sessionId, messageLength: messageContent.length }
        );

        return NextResponse.json({
          message: response,
          sessionId: sessionId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error("Session chat error:", error);
        
        // If session doesn't exist, try to recreate it
        if (error instanceof Error && error.message.includes("not found")) {
          return NextResponse.json(
            { 
              error: "Session not found on OpenCode server. Please create a new session.",
              code: "SESSION_NOT_FOUND"
            },
            { status: 404 }
          );
        }
        
        throw error;
      }
    }

  } catch (error) {
    console.error("OpenCode chat error:", error);
    
    // Handle different types of errors
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { error: "Session not found or has been terminated" },
          { status: 404 }
        );
      }
      
      if (error.message.includes("connection")) {
        return NextResponse.json(
          { error: "Failed to connect to OpenCode session" },
          { status: 503 }
        );
      }
      
      if (error.message.includes("timeout")) {
        return NextResponse.json(
          { error: "Request timeout - OpenCode session may be busy" },
          { status: 408 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error while processing chat request" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve chat history for a session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Find the workspace that contains this session
    let session: OpenCodeWorkspace | null = null;
    
    // Search through all workspaces to find the one containing this session
    for (const ws of workspaceManager.getAllWorkspaces()) {
      const chatSession = ws.sessions.get(sessionId);
      if (chatSession) {
        session = ws;
        break;
      }
    }
    
    if (!session) {
      return NextResponse.json(
        { error: `Session ${sessionId} not found` },
        { status: 404 }
      );
    }

    if (session.status !== "running" || !session.client) {
      return NextResponse.json(
        { error: `Session ${sessionId} is not running or client not available` },
        { status: 400 }
      );
    }

    // Get messages from the OpenCode session
    const messages = await withOpenCodeErrorHandling(
      () => session.client!.session.messages(sessionId),
      { operation: "session.messages", sessionId }
    );

    return NextResponse.json({
      sessionId: sessionId,
      messages: messages,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Failed to get chat history:", error);
    return NextResponse.json(
      { error: "Failed to retrieve chat history" },
      { status: 500 }
    );
  }
}