import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { getMediaConvertProfile, mediaConvertProfiles } from "./profiles";
import type { MediaConvertJob, MediaConvertRequest, MediaConverterConfig } from "./types";

type JobStore = Map<string, MediaConvertJob>;

const globalStore = globalThis as typeof globalThis & {
  __twinHubMediaConvertJobs?: JobStore;
};

const jobs: JobStore = globalStore.__twinHubMediaConvertJobs ?? new Map<string, MediaConvertJob>();
globalStore.__twinHubMediaConvertJobs = jobs;

export function getMediaConverterConfig(): MediaConverterConfig {
  return {
    enabled: process.env.MEDIA_CONVERTER_ENABLED === "true",
    convertDir: process.env.MEDIA_CONVERT_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), ".conversions", "media"),
    ffmpegPath: process.env.FFMPEG_PATH ?? "ffmpeg",
    maxUploadMb: Number(process.env.MEDIA_CONVERT_MAX_MB ?? 512)
  };
}

export function getMediaConverterInfo() {
  const config = getMediaConverterConfig();
  const ffmpeg = detectFfmpeg(config.ffmpegPath);

  return {
    enabled: config.enabled,
    convertDir: config.convertDir,
    ffmpegDetected: ffmpeg.detected,
    ffmpegPath: config.ffmpegPath,
    ffmpegVersion: ffmpeg.version,
    maxUploadMb: config.maxUploadMb,
    profiles: mediaConvertProfiles,
    requires: ["ffmpeg"],
    source: "backend/utilities/media-converter",
    timestamp: new Date().toISOString()
  };
}

function detectFfmpeg(ffmpegPath: string) {
  try {
    const result = spawnSync(ffmpegPath, ["-version"], {
      encoding: "utf8",
      timeout: 3000,
      windowsHide: true
    });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    const version = output.split(/\r?\n/).find(Boolean) ?? null;

    return {
      detected: result.status === 0,
      version
    };
  } catch (error) {
    return {
      detected: false,
      version: error instanceof Error ? error.message : null
    };
  }
}

export function getMediaConvertJob(jobId: string) {
  return jobs.get(jobId) ?? null;
}

export function createMediaConvertJob(input: MediaConvertRequest) {
  const config = getMediaConverterConfig();
  const validation = validateRequest(input, config);

  if (!validation.ok) {
    return validation;
  }

  const profile = validation.profile;
  const id = randomUUID();
  const now = new Date().toISOString();
  const outputDir = path.join(/*turbopackIgnore: true*/ config.convertDir, id);
  const fileName = buildOutputName(input.outputName || input.originalName, profile.extension);
  const outputPath = path.join(/*turbopackIgnore: true*/ outputDir, fileName);

  mkdirSync(outputDir, {
    recursive: true
  });

  const job: MediaConvertJob = {
    id,
    status: "queued",
    profileId: profile.id,
    originalName: input.originalName,
    createdAt: now,
    updatedAt: now,
    inputPath: input.inputPath,
    outputPath,
    fileName,
    logs: []
  };

  jobs.set(id, job);
  startConversion(job, input.inputPath, outputPath, profile.ffmpegArgs, config);

  return {
    ok: true as const,
    job
  };
}

function validateRequest(input: MediaConvertRequest, config: MediaConverterConfig) {
  if (!config.enabled) {
    return {
      ok: false as const,
      status: 503,
      error: "MEDIA_CONVERTER_ENABLED=true is required on the server."
    };
  }

  if (!existsSync(input.inputPath) || !statSync(input.inputPath).isFile()) {
    return {
      ok: false as const,
      status: 400,
      error: "Input file does not exist."
    };
  }

  const profile = getMediaConvertProfile(input.profileId);

  if (!profile) {
    return {
      ok: false as const,
      status: 400,
      error: "Unsupported output profile."
    };
  }

  return {
    ok: true as const,
    profile
  };
}

function startConversion(job: MediaConvertJob, inputPath: string, outputPath: string, ffmpegArgs: string[], config: MediaConverterConfig) {
  const args = ["-hide_banner", "-y", "-i", inputPath, ...ffmpegArgs, outputPath];

  job.status = "running";
  job.updatedAt = new Date().toISOString();
  job.logs.push(`Starting ffmpeg ${args.map((arg) => (arg === inputPath ? "<input>" : arg === outputPath ? "<output>" : arg)).join(" ")}`);

  const child = spawn(config.ffmpegPath, args, {
    windowsHide: true
  });

  job.processId = child.pid;

  child.stdout.on("data", (chunk: Buffer) => {
    handleOutput(job, chunk.toString());
  });

  child.stderr.on("data", (chunk: Buffer) => {
    handleOutput(job, chunk.toString());
  });

  child.on("error", (error) => {
    failJob(job, error.message);
  });

  child.on("close", (code) => {
    if (job.status === "failed") {
      return;
    }

    if (code === 0 && job.outputPath && existsSync(job.outputPath)) {
      completeJob(job);
      return;
    }

    failJob(job, `ffmpeg exited with code ${code ?? "unknown"}.`);
  });
}

function buildOutputName(name: string, extension: string) {
  const parsed = path.parse(name);
  const base = (parsed.name || "converted")
    .trim()
    .replace(/[^\w .-]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-. ]+|[-. ]+$/g, "");

  return `${base || "converted"}.${extension}`;
}

function handleOutput(job: MediaConvertJob, output: string) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    job.logs.push(line);
  }

  job.logs = job.logs.slice(-120);
  job.updatedAt = new Date().toISOString();
}

function completeJob(job: MediaConvertJob) {
  job.status = "completed";
  job.updatedAt = new Date().toISOString();
  job.logs.push(`Completed: ${job.fileName}`);
}

function failJob(job: MediaConvertJob, message: string) {
  job.status = "failed";
  job.error = message;
  job.updatedAt = new Date().toISOString();
  job.logs.push(`Failed: ${message}`);
}
