import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { MediaDownloadJob, MediaDownloadRequest } from "./types";

export function resolveMediaDownloadOutputPath(job: MediaDownloadJob, format: MediaDownloadRequest["format"]) {
  for (const line of [...job.logs].reverse()) {
    const candidate = resolveExistingOutputCandidate(line, format, job.outputDir);

    if (candidate) {
      return candidate;
    }
  }

  return resolveOutputPathFromDirectory(job, format);
}

function resolveExistingOutputCandidate(line: string, format: MediaDownloadRequest["format"], outputDir: string | undefined) {
  if (!outputDir) {
    return null;
  }

  const candidate = path.resolve(line);

  if (!isPathInside(outputDir, candidate)) {
    return null;
  }

  if (isExistingFile(candidate)) {
    return candidate;
  }

  for (const extension of getExpectedOutputExtensions(format)) {
    const withExpectedExtension = replaceFileExtension(candidate, extension);

    if (isPathInside(outputDir, withExpectedExtension) && isExistingFile(withExpectedExtension)) {
      return withExpectedExtension;
    }
  }

  return null;
}

function resolveOutputPathFromDirectory(job: MediaDownloadJob, format: MediaDownloadRequest["format"]) {
  const outputDir = job.outputDir;

  if (!outputDir || !existsSync(outputDir)) {
    return null;
  }

  const expectedExtensions = getExpectedOutputExtensions(format);
  const createdAtMs = Date.parse(job.createdAt) - 5000;
  const mediaIds = getMediaIds(job.url);

  try {
    const candidates = readdirSync(outputDir, {
      withFileTypes: true
    })
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(outputDir, entry.name))
      .filter((filePath) => {
        const extension = path.extname(filePath).toLowerCase();

        if (!expectedExtensions.includes(extension) || filePath.endsWith(".part")) {
          return false;
        }

        const stats = statSync(filePath);

        if (stats.mtimeMs < createdAtMs) {
          return false;
        }

        if (mediaIds.length === 0) {
          return true;
        }

        const fileName = path.basename(filePath).toLowerCase();

        return mediaIds.some((id) => fileName.includes(id.toLowerCase()));
      })
      .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);

    return candidates[0] ?? null;
  } catch {
    return null;
  }
}

function isPathInside(directory: string, candidate: string) {
  const relative = path.relative(path.resolve(directory), path.resolve(candidate));

  return relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function isExistingFile(filePath: string) {
  try {
    return existsSync(filePath) && statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function getExpectedOutputExtensions(format: MediaDownloadRequest["format"]) {
  return format === "video" ? [".mp4"] : [`.${format}`];
}

function replaceFileExtension(filePath: string, extension: string) {
  const parsed = path.parse(filePath);

  return path.join(parsed.dir, `${parsed.name}${extension}`);
}

function getMediaIds(url: string) {
  try {
    const parsed = new URL(url);
    const ids: string[] = [];
    const bilibiliMatch = parsed.pathname.match(/\/video\/([^/?#]+)/i);

    if (bilibiliMatch?.[1]) {
      ids.push(bilibiliMatch[1]);
    }

    const youtubeId = parsed.searchParams.get("v");

    if (youtubeId) {
      ids.push(youtubeId);
    }

    if (parsed.hostname === "youtu.be") {
      const shortId = parsed.pathname.split("/").filter(Boolean)[0];

      if (shortId) {
        ids.push(shortId);
      }
    }

    return ids;
  } catch {
    return [];
  }
}
