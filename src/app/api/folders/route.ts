import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join } from "path";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get("path") || process.cwd();

  // Validate path parameter for security
  if (typeof path !== 'string') {
    return NextResponse.json(
      { error: "Invalid path parameter" },
      { status: 400 }
    );
  }

  // Decode URL encoding first to catch encoded traversal attempts
  const decodedPath = decodeURIComponent(path);
  
  // Check for suspicious patterns that could indicate injection attempts
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
  ];

  const hasSuspiciousContent = suspiciousPatterns.some(pattern => pattern.test(path) || pattern.test(decodedPath));
  
  // Additional checks for path traversal - be more specific about dangerous paths
  const hasSystemPaths = /(\/etc\/|\/windows\/|\/system32\/|passwd|shadow)/gi.test(decodedPath);
  const hasDangerousPaths = /(\/root\/|\/home\/.*\/\.ssh|\/var\/|\/usr\/bin)/gi.test(decodedPath);
  
  if (hasSuspiciousContent || hasSystemPaths || hasDangerousPaths) {
    return NextResponse.json(
      { error: "Invalid characters in path parameter" },
      { status: 400 }
    );
  }

  try {
    const entries = await readdir(path);
    const folders = [];

    for (const entry of entries) {
      try {
        const fullPath = join(path, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory() && !entry.startsWith(".")) {
          folders.push({
            name: entry,
            path: fullPath,
          });
        }
      } catch {
        // Skip entries that can't be accessed
        continue;
      }
    }

    return NextResponse.json({
      currentPath: path,
      folders: folders.sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to read directory" },
      { status: 500 }
    );
  }
}