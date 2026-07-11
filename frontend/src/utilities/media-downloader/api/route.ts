import { NextResponse } from "next/server";
import {
  getMediaDownloadJobPayload,
  getMediaDownloaderPayload,
  startMediaDownload
} from "@twin-hub/backend/utilities/media-downloader";
import type { MediaDownloadRequest } from "@twin-hub/backend/utilities/media-downloader";
import { canUseLocalFileAccess, getLocalOutputDir, isSameOriginMutation } from "@/server/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(
      getMediaDownloaderPayload({
        includeLocalOutputDir: canUseLocalFileAccess(request)
      })
    );
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
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      {
        error: "Cross-origin requests are not allowed."
      },
      {
        status: 403
      }
    );
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      {
        error: "A JSON request body is required."
      },
      {
        status: 400
      }
    );
  }

  const result = startMediaDownload({
    url: String(body.url ?? ""),
    format: String(body.format ?? "") as MediaDownloadRequest["format"],
    fileName: body.fileName ? String(body.fileName) : undefined,
    outputDir: getLocalOutputDir(request, body.outputDir)
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
