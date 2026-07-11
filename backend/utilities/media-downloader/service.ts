import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { canUseLocalDesktopPaths, getDefaultUtilityOutputDir } from "../../lib/runtime.ts";
import { resolveMediaDownloadOutputPath } from "./output.ts";
import type { MediaDownloadJob, MediaDownloadRequest, MediaDownloaderConfig } from "./types";

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

const defaultNoOutputTimeoutMs = 30 * 60 * 1000;
const defaultStalledTimeoutMs = 2 * 60 * 1000;
const defaultYtdlpSocketTimeoutSeconds = 30;
const defaultYtdlpRetries = 10;
const defaultYtdlpFragmentRetries = 10;

export function getMediaDownloaderConfig(): MediaDownloaderConfig {
  return {
    enabled: process.env.MEDIA_DOWNLOADER_ENABLED === "true",
    downloadDir: resolveConfiguredDownloadDir(process.env.MEDIA_DOWNLOAD_DIR),
    ytdlpPath: process.env.YT_DLP_PATH ?? "yt-dlp",
    ytdlpJsRuntime: process.env.YT_DLP_JS_RUNTIME ?? "node",
    ytdlpSocketTimeoutSeconds: parsePositiveInteger(process.env.YT_DLP_SOCKET_TIMEOUT_SECONDS, defaultYtdlpSocketTimeoutSeconds),
    ytdlpRetries: parsePositiveInteger(process.env.YT_DLP_RETRIES, defaultYtdlpRetries),
    ytdlpFragmentRetries: parsePositiveInteger(process.env.YT_DLP_FRAGMENT_RETRIES, defaultYtdlpFragmentRetries),
    noOutputTimeoutMs: parseNonNegativeInteger(process.env.YT_DLP_NO_OUTPUT_TIMEOUT_MS, defaultNoOutputTimeoutMs),
    stalledTimeoutMs: parseNonNegativeInteger(process.env.YT_DLP_STALLED_TIMEOUT_MS, defaultStalledTimeoutMs)
  };
}

export function getMediaDownloaderInfo() {
  const config = getMediaDownloaderConfig();

  return {
    enabled: config.enabled,
    downloadDir: config.downloadDir,
    canPickLocalFolder: canUseLocalDesktopPaths(),
    storesOnServer: !canUseLocalDesktopPaths(),
    ytdlpJsRuntime: config.ytdlpJsRuntime,
    ytdlpSocketTimeoutSeconds: config.ytdlpSocketTimeoutSeconds,
    ytdlpRetries: config.ytdlpRetries,
    ytdlpFragmentRetries: config.ytdlpFragmentRetries,
    noOutputTimeoutMs: config.noOutputTimeoutMs,
    stalledTimeoutMs: config.stalledTimeoutMs,
    supportedHosts,
    requires: ["yt-dlp", "ffmpeg for mp3/wav/opus conversion"],
    source: "backend/utilities/media-downloader",
    timestamp: new Date().toISOString()
  };
}

export function getMediaDownloadJob(jobId: string) {
  const job = jobs.get(jobId) ?? null;

  if (job) {
    refreshFinishedJob(job);
  }

  return job;
}

