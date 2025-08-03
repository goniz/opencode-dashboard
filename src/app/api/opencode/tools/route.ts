import { NextRequest, NextResponse } from "next/server";

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

    // Get the OpenCode URL from environment or try common ports
    const openCodeHost = process.env.OPENCODE_HOST || "localhost";
    const openCodePort = process.env.OPENCODE_PORT || "8080";
    const openCodeUrl = `http://${openCodeHost}:${openCodePort}`;

    try {
      // Try to fetch available tools from OpenCode with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${openCodeUrl}/api/sessions/${sessionId}/tools`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`OpenCode API returned ${response.status}: ${response.statusText}`);
        return NextResponse.json({
          tools: [],
          sessionId,
          source: "error",
          message: `OpenCode API unavailable (${response.status}: ${response.statusText})`
        });
      }

      const data = await response.json();
      const tools = data.tools || data || [];

      return NextResponse.json({
        tools: Array.isArray(tools) ? tools : [],
        sessionId,
        source: "opencode"
      });

    } catch (fetchError) {
      // Connection failed
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      console.warn("Failed to connect to OpenCode:", errorMessage);
      
      return NextResponse.json({
        tools: [],
        sessionId,
        source: "error",
        message: `OpenCode not accessible: ${errorMessage}`
      });
    }

  } catch (error) {
    console.error("Error in tools API:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({
      tools: [],
      sessionId: request.nextUrl.searchParams.get("sessionId"),
      source: "error",
      message: `API error: ${errorMessage}`
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, toolName, parameters } = body;

    if (!sessionId || !toolName) {
      return NextResponse.json(
        { error: "Session ID and tool name are required" },
        { status: 400 }
      );
    }

    // Get the OpenCode URL from environment
    const openCodeHost = process.env.OPENCODE_HOST || "localhost";
    const openCodePort = process.env.OPENCODE_PORT || "8080";
    const openCodeUrl = `http://${openCodeHost}:${openCodePort}`;

    try {
      // Try to execute tool via OpenCode with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for tool execution

      const response = await fetch(`${openCodeUrl}/api/sessions/${sessionId}/tools/${toolName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ parameters }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to execute tool:", response.statusText, errorText);
        return NextResponse.json(
          { 
            error: "Failed to execute tool", 
            details: errorText,
            toolName,
            parameters 
          },
          { status: response.status }
        );
      }

      const result = await response.json();

      return NextResponse.json({
        result: result.result || result,
        success: true,
        toolName,
        source: "opencode"
      });

    } catch (fetchError) {
      // Connection failed or timeout
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      console.error("Failed to connect to OpenCode for tool execution:", errorMessage);
      
      // Return a mock result indicating the tool couldn't be executed
      return NextResponse.json({
        result: `Tool '${toolName}' could not be executed: OpenCode not accessible (${errorMessage})`,
        success: false,
        toolName,
        source: "fallback",
        error: "OpenCode connection failed"
      }, { status: 503 });
    }

  } catch (error) {
    console.error("Error in tool execution API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}