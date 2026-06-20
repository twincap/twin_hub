import { createMediaConvertJob, getMediaConverterInfo, getMediaConvertJob } from "./service";
import type { MediaConvertRequest } from "./types";

export function getMediaConverterPayload() {
  return getMediaConverterInfo();
}

export function getMediaConvertJobPayload(jobId: string) {
  const job = getMediaConvertJob(jobId);

  if (!job) {
    return null;
  }

  return {
    job,
    canDownload: job.status === "completed" && Boolean(job.outputPath),
    timestamp: new Date().toISOString()
  };
}

export function startMediaConvert(input: MediaConvertRequest) {
  return createMediaConvertJob(input);
}

export { getMediaConvertJob } from "./service";
export type { MediaConvertRequest } from "./types";
