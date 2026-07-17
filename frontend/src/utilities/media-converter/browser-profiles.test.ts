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

test("browser output names preserve safe unicode and replace filesystem separators", () => {
  assert.equal(buildBrowserOutputName("여름/여행.mov", "mp4"), "여름-여행.mp4");
  assert.equal(buildBrowserOutputName(".hidden", "wav"), ".hidden.wav");
});

test("browser output MIME types use a safe fallback", () => {
  assert.equal(getBrowserOutputMimeType("mp3"), "audio/mpeg");
  assert.equal(getBrowserOutputMimeType("unknown"), "application/octet-stream");
});
