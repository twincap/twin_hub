import assert from "node:assert/strict";
import test from "node:test";
import { toMediaDownloadPublicJob } from "./public-job.ts";

test("media downloader public jobs omit internal paths, logs, and process ids", () => {
  const publicJob = toMediaDownloadPublicJob({
    id: "job-1",
    status: "failed",
    url: "https://www.youtube.com/watch?v=test",
    format: "video",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:01.000Z",
    outputPath: "C:\\private\\video.mp4",
    outputDir: "C:\\private",
    fileName: "video.mp4",
    progress: 20,
    processId: 42,
    logs: ["private log"],
    error: "Failed in C:\\private"
  });

  assert.equal(publicJob.error, "Failed in <server path>");
  assert.equal("outputPath" in publicJob, false);
  assert.equal("outputDir" in publicJob, false);
  assert.equal("processId" in publicJob, false);
  assert.equal("logs" in publicJob, false);
});
