import assert from "node:assert/strict";
import test from "node:test";
import { decodeBase64, encodeBase64 } from "./codec.ts";

test("Base64 converts empty and ASCII text", () => {
  assert.equal(encodeBase64(""), "");
  assert.equal(decodeBase64(""), "");
  assert.equal(encodeBase64("Hello, world!"), "SGVsbG8sIHdvcmxkIQ==");
  assert.equal(decodeBase64("SGVsbG8sIHdvcmxkIQ=="), "Hello, world!");
});

test("Base64 preserves Korean, emoji, whitespace, and a leading BOM", () => {
  const samples = ["안녕하세요", "안녕하세요 👋 café", " \n\t", "\uFEFFtext"];

  for (const sample of samples) {
    assert.equal(decodeBase64(encodeBase64(sample)), sample);
  }

  assert.equal(encodeBase64("안녕하세요"), "7JWI64WV7ZWY7IS47JqU");
});

test("Base64 decoder accepts wrapped, unpadded, and URL-safe input", () => {
  assert.equal(decodeBase64("SGVs\n bG8=\t"), "Hello");
  assert.equal(decodeBase64("SGVsbG8"), "Hello");
  assert.equal(decodeBase64("8J-YgA"), "😀");
});

test("Base64 handles large Unicode input without exceeding the call stack", () => {
  const value = "가나다😀".repeat(25_000);

  assert.equal(decodeBase64(encodeBase64(value)), value);
});

test("Base64 decoder rejects malformed input and invalid UTF-8", () => {
  for (const value of ["A", "SGVsbG8*", "Z=g=", "Zg=", "Zg===", "Zh==", "AA+_"]) {
    assert.throws(() => decodeBase64(value), /올바른 Base64 형식/);
  }

  assert.throws(() => decodeBase64("/w=="), /올바른 UTF-8 텍스트/);
});