export function createMediaDownloadJob(input: MediaDownloadRequest) {
  const config = getMediaDownloaderConfig();
  const validation = validateRequest(input, config);

  if (!validation.ok) {
    return validation;
  }

  const outputDir = resolveOutputDir(input.outputDir, config.downloadDir);

  mkdirSync(outputDir, {
    recursive: true
  });

  const id = randomUUID();
  const now = new Date().toISOString();
  const job: MediaDownloadJob = {
    id,
    status: "queued",
    url: input.url,
    format: input.format,
    outputDir,
    progress: 0,
    createdAt: now,
    updatedAt: now,
    lastOutputAt: now,
    lastProgressAt: now,
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

  if (!["video", "mp3", "wav", "opus"].includes(input.format)) {
    return {
      ok: false as const,
      status: 400,
      error: "Invalid format."
    };
  }

  return {
    ok: true as const
  };
}

function startDownload(job: MediaDownloadJob, input: MediaDownloadRequest, config: MediaDownloaderConfig) {
  const outputTemplate = buildOutputTemplate(input.fileName);
  const outputDir = job.outputDir ?? config.downloadDir;
  const args = [
    "--no-playlist",
    "--newline",
    "--progress-template",
    "download:%(progress._percent_str)s",
    "--no-continue",
    "--socket-timeout",
    String(config.ytdlpSocketTimeoutSeconds),
    "--retries",
    String(config.ytdlpRetries),
    "--fragment-retries",
    String(config.ytdlpFragmentRetries),
    "--restrict-filenames",
    "--live-from-start",
    "--hls-use-mpegts",
    ...buildJsRuntimeArgs(config),
    ...buildSiteHeaderArgs(input.url),
    "--paths",
    `home:${outputDir}`,
    "--output",
    outputTemplate,
    "--print",
    "after_video:filepath",
    ...buildFormatArgs(input.format),
    input.url
  ];

  job.status = "running";
  job.progress = Math.max(job.progress, 1);
  job.updatedAt = new Date().toISOString();
  job.logs.push(`Starting yt-dlp ${args.slice(0, -1).join(" ")} <url>`);

  const child = spawn(config.ytdlpPath, args, {
    windowsHide: true
  });
  const watchdog = setInterval(() => {
    if (job.status !== "running") {
      clearInterval(watchdog);
      return;
    }

    const now = Date.now();
    const lastOutputAt = job.lastOutputAt ? Date.parse(job.lastOutputAt) : Date.parse(job.updatedAt);
    const lastProgressAt = job.lastProgressAt ? Date.parse(job.lastProgressAt) : Date.parse(job.updatedAt);
    const silentMs = now - lastOutputAt;
    const stalledMs = now - lastProgressAt;

    if (config.noOutputTimeoutMs > 0 && silentMs > config.noOutputTimeoutMs) {
      killProcessTree(child.pid);
      failJob(job, `yt-dlp output stopped for more than ${Math.round(config.noOutputTimeoutMs / 1000)} seconds.`);
      clearInterval(watchdog);
      return;
    }

    if (config.stalledTimeoutMs > 0 && stalledMs > config.stalledTimeoutMs) {
      killProcessTree(child.pid);
      failJob(job, `yt-dlp made no progress for more than ${Math.round(config.stalledTimeoutMs / 1000)} seconds.`);
      clearInterval(watchdog);
    }
  }, 10000);

  job.processId = child.pid;

  child.stdout.on("data", (chunk: Buffer) => {
    handleOutput(job, chunk.toString());
  });

  child.stderr.on("data", (chunk: Buffer) => {
    handleOutput(job, chunk.toString());
  });

  child.on("error", (error) => {
    clearInterval(watchdog);
    failJob(job, error.message);
  });

  child.on("close", (code) => {
    clearInterval(watchdog);

    if (job.status === "failed") {
      return;
    }

    const outputPath = resolveMediaDownloadOutputPath(job, input.format);

    if (code === 0 && outputPath) {
      completeJob(job, outputPath);
      return;
    }

    failJob(job, getYtdlpFailureMessage(job, code));
  });
}

function buildFormatArgs(format: MediaDownloadRequest["format"]) {
  if (format === "mp3" || format === "wav" || format === "opus") {
    return ["-f", "ba/bestaudio", "--extract-audio", "--audio-format", format, "--audio-quality", "0"];
  }

  return ["-f", "bv*+ba/b", "--merge-output-format", "mp4"];
}

function buildJsRuntimeArgs(config: MediaDownloaderConfig) {
  const runtime = config.ytdlpJsRuntime.trim();

  if (!runtime || runtime === "none") {
    return [];
  }

  return ["--js-runtimes", runtime];
}

function buildSiteHeaderArgs(url: string) {
  if (!isBilibiliUrl(url)) {
    return [];
  }

  return [
    "--add-header",
    "Referer:https://www.bilibili.com",
    "--add-header",
    "Origin:https://www.bilibili.com",
    "--add-header",
    "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
  ];
}

function isBilibiliUrl(url: string) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    return hostname === "b23.tv" || hostname.endsWith("bilibili.com");
  } catch {
    return false;
  }
}

