import assert from "node:assert/strict";
import test from "node:test";
import { toMediaConvertPublicJob } from "./public-job.ts";

test("media converter public jobs omit internal paths, logs, and process ids", () => {
  const publicJob = toMediaConvertPublicJob({
    id: "job-1",
    status: "failed",
    profileId: "mp3",
    originalName: "input.wav",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:01.000Z",
    inputPath: "C:\\private\\input.wav",
    outputPath: "C:\\private\\output.mp3",
    outputDir: "C:\\private",
    fileName: "output.mp3",
    progress: 20,
    processId: 42,
    logs: ["private log"],
    error: "Failed at C:\\private\\input.wav"
  });

  assert.equal(publicJob.error, "Failed at <server path>");
  assert.equal("inputPath" in publicJob, false);
  assert.equal("outputPath" in publicJob, false);
  assert.equal("processId" in publicJob, false);
  assert.equal("logs" in publicJob, false);
});
