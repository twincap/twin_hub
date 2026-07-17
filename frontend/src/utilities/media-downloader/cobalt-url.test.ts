import assert from "node:assert/strict";
import test from "node:test";
import { buildCobaltHandoffUrl } from "./cobalt-url.ts";

test("buildCobaltHandoffUrl encodes the complete source URL in the fragment", () => {
  assert.equal(
    buildCobaltHandoffUrl("https://www.youtube.com/watch?v=abc123&list=테스트#chapter"),
    "https://cobalt.tools/#https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabc123%26list%3D%ED%85%8C%EC%8A%A4%ED%8A%B8%23chapter"
  );
});
