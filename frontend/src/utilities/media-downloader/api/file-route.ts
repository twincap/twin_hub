import { NextResponse } from "next/server";
import { getMediaDownloadJob } from "@twin-hub/backend/utilities/media-downloader";
import { createDownloadResponse } from "@/server/files/download-response";

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

  if (!job || job.status !== "completed" || !job.outputPath) {
    return NextResponse.json(
      {
        error: "Download file not found"
      },
      {
        status: 404
      }
    );
  }

  const fileName = job.fileName ?? "download";
  const response = createDownloadResponse(job.outputPath, fileName);

  return response ?? NextResponse.json({ error: "Download file not found" }, { status: 404 });
}
