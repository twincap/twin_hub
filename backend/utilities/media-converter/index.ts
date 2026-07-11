import { createMediaConvertJob, getMediaConverterInfo, getMediaConvertJob } from "./service";
import { toMediaConvertPublicJob } from "./public-job";
import type { MediaConvertRequest } from "./types";

type MediaConverterPayloadOptions = {
  includeLocalOutputDir?: boolean;
};

export function getMediaConverterPayload(options: MediaConverterPayloadOptions = {}) {
  const { convertDir, ...info } = getMediaConverterInfo();

  return {
    ...info,
    canPickLocalFolder: Boolean(options.includeLocalOutputDir && info.canPickLocalFolder),
    convertDir: options.includeLocalOutputDir ? convertDir : ""
  };
}

export function getMediaConvertJobPayload(jobId: string) {
  const job = getMediaConvertJob(jobId);

  if (!job) {
    return null;
  }

  return {
    job: toMediaConvertPublicJob(job),
    canDownload: job.status === "completed" && Boolean(job.outputPath),
    timestamp: new Date().toISOString()
  };
}

export function startMediaConvert(input: MediaConvertRequest) {
  const result = createMediaConvertJob(input);

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    job: toMediaConvertPublicJob(result.job)
  };
}

export { getMediaConvertJob } from "./service";
export type { MediaConvertPublicJob, MediaConvertRequest } from "./types";