function getYtdlpFailureMessage(job: MediaDownloadJob, code: number | null) {
  const recentError = [...job.logs]
    .reverse()
    .find((line) => line.startsWith("ERROR:") || line.includes("HTTP Error") || line.includes("Use --cookies"));

  if (recentError) {
    return recentError.replace(/^ERROR:\s*/, "");
  }

  return `yt-dlp exited with code ${code ?? "unknown"}.`;
}

function killProcessTree(pid: number | undefined) {
  if (!pid) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(pid), "/t", "/f"], {
      windowsHide: true
    });
    return;
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // The process may already have exited.
  }
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = parseNonNegativeInteger(value, fallback);

  return parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function getDefaultDownloadsDir() {
  return getDefaultUtilityOutputDir("media-downloads");
}

function resolveConfiguredDownloadDir(value: string | undefined) {
  const defaultDir = getDefaultDownloadsDir();
  const configured = value?.trim();

  if (!configured) {
    return defaultDir;
  }

  const resolved = path.resolve(configured);
  const legacyDefaultDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".downloads", "media");

  return samePath(resolved, legacyDefaultDir) ? defaultDir : resolved;
}

function resolveOutputDir(outputDir: string | undefined, fallbackDir: string) {
  if (!canUseLocalDesktopPaths()) {
    return fallbackDir;
  }

  const configured = outputDir?.trim();

  if (!configured) {
    return fallbackDir;
  }

  const resolved = path.resolve(configured);
  const legacyDefaultDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".downloads", "media");

  return samePath(resolved, legacyDefaultDir) ? getDefaultDownloadsDir() : resolved;
}

function samePath(left: string, right: string) {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);

  return process.platform === "win32" ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase() : normalizedLeft === normalizedRight;
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
    .map((line) => stripAnsi(line).trim())
    .filter(Boolean);

  const previousProgress = job.progress;

  for (const line of lines) {
    handleProgressLine(job, line);
    job.logs.push(line);
  }

  const now = new Date().toISOString();

  job.logs = job.logs.slice(-80);
  job.lastOutputAt = now;
  job.updatedAt = now;

  if (job.progress > previousProgress) {
    job.lastProgressAt = now;
  }
}

function stripAnsi(value: string) {
  return value.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}

function handleProgressLine(job: MediaDownloadJob, line: string) {
  if (line.startsWith("[youtube]") || line.startsWith("[BiliBili]") || line.startsWith("[bilibili]")) {
    job.progress = Math.max(job.progress, 2);
  }

  if (line.startsWith("[info]")) {
    job.progress = Math.max(job.progress, 3);
  }

  if (line.startsWith("[download] Destination") || line.includes("Downloading m3u8 information")) {
    job.progress = Math.max(job.progress, 5);
  }

  const progressMatch = line.match(/(?:\[download\]\s+|download:\s*)(\d+(?:\.\d+)?)%/);

  if (progressMatch) {
    const value = Number(progressMatch[1]);

    if (Number.isFinite(value)) {
      job.progress = Math.max(job.progress, Math.min(99, Math.floor(value)));
    }
  }

  if (line.startsWith("[Merger]") || line.startsWith("[ExtractAudio]")) {
    job.progress = Math.max(job.progress, 95);
  }
}

function refreshFinishedJob(job: MediaDownloadJob) {
  if (job.status !== "running" || !job.processId || isProcessAlive(job.processId)) {
    return;
  }

  const outputPath = resolveMediaDownloadOutputPath(job, job.format);

  if (outputPath) {
    completeJob(job, outputPath);
    return;
  }

  failJob(job, "yt-dlp stopped before reporting the completed file.");
}

function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function completeJob(job: MediaDownloadJob, outputPath: string) {
  job.status = "completed";
  job.outputPath = outputPath;
  job.fileName = path.basename(outputPath);
  job.progress = 100;
  job.updatedAt = new Date().toISOString();
  job.logs.push(`Completed: ${job.fileName}`);
}

function failJob(job: MediaDownloadJob, message: string) {
  job.status = "failed";
  job.error = message;
  job.progress = job.progress || 0;
  job.updatedAt = new Date().toISOString();
  job.logs.push(`Failed: ${message}`);
}
