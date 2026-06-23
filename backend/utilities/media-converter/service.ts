import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, statSync } from "node:fs";
import os from "node:os";
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
    convertDir: resolveConfiguredConvertDir(process.env.MEDIA_CONVERT_DIR),
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
  const outputDir = resolveOutputDir(input.outputDir, config.convertDir);
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
    outputDir,
    fileName,
    progress: 0,
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
  const args = ["-hide_banner", "-y", "-i", inputPath, "-progress", "pipe:1", "-nostats", ...ffmpegArgs, outputPath];

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

function getDefaultDownloadsDir() {
  return path.join(os.homedir(), "Downloads");
}

function resolveConfiguredConvertDir(value: string | undefined) {
  const defaultDir = getDefaultDownloadsDir();
  const configured = value?.trim();

  if (!configured) {
    return defaultDir;
  }

  const resolved = path.resolve(configured);
  const legacyDefaultDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".conversions", "media");

  return samePath(resolved, legacyDefaultDir) ? defaultDir : resolved;
}

function resolveOutputDir(outputDir: string | undefined, fallbackDir: string) {
  const configured = outputDir?.trim();

  if (!configured) {
    return fallbackDir;
  }

  const resolved = path.resolve(configured);
  const legacyDefaultDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".conversions", "media");

  return samePath(resolved, legacyDefaultDir) ? getDefaultDownloadsDir() : resolved;
}

function samePath(left: string, right: string) {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);

  return process.platform === "win32" ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase() : normalizedLeft === normalizedRight;
}

function handleOutput(job: MediaConvertJob, output: string) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    handleProgressLine(job, line);
    job.logs.push(line);
  }

  job.logs = job.logs.slice(-120);
  job.updatedAt = new Date().toISOString();
}

function handleProgressLine(job: MediaConvertJob, line: string) {
  const durationMatch = line.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);

  if (durationMatch) {
    job.durationMs = timePartsToMs(durationMatch[1], durationMatch[2], durationMatch[3]);
  }

  if (line.startsWith("out_time_ms=")) {
    const value = Number(line.slice("out_time_ms=".length));

    if (Number.isFinite(value)) {
      job.currentTimeMs = Math.max(0, Math.floor(value / 1000));
      updateProgress(job);
    }
  }

  if (line === "progress=end") {
    job.progress = 100;
  }
}

function timePartsToMs(hours: string, minutes: string, seconds: string) {
  return Math.floor((Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)) * 1000);
}

function updateProgress(job: MediaConvertJob) {
  if (!job.durationMs || !job.currentTimeMs) {
    return;
  }

  const progress = Math.floor((job.currentTimeMs / job.durationMs) * 100);
  job.progress = Math.max(job.progress, Math.min(99, progress));
}

function completeJob(job: MediaConvertJob) {
  job.status = "completed";
  job.progress = 100;
  job.updatedAt = new Date().toISOString();
  job.logs.push(`Completed: ${job.fileName}`);
}

function failJob(job: MediaConvertJob, message: string) {
  job.status = "failed";
  job.error = message;
  job.progress = job.progress || 0;
  job.updatedAt = new Date().toISOString();
  job.logs.push(`Failed: ${message}`);
}
