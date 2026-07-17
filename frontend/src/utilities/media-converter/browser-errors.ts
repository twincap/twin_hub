const fatalFfmpegPatterns = [
  /abort/i,
  /memory access out of bounds/i,
  /out of memory/i,
  /runtimeerror/i,
  /worker/i,
  /not loaded/i,
  /terminated/i
];

export function getUnknownErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (isMessageObject(error) && error.message.trim()) {
    return error.message.trim();
  }

  const stringified = String(error ?? "").trim();

  return stringified && stringified !== "[object Object]" ? stringified : "알 수 없는 오류";
}

export function isFatalFfmpegError(error: unknown) {
  const message = getUnknownErrorMessage(error);

  return fatalFfmpegPatterns.some((pattern) => pattern.test(message));
}

export function getFfmpegLogDetail(logs: string[]) {
  const matches = [...logs]
    .reverse()
    .filter((line) => /abort|error|failed|invalid|not found|unsupported|could not|memory/i.test(line));

  return matches.find((line) => !/^conversion failed!?$/i.test(line.trim())) ?? matches[0];
}

function isMessageObject(value: unknown): value is { message: string } {
  return typeof value === "object" && value !== null && "message" in value && typeof value.message === "string";
}
