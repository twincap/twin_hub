import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveMediaDownloadOutputPath } from "./output.ts";
import type { MediaDownloadJob } from "./types.ts";

test("media downloader accepts result files only from its assigned output directory", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "twin-hub-output-test-"));
  const outputDir = path.join(root, "output");
  const insidePath = path.join(outputDir, "video-test-id.mp4");
  const outsidePath = path.join(root, "private.mp4");

  mkdirSync(outputDir);
  writeFileSync(insidePath, "inside");
  writeFileSync(outsidePath, "outside");

  const job: MediaDownloadJob = {
    id: "job-1",
    status: "running",
    url: "https://www.youtube.com/watch?v=test-id",
    format: "video",
    createdAt: new Date(Date.now() - 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    outputDir,
    progress: 50,
    logs: [outsidePath]
  };

  try {
    assert.equal(resolveMediaDownloadOutputPath(job, "video"), insidePath);

    rmSync(insidePath);
    assert.equal(resolveMediaDownloadOutputPath(job, "video"), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
