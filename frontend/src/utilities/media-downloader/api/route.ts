import { NextResponse } from "next/server";
import {
  getMediaDownloadJobPayload,
  getMediaDownloaderPayload,
  startMediaDownload
} from "@twin-hub/backend/utilities/media-downloader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(getMediaDownloaderPayload());
  }

  const payload = getMediaDownloadJobPayload(jobId);

  if (!payload) {
    return NextResponse.json(
      {
        error: "Job not found"
      },
      {
        status: 404
      }
    );
  }

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = startMediaDownload({
    url: String(body.url ?? ""),
    format: body.format,
    fileName: body.fileName ? String(body.fileName) : undefined
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error
      },
      {
        status: result.status
      }
    );
  }

  return NextResponse.json(
    {
      job: result.job
    },
    {
      status: 202
    }
  );
}
