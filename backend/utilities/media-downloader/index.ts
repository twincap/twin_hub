import { createMediaDownloadJob, getMediaDownloaderInfo, getMediaDownloadJob } from "./service";
import { toMediaDownloadPublicJob } from "./public-job";
import type { MediaDownloadRequest } from "./types";

type MediaDownloaderPayloadOptions = {
  includeLocalOutputDir?: boolean;
};

export function getMediaDownloaderPayload(options: MediaDownloaderPayloadOptions = {}) {
  const { downloadDir, ...info } = getMediaDownloaderInfo();

  return {
    ...info,
    canPickLocalFolder: Boolean(options.includeLocalOutputDir && info.canPickLocalFolder),
    downloadDir: options.includeLocalOutputDir ? downloadDir : ""
  };
}

export function getMediaDownloadJobPayload(jobId: string) {
  const job = getMediaDownloadJob(jobId);

  if (!job) {
    return null;
  }

  return {
    job: toMediaDownloadPublicJob(job),
    canDownload: job.status === "completed" && Boolean(job.outputPath),
    timestamp: new Date().toISOString()
  };
}

export function startMediaDownload(input: MediaDownloadRequest) {
  const result = createMediaDownloadJob(input);

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    job: toMediaDownloadPublicJob(result.job)
  };
}

export { getMediaDownloadJob } from "./service";
export type { MediaDownloadPublicJob, MediaDownloadRequest } from "./types";
