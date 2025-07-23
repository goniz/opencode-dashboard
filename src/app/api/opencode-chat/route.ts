import { NextRequest, NextResponse } from "next/server";
import { sessionManager } from "@/lib/opencode-session";
import { withOpenCodeErrorHandling } from "@/lib/opencode-client";
import type Opencode from "@opencode-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { sessionId, messages, model, provider = "openai", stream = false } = await request.json();

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

    // Get the session from the session manager
    const session = sessionManager.getSession(sessionId);
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

    // Generate a unique message ID
    const messageID = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Prepare the chat parameters according to OpenCode SDK
    const chatParams: Opencode.SessionChatParams = {
      messageID,
      mode: "chat",
      modelID: model,
      providerID: provider,
      parts: [
        {
          id: `part_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          messageID,
          sessionID: sessionId,
          text: lastMessage.content,
          type: "text" as const
        }
      ]
    };

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
              messageId: messageID,
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
                    // Filter events related to our message or session
                    if (event.type === "message.part.updated" && 
                        event.properties.part.messageID === messageID) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: "message_part_updated",
                        part: event.properties.part
                      })}\n\n`));
                    } else if (event.type === "message.updated" && 
                               event.properties.info.id === messageID) {
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
      const response = await withOpenCodeErrorHandling(
        () => session.client!.session.chat(sessionId, chatParams),
        { operation: "session.chat", sessionId, messageLength: lastMessage.content.length }
      );

      return NextResponse.json({
        message: response,
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      });
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

    // Get the session from the session manager
    const session = sessionManager.getSession(sessionId);
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