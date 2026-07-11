import assert from "node:assert/strict";
import test from "node:test";
import { getHealthPayload } from "./health.ts";

test("health payload reports the backend service and a valid timestamp", () => {
  const before = Date.now();
  const payload = getHealthPayload();
  const after = Date.now();

  assert.deepEqual(
    {
      ok: payload.ok,
      service: payload.service,
      layer: payload.layer
    },
    {
      ok: true,
      service: "twin-hub",
      layer: "backend"
    }
  );
  assert.match(payload.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.ok(Date.parse(payload.timestamp) >= before);
  assert.ok(Date.parse(payload.timestamp) <= after);
});
