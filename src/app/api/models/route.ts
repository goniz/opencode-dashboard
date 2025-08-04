import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const folderPath = searchParams.get("folder");

  if (!folderPath) {
    return NextResponse.json(
      { error: "Folder path is required" },
      { status: 400 }
    );
  }

  // Validate folder path for security
  if (typeof folderPath !== 'string') {
    return NextResponse.json(
      { error: "Invalid folder parameter" },
      { status: 400 }
    );
  }

  try {
    const { stdout, stderr } = await execAsync("opencode models", {
      cwd: folderPath,
      timeout: 10000, // 10 second timeout
    });

    if (stderr) {
      console.error("opencode models stderr:", stderr);
    }

    // Parse the output to extract model names
    const models = stdout
      .split("\n")
      .filter(line => line.trim())
      .map(line => line.trim());

    return NextResponse.json({
      models,
      folder: folderPath,
    });
  } catch (error) {
    console.error("Error running opencode models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}