import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { getMediaConvertProfile, mediaConvertProfiles } from "./profiles.ts";
import { createMediaConvertJob, getMediaConverterConfig } from "./service.ts";

test("media converter profiles have unique ids and expose known profiles", () => {
  assert.ok(mediaConvertProfiles.length > 0);
  assert.equal(new Set(mediaConvertProfiles.map((profile) => profile.id)).size, mediaConvertProfiles.length);

  for (const profile of mediaConvertProfiles) {
    assert.ok(profile.id);
    assert.ok(profile.label);
    assert.ok(profile.extension);
    assert.ok(profile.ffmpegArgs.length > 0);
  }

  assert.deepEqual(
    getMediaConvertProfile("mp3"),
    mediaConvertProfiles.find((profile) => profile.id === "mp3")
  );
  assert.equal(getMediaConvertProfile("missing-profile"), undefined);
});

test("media converter config reads server environment values", () => {
  const convertDir = path.join(os.tmpdir(), "twin-hub-converter-config");

  withEnv(
    {
      MEDIA_CONVERTER_ENABLED: "true",
      MEDIA_CONVERT_DIR: convertDir,
      FFMPEG_PATH: "custom-ffmpeg",
      MEDIA_CONVERT_MAX_MB: "256"
    },
    () => {
      assert.deepEqual(getMediaConverterConfig(), {
        enabled: true,
        convertDir,
        ffmpegPath: "custom-ffmpeg",
        maxUploadMb: 256
      });
    }
  );
});

test("media converter rejects disabled and unsupported requests before spawning ffmpeg", () => {
  withEnv({ MEDIA_CONVERTER_ENABLED: undefined, FFMPEG_PATH: "must-not-run" }, () => {
    assert.deepEqual(
      createMediaConvertJob({
        inputPath: "missing-input.mp4",
        originalName: "input.mp4",
        profileId: "mp3"
      }),
      {
        ok: false,
        status: 503,
        error: "MEDIA_CONVERTER_ENABLED=true is required on the server."
      }
    );
  });

  const tempDir = mkdtempSync(path.join(os.tmpdir(), "twin-hub-converter-test-"));
  const inputPath = path.join(tempDir, "input.bin");
  writeFileSync(inputPath, "not media, validation stops before conversion");

  try {
    withEnv({ MEDIA_CONVERTER_ENABLED: "true", FFMPEG_PATH: "must-not-run" }, () => {
      assert.deepEqual(
        createMediaConvertJob({
          inputPath,
          originalName: "input.bin",
          profileId: "missing-profile"
        }),
        {
          ok: false,
          status: 400,
          error: "Unsupported output profile."
        }
      );
    });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

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
