import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import {
  getFfmpegLogDetail,
  getUnknownErrorMessage,
  isFatalFfmpegError
} from "@/utilities/media-converter/browser-errors";
import {
  buildBrowserOutputName,
  getBrowserOutputMimeType,
  type BrowserConvertProfile
} from "@/utilities/media-converter/browser-profiles";

const ffmpegCoreBaseUrls = [
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd",
  "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd"
];
const ffmpegCoreAssetHashes = {
  "ffmpeg-core.js": "b266ab5b952555881dd6310663986994a182acb2b7ff25cf10a25f7a37ac2b21",
  "ffmpeg-core.wasm": "9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7"
} as const;
const engineLoadTimeoutMs = 90_000;
const fileIoTimeoutMs = 120_000;
const cleanupTimeoutMs = 3_000;
const executionTimeoutMs: Record<BrowserConvertProfile["kind"], number> = {
  audio: 5 * 60_000,
  video: 15 * 60_000,
  container: 3 * 60_000
};

let ffmpegPromise: Promise<FFmpeg> | null = null;
let ffmpegInstance: FFmpeg | null = null;
let engineLoadController: AbortController | null = null;
let ffmpegGeneration = 0;
let conversionQueue: Promise<void> = Promise.resolve();

export type BrowserConversionResult = {
  blob: Blob;
  fileName: string;
};

export function convertMediaInBrowser(
  file: File,
  profile: BrowserConvertProfile,
  onProgress: (progress: number) => void
): Promise<BrowserConversionResult> {
  const task = conversionQueue.then(() => runBrowserConversion(file, profile, onProgress));

  conversionQueue = task.then(
    () => undefined,
    () => undefined
  );

  return task;
}

export function disposeBrowserFfmpeg() {
  conversionQueue = Promise.resolve();
  resetBrowserFfmpeg();
}

async function runBrowserConversion(
  file: File,
  profile: BrowserConvertProfile,
  onProgress: (progress: number) => void
): Promise<BrowserConversionResult> {
  const runId = crypto.randomUUID();
  const inputExtension = getInputExtension(file.name);
  const inputPath = `input-${runId}${inputExtension}`;
  const outputPath = `output-${runId}.${profile.extension}`;
  const logs: string[] = [];
  let ffmpeg: FFmpeg | null = null;
  let listenersAttached = false;
  const progressListener = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress)) {
      onProgress(Math.max(1, Math.min(99, Math.round(progress * 100))));
    }
  };
  const logListener = ({ message }: { message: string }) => {
    logs.push(message);

    if (logs.length > 40) {
      logs.shift();
    }
  };

  try {
    onProgress(1);
    ffmpeg = await getLoadedFfmpeg();
    ffmpeg.on("progress", progressListener);
    ffmpeg.on("log", logListener);
    listenersAttached = true;

    const inputBytes = await withTimeout(fetchFile(file), fileIoTimeoutMs, "입력 파일 읽기");
    await withTimeout(
      ffmpeg.writeFile(inputPath, inputBytes),
      fileIoTimeoutMs,
      "입력 파일 준비",
      () => resetBrowserFfmpeg(ffmpeg)
    );

    const commandTimeout = executionTimeoutMs[profile.kind];
    const exitCode = await withTimeout(
      ffmpeg.exec(["-hide_banner", "-i", inputPath, ...profile.ffmpegArgs, outputPath], commandTimeout),
      commandTimeout + 5_000,
      "FFmpeg 변환",
      () => resetBrowserFfmpeg(ffmpeg)
    );

    if (exitCode !== 0) {
      throw new FfmpegCommandError(getFfmpegError(logs, exitCode));
    }

    const output = await withTimeout(
      ffmpeg.readFile(outputPath),
      fileIoTimeoutMs,
      "변환 결과 읽기",
      () => resetBrowserFfmpeg(ffmpeg)
    );

    if (typeof output === "string" || output.byteLength === 0) {
      throw new FfmpegCommandError("FFmpeg가 유효한 변환 결과를 만들지 못했습니다.");
    }

    const bytes = getExactArrayBuffer(output);

    onProgress(100);

    return {
      blob: new Blob([bytes], { type: getBrowserOutputMimeType(profile.extension) }),
      fileName: buildBrowserOutputName(file.name, profile.extension)
    };
  } catch (error) {
    const logDetail = getFfmpegLogDetail(logs);

    if (error instanceof FfmpegCommandError) {
      if (logDetail && isFatalFfmpegError(logDetail)) {
        resetBrowserFfmpeg(ffmpeg);
      }
      throw error;
    }

    const detail = getUnknownErrorMessage(error);

    if (isFatalFfmpegError(error) || (logDetail && isFatalFfmpegError(logDetail))) {
      resetBrowserFfmpeg(ffmpeg);
    }

    throw new Error(`브라우저 변환에 실패했습니다. ${getUserFacingDetail(detail, logDetail)}`);
  } finally {
    if (ffmpeg && listenersAttached) {
      ffmpeg.off("progress", progressListener);
      ffmpeg.off("log", logListener);
    }

    if (ffmpeg?.loaded && ffmpegInstance === ffmpeg) {
      await safelyDeleteFile(ffmpeg, inputPath);
      await safelyDeleteFile(ffmpeg, outputPath);
    }
  }
}

async function getLoadedFfmpeg() {
  const pending = ffmpegPromise ?? (ffmpegPromise = loadFfmpeg());

  try {
    return await pending;
  } catch (error) {
    if (ffmpegPromise === pending) {
      ffmpegPromise = null;
    }
    throw error;
  }
}

