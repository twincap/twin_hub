import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createMediaDownloadJob, getMediaDownloaderConfig } from "./service.ts";
import type { MediaDownloadRequest } from "./types.ts";

test("media downloader config reads and normalizes server environment values", () => {
  const downloadDir = path.join(os.tmpdir(), "twin-hub-downloader-config");

  withEnv(
    {
      MEDIA_DOWNLOADER_ENABLED: "true",
      MEDIA_DOWNLOAD_DIR: downloadDir,
      YT_DLP_PATH: "custom-yt-dlp",
      YT_DLP_JS_RUNTIME: "deno",
      YT_DLP_SOCKET_TIMEOUT_SECONDS: "45",
      YT_DLP_RETRIES: "3",
      YT_DLP_FRAGMENT_RETRIES: "4",
      YT_DLP_NO_OUTPUT_TIMEOUT_MS: "0",
      YT_DLP_STALLED_TIMEOUT_MS: "9000.9"
    },
    () => {
      assert.deepEqual(getMediaDownloaderConfig(), {
        enabled: true,
        downloadDir,
        ytdlpPath: "custom-yt-dlp",
        ytdlpJsRuntime: "deno",
        ytdlpSocketTimeoutSeconds: 45,
        ytdlpRetries: 3,
        ytdlpFragmentRetries: 4,
        noOutputTimeoutMs: 0,
        stalledTimeoutMs: 9000
      });
    }
  );
});

test("media downloader rejects requests while disabled before spawning yt-dlp", () => {
  withEnv({ MEDIA_DOWNLOADER_ENABLED: undefined, YT_DLP_PATH: "must-not-run" }, () => {
    assert.deepEqual(
      createMediaDownloadJob({
        url: "https://www.youtube.com/watch?v=test",
        format: "video"
      }),
      {
        ok: false,
        status: 503,
        error: "MEDIA_DOWNLOADER_ENABLED=true is required on the server."
      }
    );
  });
});

test("media downloader rejects malformed, unsafe, unsupported, and invalid-format inputs", () => {
  withEnv({ MEDIA_DOWNLOADER_ENABLED: "true", YT_DLP_PATH: "must-not-run" }, () => {
    assertValidationError(
      { url: "not-a-url", format: "video" },
      "Invalid URL."
    );
    assertValidationError(
      { url: "ftp://www.youtube.com/video", format: "video" },
      "Only http and https URLs are supported."
    );
    assertValidationError(
      { url: "https://example.com/video", format: "video" },
      "Only YouTube, Bilibili, and b23.tv URLs are currently allowed."
    );
    assertValidationError(
      {
        url: "https://www.youtube.com/watch?v=test",
        format: "archive" as MediaDownloadRequest["format"]
      },
      "Invalid format."
    );
  });
});

function assertValidationError(input: MediaDownloadRequest, error: string) {
  assert.deepEqual(createMediaDownloadJob(input), {
    ok: false,
    status: 400,
    error
  });
}

function withEnv(values: Record<string, string | undefined>, run: () => void) {
  const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));

  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
