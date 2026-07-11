import assert from "node:assert/strict";
import test from "node:test";
import { isSameOriginMutation } from "./request-security.ts";

test("mutation requests allow same-origin and non-browser clients", () => {
  assert.equal(isSameOriginMutation(new Request("http://localhost:3000/api/test")), true);
  assert.equal(
    isSameOriginMutation(
      new Request("http://localhost:3000/api/test", {
        headers: {
          origin: "http://localhost:3000"
        }
      })
    ),
    true
  );
});

test("mutation requests reject cross-origin browser calls", () => {
  assert.equal(
    isSameOriginMutation(
      new Request("http://localhost:3000/api/test", {
        headers: {
          origin: "https://example.com"
        }
      })
    ),
    false
  );
});
