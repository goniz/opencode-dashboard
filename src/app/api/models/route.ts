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

  // Decode URL encoding first to catch encoded traversal attempts
  const decodedPath = decodeURIComponent(folderPath);
  
  // Check for suspicious patterns that could indicate injection attempts or path traversal
  const suspiciousPatterns = [
    /['"]/g, // quotes
    /;/g, // semicolons  
    /--/g, // SQL comments
    /union/gi, // UNION keyword
    /select/gi, // SELECT keyword
    /drop/gi, // DROP keyword
    /insert/gi, // INSERT keyword
    /update/gi, // UPDATE keyword
    /delete/gi, // DELETE keyword
    /\.\./g, // directory traversal
    /[<>]/g, // potential XSS
    /\|/g, // pipe (command injection)
    /&/g, // ampersand (command injection)
    /`/g, // backtick (command injection)
    /\$/g, // dollar sign (variable expansion)
  ];

  const hasSuspiciousContent = suspiciousPatterns.some(pattern => pattern.test(folderPath) || pattern.test(decodedPath));
  
  // Additional checks for path traversal - be more specific about dangerous paths  
  const hasSystemPaths = /(\/etc\/|\/windows\/|\/system32\/|passwd|shadow)/gi.test(decodedPath);
  const hasDangerousPaths = /(\/root\/|\/home\/.*\/\.ssh|\/var\/|\/usr\/bin)/gi.test(decodedPath);
  
  if (hasSuspiciousContent || hasSystemPaths || hasDangerousPaths) {
    return NextResponse.json(
      { error: "Invalid characters in folder parameter" },
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