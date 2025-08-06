import { NextRequest, NextResponse } from "next/server";
import { workspaceManager } from "@/lib/opencode-workspace";
import { withOpenCodeErrorHandling, OpenCodeError } from "@/lib/opencode-client";
import { parseModelString } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; sessionId: string }> }
) {
  try {
    const { workspaceId, sessionId } = await params;
    const { messages, stream = false } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Get the workspace
    const workspace = workspaceManager.getWorkspace(workspaceId);
    if (!workspace) {
      return NextResponse.json(
        { error: `Workspace ${workspaceId} not found` },
        { status: 404 }
      );
    }

    if (workspace.status !== "running" || !workspace.client) {
      return NextResponse.json(
        { error: `Workspace ${workspaceId} is not running or client not available` },
        { status: 400 }
      );
    }

    // Get the session
    const session = workspaceManager.getSession(workspaceId, sessionId);
    if (!session) {
      return NextResponse.json(
        { error: `Session ${sessionId} not found in workspace ${workspaceId}` },
        { status: 404 }
      );
    }

    // Update session activity
    workspaceManager.updateSessionActivity(workspaceId, sessionId);

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

    // Parse model string to extract provider and model ID
    const { providerID, modelID } = parseModelString(session.model);

    // Prepare the chat parameters according to OpenCode SDK
    // Based on Zod validation error, these fields are required: providerID, modelID, parts
    const chatParams = {
      providerID,
      modelID,
      parts: [
        {
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
              () => workspace.client!.session.chat(sessionId, chatParams),
              { operation: "session.chat", sessionId, messageLength: lastMessage.content.length }
            );

            // Send initial message indicating chat started
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: "chat_started", 
              messageId: messageID,
              sessionId,
              workspaceId
            })}\n\n`));

            // Set up event stream to listen for message updates
            let eventStream: Awaited<ReturnType<typeof workspace.client.event.list>> | null = null;
            try {
              eventStream = await withOpenCodeErrorHandling(
                () => workspace.client!.event.list({ stream: true }),
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
                sessionId,
                workspaceId
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
        // Handle non-streaming response with timeout handling
        const CHAT_TIMEOUT_MS = 120000; // 120 seconds timeout for chat operation
        let chatResponse;
        try {
          // Race the chat operation against a timeout
          const chatPromise = withOpenCodeErrorHandling(
            () => workspace.client!.session.chat(sessionId, chatParams),
            { operation: "session.chat", sessionId, messageLength: lastMessage.content.length }
          );
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new OpenCodeError('Chat request timed out')), CHAT_TIMEOUT_MS)
          );
          
          chatResponse = await Promise.race([chatPromise, timeoutPromise]);
        } catch (error) {
          if (error instanceof OpenCodeError && error.message.includes('timed out')) {
            return NextResponse.json({ error: 'Chat request timed out' }, { status: 503 });
          }
          // Re-throw other errors to be caught by outer catch
          throw error;
        }

        return NextResponse.json({
          message: chatResponse,
          sessionId: sessionId,
          workspaceId: workspaceId,
          timestamp: new Date().toISOString()
        });    }

  } catch (error) {
    console.error("OpenCode chat error:", error);
    
    // Handle OpenCodeError (wrapped errors from withOpenCodeErrorHandling)
    if (error instanceof OpenCodeError) {
      const openCodeError = error;
      // Extract the original status code if available
      if (openCodeError.context?.status) {
        const status = openCodeError.context.status as number;
        let errorMessage = "OpenCode API error";
        
        // Provide user-friendly error messages based on status
        if (status === 400) {
          errorMessage = "Invalid request or model not available";
        } else if (status === 404) {
          errorMessage = "Resource not found";
        } else if (status === 401) {
          errorMessage = "Authentication failed";
        } else if (status === 403) {
          errorMessage = "Permission denied";
        } else if (status === 429) {
          errorMessage = "Rate limit exceeded";
        } else if (status >= 500) {
          errorMessage = "OpenCode server error";
        }
        
        return NextResponse.json(
          { error: errorMessage },
          { status }
        );
      }
    }
    
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
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; sessionId: string }> }
) {
  try {
    const { workspaceId, sessionId } = await params;

    // Get the workspace
    const workspace = workspaceManager.getWorkspace(workspaceId);
    if (!workspace) {
      return NextResponse.json(
        { error: `Workspace ${workspaceId} not found` },
        { status: 404 }
      );
    }

    if (workspace.status !== "running" || !workspace.client) {
      return NextResponse.json(
        { error: `Workspace ${workspaceId} is not running or client not available` },
        { status: 400 }
      );
    }

    // Get the session
    const session = workspaceManager.getSession(workspaceId, sessionId);
    if (!session) {
      return NextResponse.json(
        { error: `Session ${sessionId} not found in workspace ${workspaceId}` },
        { status: 404 }
      );
    }

    // Get messages from the OpenCode session
    const messages = await withOpenCodeErrorHandling(
      () => workspace.client!.session.messages(sessionId),
      { operation: "session.messages", sessionId }
    );

    return NextResponse.json({
      workspaceId: workspaceId,
      sessionId: sessionId,
      messages: messages,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Failed to get chat history:", error);
    
    // Handle OpenCodeError (wrapped errors from withOpenCodeErrorHandling)
    if (error instanceof OpenCodeError) {
      const openCodeError = error;
      // Extract the original status code if available
      if (openCodeError.context?.status) {
        const status = openCodeError.context.status as number;
        let errorMessage = "Failed to retrieve chat history";
        
        // Provide user-friendly error messages based on status
        if (status === 404) {
          errorMessage = "Session not found";
        } else if (status === 400) {
          errorMessage = "Invalid request";
        } else if (status === 401) {
          errorMessage = "Authentication failed";
        } else if (status === 403) {
          errorMessage = "Permission denied";
        }
        
        return NextResponse.json(
          { error: errorMessage },
          { status }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to retrieve chat history" },
      { status: 500 }
    );
  }
}