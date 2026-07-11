import type { MediaDownloadJob, MediaDownloadPublicJob } from "./types";

export function toMediaDownloadPublicJob(job: MediaDownloadJob): MediaDownloadPublicJob {
  return {
    id: job.id,
    status: job.status,
    url: job.url,
    format: job.format,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    fileName: job.fileName,
    progress: job.progress,
    error: sanitizeError(job.error, [job.outputPath, job.outputDir])
  };
}

function sanitizeError(message: string | undefined, sensitiveValues: Array<string | undefined>) {
  return sensitiveValues.reduce((current, value) => (value ? current?.replaceAll(value, "<server path>") : current), message);
}
