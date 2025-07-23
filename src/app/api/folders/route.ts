import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join } from "path";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get("path") || process.cwd();

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