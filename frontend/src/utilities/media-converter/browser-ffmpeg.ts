import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import {
  buildBrowserOutputName,
  getBrowserOutputMimeType,
  type BrowserConvertProfile
} from "@/utilities/media-converter/browser-profiles";

const ffmpegCoreBaseUrl = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

let ffmpegPromise: Promise<FFmpeg> | null = null;

export type BrowserConversionResult = {
  blob: Blob;
  fileName: string;
};

export async function convertMediaInBrowser(
  file: File,
  profile: BrowserConvertProfile,
  onProgress: (progress: number) => void
): Promise<BrowserConversionResult> {
  const ffmpeg = await getLoadedFfmpeg();
  const runId = crypto.randomUUID();
  const inputExtension = getInputExtension(file.name);
  const inputPath = `input-${runId}${inputExtension}`;
  const outputPath = `output-${runId}.${profile.extension}`;
  const logs: string[] = [];
  const progressListener = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress)) {
      onProgress(Math.max(1, Math.min(99, Math.round(progress * 100))));
    }
  };
  const logListener = ({ message }: { message: string }) => {
    logs.push(message);

    if (logs.length > 20) {
      logs.shift();
    }
  };

  ffmpeg.on("progress", progressListener);
  ffmpeg.on("log", logListener);

  try {
    onProgress(1);
    await ffmpeg.writeFile(inputPath, await fetchFile(file));

    const exitCode = await ffmpeg.exec(["-hide_banner", "-i", inputPath, ...profile.ffmpegArgs, outputPath]);

    if (exitCode !== 0) {
      throw new Error(getFfmpegError(logs, exitCode));
    }

    const output = await ffmpeg.readFile(outputPath);

    if (typeof output === "string") {
      throw new Error("변환 결과가 올바른 미디어 파일이 아닙니다.");
    }

    const bytes = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer;

    onProgress(100);

    return {
      blob: new Blob([bytes], { type: getBrowserOutputMimeType(profile.extension) }),
      fileName: buildBrowserOutputName(file.name, profile.extension)
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("FFmpeg")) {
      throw error;
    }

    const detail = error instanceof Error ? error.message : "알 수 없는 오류";

    throw new Error(`브라우저 변환에 실패했습니다. ${detail}`);
  } finally {
    ffmpeg.off("progress", progressListener);
    ffmpeg.off("log", logListener);
    await safelyDeleteFile(ffmpeg, inputPath);
    await safelyDeleteFile(ffmpeg, outputPath);
  }
}

async function getLoadedFfmpeg() {
  ffmpegPromise ??= loadFfmpeg();

  try {
    return await ffmpegPromise;
  } catch (error) {
    ffmpegPromise = null;
    throw error;
  }
}

async function loadFfmpeg() {
  const ffmpeg = new FFmpeg();

  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${ffmpegCoreBaseUrl}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${ffmpegCoreBaseUrl}/ffmpeg-core.wasm`, "application/wasm")
    });
  } catch {
    ffmpeg.terminate();
    throw new Error("FFmpeg WebAssembly 엔진을 불러오지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도하세요.");
  }

  return ffmpeg;
}

function getInputExtension(fileName: string) {
  const match = fileName.match(/\.[a-z0-9]{1,10}$/i);

  return match?.[0] ?? ".bin";
}

function getFfmpegError(logs: string[], exitCode: number) {
  const detail = [...logs]
    .reverse()
    .find((line) => /error|invalid|failed|not found|unsupported|could not/i.test(line));

  return detail ? `FFmpeg 변환 실패: ${detail}` : `FFmpeg 변환이 종료 코드 ${exitCode}로 실패했습니다.`;
}

async function safelyDeleteFile(ffmpeg: FFmpeg, path: string) {
  try {
    await ffmpeg.deleteFile(path);
  } catch {
    // A failed conversion may not have produced the output file.
  }
}
