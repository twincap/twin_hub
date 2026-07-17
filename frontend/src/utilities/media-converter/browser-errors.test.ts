import assert from "node:assert/strict";
import test from "node:test";
import {
  getFfmpegLogDetail,
  getUnknownErrorMessage,
  isFatalFfmpegError
} from "./browser-errors.ts";

test("worker string rejections keep their actual message", () => {
  assert.equal(getUnknownErrorMessage("RuntimeError: memory access out of bounds"), "RuntimeError: memory access out of bounds");
  assert.equal(getUnknownErrorMessage({ message: "worker failed" }), "worker failed");
  assert.equal(getUnknownErrorMessage({ reason: "missing" }), "알 수 없는 오류");
});

test("fatal wasm and worker failures are detected for engine recovery", () => {
  assert.equal(isFatalFfmpegError("RuntimeError: memory access out of bounds"), true);
  assert.equal(isFatalFfmpegError(new Error("worker terminated")), true);
  assert.equal(isFatalFfmpegError("Invalid data found when processing input"), false);
});

test("ffmpeg log detail selects the latest actionable line", () => {
  assert.equal(
    getFfmpegLogDetail(["Input #0", "Invalid data found", "Conversion failed!"]),
    "Invalid data found"
  );
  assert.equal(getFfmpegLogDetail(["Input #0", "Duration: 00:00:01"]), undefined);
});