async function loadFfmpeg() {
  const generation = ffmpegGeneration;
  const failures: string[] = [];

  for (const baseUrl of ffmpegCoreBaseUrls) {
    if (generation !== ffmpegGeneration) {
      throw new Error("FFmpeg 엔진 불러오기가 취소되었습니다.");
    }

    const ffmpeg = new FFmpeg();
    const loadController = new AbortController();
    const blobUrls: string[] = [];

    ffmpegInstance = ffmpeg;
    engineLoadController = loadController;

    try {
      const coreURL = await fetchCoreAsset(
        `${baseUrl}/ffmpeg-core.js`,
        "text/javascript",
        10_000,
        ffmpegCoreAssetHashes["ffmpeg-core.js"],
        loadController
      );
      blobUrls.push(coreURL);

      assertCurrentLoad(generation, loadController);

      const wasmURL = await fetchCoreAsset(
        `${baseUrl}/ffmpeg-core.wasm`,
        "application/wasm",
        10_000_000,
        ffmpegCoreAssetHashes["ffmpeg-core.wasm"],
        loadController
      );
      blobUrls.push(wasmURL);

      assertCurrentLoad(generation, loadController);

      await withTimeout(
        ffmpeg.load({ coreURL, wasmURL }),
        engineLoadTimeoutMs,
        "FFmpeg 엔진 초기화",
        () => ffmpeg.terminate()
      );

      if (generation !== ffmpegGeneration) {
        ffmpeg.terminate();
        throw new Error("FFmpeg 엔진 불러오기가 취소되었습니다.");
      }

      return ffmpeg;
    } catch (error) {
      failures.push(`${new URL(baseUrl).host}: ${getUnknownErrorMessage(error)}`);
      ffmpeg.terminate();

      if (ffmpegInstance === ffmpeg) {
        ffmpegInstance = null;
      }
    } finally {
      if (engineLoadController === loadController) {
        engineLoadController = null;
      }
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
    }
  }

  throw new Error(`FFmpeg WebAssembly 엔진을 불러오지 못했습니다. ${failures.join(" / ")}`);
}

async function fetchCoreAsset(
  url: string,
  mimeType: string,
  minimumBytes: number,
  expectedSha256: string,
  controller: AbortController
) {
  const timer = window.setTimeout(() => controller.abort(), engineLoadTimeoutMs);

  try {
    const response = await fetch(url, { cache: "force-cache", signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const bytes = await response.arrayBuffer();

    if (bytes.byteLength < minimumBytes) {
      throw new Error(`응답 크기가 올바르지 않습니다 (${bytes.byteLength} bytes)`);
    }

    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const actualSha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");

    if (actualSha256 !== expectedSha256) {
      throw new Error("FFmpeg 엔진 파일의 무결성 검증에 실패했습니다.");
    }

    if (controller.signal.aborted) {
      throw new Error("FFmpeg 엔진 다운로드가 취소되었습니다.");
    }

    return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  } finally {
    window.clearTimeout(timer);
  }
}

function resetBrowserFfmpeg(expected?: FFmpeg | null) {
  if (expected !== undefined && ffmpegInstance !== expected) {
    return;
  }

  engineLoadController?.abort();
  engineLoadController = null;
  ffmpegGeneration += 1;

  try {
    ffmpegInstance?.terminate();
  } catch {
    // The worker may already have terminated after a fatal WebAssembly error.
  }

  ffmpegInstance = null;
  ffmpegPromise = null;
}

function assertCurrentLoad(generation: number, controller: AbortController) {
  if (generation !== ffmpegGeneration || controller.signal.aborted) {
    throw new Error("FFmpeg 엔진 불러오기가 취소되었습니다.");
  }
}

function getInputExtension(fileName: string) {
  const match = fileName.match(/\.[a-z0-9]{1,10}$/i);

  return match?.[0] ?? ".bin";
}

function getFfmpegError(logs: string[], exitCode: number) {
  const detail = getFfmpegLogDetail(logs);

  return detail ? `FFmpeg 변환 실패: ${detail}` : `FFmpeg 변환이 종료 코드 ${exitCode}로 실패했습니다.`;
}

function getUserFacingDetail(detail: string, logDetail?: string) {
  const bestDetail = detail === "알 수 없는 오류" ? logDetail ?? detail : detail;

  if (/memory access out of bounds|out of memory|runtimeerror|abort/i.test(bestDetail)) {
    return `FFmpeg 엔진의 메모리 작업이 중단되었습니다. 더 작은 파일이나 다른 프로필로 다시 시도하세요. (${bestDetail})`;
  }

  return bestDetail;
}

function getExactArrayBuffer(output: Uint8Array) {
  if (output.buffer instanceof ArrayBuffer && output.byteOffset === 0 && output.byteLength === output.buffer.byteLength) {
    return output.buffer;
  }

  return output.slice().buffer as ArrayBuffer;
}

async function safelyDeleteFile(ffmpeg: FFmpeg, path: string) {
  try {
    await withTimeout(
      ffmpeg.deleteFile(path),
      cleanupTimeoutMs,
      "임시 파일 정리",
      () => resetBrowserFfmpeg(ffmpeg)
    );
  } catch {
    // A failed conversion may not have produced the file, or the worker may have stopped.
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
  onTimeout?: () => void
): Promise<T> {
  let timer: number | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = window.setTimeout(() => {
          reject(new Error(`${label} 시간이 초과되었습니다.`));

          try {
            onTimeout?.();
          } catch {
            // The timed-out operation is already rejected; recovery is best-effort.
          }
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer !== undefined) {
      window.clearTimeout(timer);
    }
  }
}

class FfmpegCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FfmpegCommandError";
  }
}
