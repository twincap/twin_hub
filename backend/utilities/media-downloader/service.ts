import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import type {
  MediaDownloadJob,
  MediaDownloadQuality,
  MediaDownloadRequest,
  MediaDownloaderConfig
} from "./types";

type JobStore = Map<string, MediaDownloadJob>;

const globalStore = globalThis as typeof globalThis & {
  __twinHubMediaDownloadJobs?: JobStore;
};

const jobs: JobStore = globalStore.__twinHubMediaDownloadJobs ?? new Map<string, MediaDownloadJob>();
globalStore.__twinHubMediaDownloadJobs = jobs;

const supportedHosts = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "bilibili.com",
  "www.bilibili.com",
  "m.bilibili.com",
  "b23.tv"
];

export function getMediaDownloaderConfig(): MediaDownloaderConfig {
  return {
    enabled: process.env.MEDIA_DOWNLOADER_ENABLED === "true",
    downloadDir: process.env.MEDIA_DOWNLOAD_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), ".downloads", "media"),
    ytdlpPath: process.env.YT_DLP_PATH ?? "yt-dlp"
  };
}

export function getMediaDownloaderInfo() {
  const config = getMediaDownloaderConfig();

  return {
    enabled: config.enabled,
    downloadDir: config.downloadDir,
    ytdlpPath: config.ytdlpPath,
    supportedHosts,
    requires: ["yt-dlp", "ffmpeg for mp3/wav conversion"],
    source: "backend/utilities/media-downloader",
    timestamp: new Date().toISOString()
  };
}

export function getMediaDownloadJob(jobId: string) {
  return jobs.get(jobId) ?? null;
}

export function createMediaDownloadJob(input: MediaDownloadRequest) {
  const config = getMediaDownloaderConfig();
  const validation = validateRequest(input, config);

  if (!validation.ok) {
    return validation;
  }

  mkdirSync(config.downloadDir, {
    recursive: true
  });

  const id = randomUUID();
  const now = new Date().toISOString();
  const job: MediaDownloadJob = {
    id,
    status: "queued",
    url: input.url,
    format: input.format,
    quality: input.quality,
    createdAt: now,
    updatedAt: now,
    logs: []
  };

  jobs.set(id, job);
  startDownload(job, input, config);

  return {
    ok: true as const,
    job
  };
}

function validateRequest(input: MediaDownloadRequest, config: MediaDownloaderConfig) {
  if (!config.enabled) {
    return {
      ok: false as const,
      status: 503,
      error: "MEDIA_DOWNLOADER_ENABLED=true is required on the server."
    };
  }

  if (!input.acceptTerms) {
    return {
      ok: false as const,
      status: 400,
      error: "You must confirm that you have permission to download this media."
    };
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(input.url);
  } catch {
    return {
      ok: false as const,
      status: 400,
      error: "Invalid URL."
    };
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return {
      ok: false as const,
      status: 400,
      error: "Only http and https URLs are supported."
    };
  }

  if (!supportedHosts.some((host) => parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`))) {
    return {
      ok: false as const,
      status: 400,
      error: "Only YouTube, Bilibili, and b23.tv URLs are currently allowed."
    };
  }

  if (!["video", "mp3", "wav"].includes(input.format)) {
    return {
      ok: false as const,
      status: 400,
      error: "Invalid format."
    };
  }

  if (!["best", "1080", "720", "480", "audio-best"].includes(input.quality)) {
    return {
      ok: false as const,
      status: 400,
      error: "Invalid quality."
    };
  }

  return {
    ok: true as const
  };
}

function startDownload(job: MediaDownloadJob, input: MediaDownloadRequest, config: MediaDownloaderConfig) {
  const outputTemplate = buildOutputTemplate(input.fileName);
  const args = [
    "--no-playlist",
    "--restrict-filenames",
    "--paths",
    `home:${config.downloadDir}`,
    "--output",
    outputTemplate,
    "--print",
    "after_move:filepath",
    ...buildFormatArgs(input.format, input.quality),
    input.url
  ];

  job.status = "running";
  job.updatedAt = new Date().toISOString();
  job.logs.push(`Starting yt-dlp ${args.slice(0, -1).join(" ")} <url>`);

  const child = spawn(config.ytdlpPath, args, {
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

    const outputPath = resolveOutputPath(job);

    if (code === 0 && outputPath) {
      completeJob(job, outputPath);
      return;
    }

    failJob(job, `yt-dlp exited with code ${code ?? "unknown"}.`);
  });
}

function buildFormatArgs(format: MediaDownloadRequest["format"], quality: MediaDownloadQuality) {
  if (format === "mp3" || format === "wav") {
    return ["-f", "ba/bestaudio", "--extract-audio", "--audio-format", format, "--audio-quality", "0"];
  }

  const formatSelector = quality === "best" || quality === "audio-best"
    ? "bv*+ba/b"
    : `bv*[height<=${quality}]+ba/b[height<=${quality}]/best[height<=${quality}]`;

  return ["-f", formatSelector, "--merge-output-format", "mp4"];
}

function buildOutputTemplate(fileName?: string) {
  const cleaned = fileName
    ?.trim()
    .replace(/[^\w .-]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-. ]+|[-. ]+$/g, "");

  return cleaned ? `${cleaned}.%(ext)s` : "%(title).120B-%(id)s.%(ext)s";
}

function handleOutput(job: MediaDownloadJob, output: string) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    job.logs.push(line);
  }

  job.logs = job.logs.slice(-80);
  job.updatedAt = new Date().toISOString();
}

function resolveOutputPath(job: MediaDownloadJob) {
  for (const line of [...job.logs].reverse()) {
    const candidate = path.resolve(line);

    if (path.isAbsolute(candidate) && existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function completeJob(job: MediaDownloadJob, outputPath: string) {
  job.status = "completed";
  job.outputPath = outputPath;
  job.fileName = path.basename(outputPath);
  job.updatedAt = new Date().toISOString();
  job.logs.push(`Completed: ${job.fileName}`);
}

function failJob(job: MediaDownloadJob, message: string) {
  job.status = "failed";
  job.error = message;
  job.updatedAt = new Date().toISOString();
  job.logs.push(`Failed: ${message}`);
}
