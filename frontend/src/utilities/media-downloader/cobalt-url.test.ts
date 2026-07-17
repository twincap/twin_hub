import assert from "node:assert/strict";
import test from "node:test";
import { buildCobaltHandoffUrl, parseMediaSourceUrls } from "./cobalt-url.ts";

test("buildCobaltHandoffUrl encodes the complete source URL in the fragment", () => {
  assert.equal(
    buildCobaltHandoffUrl("https://www.youtube.com/watch?v=abc123&list=테스트#chapter"),
    "https://cobalt.tools/#https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabc123%26list%3D%ED%85%8C%EC%8A%A4%ED%8A%B8%23chapter"
  );
});

test("parseMediaSourceUrls trims lines and accepts HTTP sources", () => {
  assert.deepEqual(
    parseMediaSourceUrls("  https://youtu.be/abc123  \n\nhttp://example.com/video.mp4"),
    ["https://youtu.be/abc123", "http://example.com/video.mp4"]
  );
});

test("parseMediaSourceUrls rejects empty, malformed, and unsafe schemes", () => {
  assert.throws(() => parseMediaSourceUrls("  "), /URL을 입력/);
  assert.throws(() => parseMediaSourceUrls("not-a-url"), /올바른 URL/);
  assert.throws(() => parseMediaSourceUrls("javascript:alert(1)"), /HTTP 또는 HTTPS/);
});
