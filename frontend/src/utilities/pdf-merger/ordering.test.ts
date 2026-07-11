import assert from "node:assert/strict";
import test from "node:test";
import { moveArrayItem, moveItemToTarget } from "./ordering.ts";

const pages = [{ id: "A" }, { id: "B" }, { id: "C" }];

test("PDF pages move to a hovered target in both directions", () => {
  assert.deepEqual(moveItemToTarget(pages, "A", "B"), [{ id: "B" }, { id: "A" }, { id: "C" }]);
  assert.deepEqual(moveItemToTarget(pages, "C", "A"), [{ id: "C" }, { id: "A" }, { id: "B" }]);
});

test("PDF page moves ignore invalid indexes", () => {
  assert.equal(moveArrayItem(pages, -1, 1), pages);
  assert.equal(moveArrayItem(pages, 1, 4), pages);
});
