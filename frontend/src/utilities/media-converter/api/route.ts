import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  getMediaConvertJobPayload,
  getMediaConverterPayload,
  startMediaConvert
} from "@twin-hub/backend/utilities/media-converter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(getMediaConverterPayload());
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
  const info = getMediaConverterPayload();
  const formData = await request.formData();
  const file = formData.get("file");
  const profileId = String(formData.get("profileId") ?? "");
  const outputName = formData.get("outputName") ? String(formData.get("outputName")) : undefined;

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

  const uploadDir = path.join(info.convertDir, "uploads", randomUUID());
  const inputPath = path.join(uploadDir, sanitizeFileName(file.name || "input.bin"));
  const bytes = Buffer.from(await file.arrayBuffer());

  await mkdir(uploadDir, {
    recursive: true
  });
  await writeFile(inputPath, bytes);

  const result = startMediaConvert({
    inputPath,
    originalName: file.name || "input.bin",
    profileId,
    outputName
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
