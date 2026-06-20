import { createMediaDownloadJob, getMediaDownloaderInfo, getMediaDownloadJob } from "./service";
import type { MediaDownloadRequest } from "./types";

export function getMediaDownloaderPayload() {
  return getMediaDownloaderInfo();
}

export function getMediaDownloadJobPayload(jobId: string) {
  const job = getMediaDownloadJob(jobId);

  if (!job) {
    return null;
  }

  return {
    job,
    canDownload: job.status === "completed" && Boolean(job.outputPath),
    timestamp: new Date().toISOString()
  };
}

export function startMediaDownload(input: MediaDownloadRequest) {
  return createMediaDownloadJob(input);
}

export { getMediaDownloadJob } from "./service";
export type { MediaDownloadRequest } from "./types";
