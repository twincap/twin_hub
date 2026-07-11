import type { MediaConvertJob, MediaConvertPublicJob } from "./types";

export function toMediaConvertPublicJob(job: MediaConvertJob): MediaConvertPublicJob {
  return {
    id: job.id,
    status: job.status,
    profileId: job.profileId,
    originalName: job.originalName,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    fileName: job.fileName,
    progress: job.progress,
    error: sanitizeError(job.error, [job.inputPath, job.outputPath, job.outputDir])
  };
}

function sanitizeError(message: string | undefined, sensitiveValues: Array<string | undefined>) {
  return sensitiveValues.reduce((current, value) => (value ? current?.replaceAll(value, "<server path>") : current), message);
}
