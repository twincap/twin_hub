import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

const contentTypes: Record<string, string> = {
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "video/webm"
};

export function createDownloadResponse(filePath: string, fileName: string) {
  try {
    if (!existsSync(filePath)) {
      return null;
    }

    const stats = statSync(filePath);

    if (!stats.isFile()) {
      return null;
    }

    const stream = createReadStream(filePath);
    const contentType = contentTypes[path.extname(fileName).toLowerCase()] ?? "application/octet-stream";

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Content-Length": String(stats.size),
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return null;
  }
}
