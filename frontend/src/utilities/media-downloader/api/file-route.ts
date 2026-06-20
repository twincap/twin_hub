import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getMediaDownloadJob } from "@twin-hub/backend/utilities/media-downloader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(
      {
        error: "jobId is required"
      },
      {
        status: 400
      }
    );
  }

  const job = getMediaDownloadJob(jobId);

  if (!job || job.status !== "completed" || !job.outputPath || !existsSync(job.outputPath)) {
    return NextResponse.json(
      {
        error: "Download file not found"
      },
      {
        status: 404
      }
    );
  }

  const stream = createReadStream(job.outputPath);
  const fileName = job.fileName ?? "download";
  const stats = statSync(job.outputPath);

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Content-Length": String(stats.size),
      "Content-Type": "application/octet-stream"
    }
  });
}
