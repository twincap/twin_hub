import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  getMediaConvertJobPayload,
  getMediaConverterPayload,
  startMediaConvert
} from "@twin-hub/backend/utilities/media-converter";
import { canUseLocalFileAccess, getLocalOutputDir, isSameOriginMutation } from "@/server/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(
      getMediaConverterPayload({
        includeLocalOutputDir: canUseLocalFileAccess(request)
      })
    );
  }

  const payload = getMediaConvertJobPayload(jobId);

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

  const canUseLocalOutputDir = canUseLocalFileAccess(request);
  const info = getMediaConverterPayload({
    includeLocalOutputDir: canUseLocalOutputDir
  });
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error: "A multipart form body is required."
      },
      {
        status: 400
      }
    );
  }

  const file = formData.get("file");
  const profileId = String(formData.get("profileId") ?? "");
  const outputName = formData.get("outputName") ? String(formData.get("outputName")) : undefined;
  const outputDir = getLocalOutputDir(request, formData.get("outputDir"));

  if (!info.enabled || info.ffmpegDetected === false) {
    return NextResponse.json(
      {
        error: "The media converter is not available on this server."
      },
      {
        status: 503
      }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        error: "file is required"
      },
      {
        status: 400
      }
    );
  }

  if (file.size > info.maxUploadMb * 1024 * 1024) {
    return NextResponse.json(
      {
        error: `File is too large. Max upload is ${info.maxUploadMb} MB.`
      },
      {
        status: 413
      }
    );
  }

  if (!info.profiles.some((profile) => profile.id === profileId)) {
    return NextResponse.json(
      {
        error: "Unsupported output profile."
      },
      {
        status: 400
      }
    );
  }

  const uploadDir = path.join(os.tmpdir(), "twin-hub", "media-converter", randomUUID());
  const inputPath = path.join(uploadDir, sanitizeFileName(file.name || "input.bin"));

  try {
    const bytes = Buffer.from(await file.arrayBuffer());

    await mkdir(uploadDir, {
      recursive: true
    });
    await writeFile(inputPath, bytes);

    const result = startMediaConvert({
      inputPath,
      originalName: file.name || "input.bin",
      profileId,
      outputName,
      outputDir,
      removeInputOnFinish: true
    });

    if (!result.ok) {
      await rm(uploadDir, {
        force: true,
        recursive: true
      });

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
  } catch {
    await rm(uploadDir, {
      force: true,
      recursive: true
    });

    return NextResponse.json(
      {
        error: "The uploaded file could not be prepared."
      },
      {
        status: 500
      }
    );
  }
}

function sanitizeFileName(name: string) {
  const parsed = path.parse(name);
  const ext = parsed.ext.replace(/[^\w.]+/g, "");
  const base = (parsed.name || "input")
    .trim()
    .replace(/[^\w .-]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-. ]+|[-. ]+$/g, "");

  return `${base || "input"}${ext}`;
}
