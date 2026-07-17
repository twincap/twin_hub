import assert from "node:assert/strict";
import test from "node:test";
import {
  browserConvertProfiles,
  buildBrowserOutputName,
  getBrowserOutputMimeType
} from "./browser-profiles.ts";

test("browser converter profiles expose unique ids and commands", () => {
  const ids = browserConvertProfiles.map((profile) => profile.id);

  assert.equal(new Set(ids).size, ids.length);
  assert.ok(browserConvertProfiles.every((profile) => profile.ffmpegArgs.length > 0));
  assert.ok(browserConvertProfiles.some((profile) => profile.kind === "audio"));
  assert.ok(browserConvertProfiles.some((profile) => profile.kind === "video"));
  assert.ok(browserConvertProfiles.some((profile) => profile.kind === "container"));
});

test("browser profiles avoid unstable wasm encoders and unsafe remux presets", () => {
  const opusProfiles = browserConvertProfiles.filter((profile) => profile.audioCodec === "Opus");
  const allArguments = browserConvertProfiles.flatMap((profile) => profile.ffmpegArgs);

  assert.ok(opusProfiles.length > 0);
  assert.ok(opusProfiles.every((profile) => profile.ffmpegArgs.includes("opus")));
  assert.ok(opusProfiles.every((profile) => profile.ffmpegArgs.includes("-strict")));
  assert.ok(!allArguments.includes("libopus"));
  assert.ok(!allArguments.includes("libx265"));
  assert.ok(!allArguments.includes("libvpx-vp9"));
  assert.ok(!allArguments.includes("prores_ks"));
  assert.ok(!browserConvertProfiles.some((profile) => profile.id === "remux-webm"));
  assert.ok(!browserConvertProfiles.some((profile) => profile.id === "remux-ogg-audio"));
});

test("browser output names preserve safe unicode and replace filesystem separators", () => {
  assert.equal(buildBrowserOutputName("여름/여행.mov", "mp4"), "여름-여행.mp4");
  assert.equal(buildBrowserOutputName(".hidden", "wav"), ".hidden.wav");
  assert.equal(buildBrowserOutputName("CON.mp3", "opus"), "_CON.opus");
  assert.equal(buildBrowserOutputName("safe\u202Ecod.exe.mp3", "wav"), "safecod.exe.wav");
  assert.ok(new TextEncoder().encode(buildBrowserOutputName("가".repeat(100), "flac").split(".")[0]).byteLength <= 120);
});

test("browser output MIME types use a safe fallback", () => {
  assert.equal(getBrowserOutputMimeType("mp3"), "audio/mpeg");
  assert.equal(getBrowserOutputMimeType("mka"), "audio/matroska");
  assert.equal(getBrowserOutputMimeType("mkv"), "video/matroska");
  assert.equal(getBrowserOutputMimeType("unknown"), "application/octet-stream");
});
