"use client";

import { Download, FilePlus2, FolderOpen, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { JobProgress } from "@/components/job-progress";
import { convertMediaInBrowser } from "@/utilities/media-converter/browser-ffmpeg";
import {
  BROWSER_CONVERTER_MAX_MB,
  browserConvertProfiles
} from "@/utilities/media-converter/browser-profiles";

type ConvertProfile = {
  id: string;
  label: string;
  kind: "audio" | "video" | "container";
  extension: string;
  container: string;
  audioCodec?: string;
  videoCodec?: string;
  notes?: string;
  ffmpegArgs?: string[];
};

type ProcessingMode = "browser" | "server";

type ConvertJob = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  profileId: string;
  originalName: string;
  fileName?: string;
  progress: number;
  error?: string;
};

type QueueItem = {
  localId: string;
  fileName: string;
  mode: ProcessingMode;
  status: "uploading" | "queued" | "running" | "completed" | "failed";
  job?: ConvertJob;
  progress?: number;
  downloadUrl?: string;
  downloadName?: string;
  error?: string;
};

type InfoResponse = {
  enabled: boolean;
  ffmpegDetected?: boolean;
  profiles: ConvertProfile[];
  convertDir: string;
  maxUploadMb: number;
  canPickLocalFolder?: boolean;
  storesOnServer?: boolean;
  error?: string;
};

type StartResponse = {
  job?: ConvertJob;
  error?: string;
};

type StatusResponse = {
  job?: ConvertJob;
  error?: string;
};

type FolderPickerResponse = {
  path?: string;
  cancelled?: boolean;
  error?: string;
};

const activeStatuses = new Set(["queued", "running"]);
const profileGroups = [
  { kind: "audio" as const, label: "오디오" },
  { kind: "video" as const, label: "비디오" },
  { kind: "container" as const, label: "컨테이너" }
];

export default function MediaConverterUtility() {
  const [profiles, setProfiles] = useState<ConvertProfile[]>(browserConvertProfiles);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>("browser");
  const [maxUploadMb, setMaxUploadMb] = useState(BROWSER_CONVERTER_MAX_MB);
  const [profileId, setProfileId] = useState(browserConvertProfiles[0]?.id ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [outputDir, setOutputDir] = useState("");
  const [canPickLocalFolder, setCanPickLocalFolder] = useState(false);
  const [pickingOutputDir, setPickingOutputDir] = useState(false);
  const [loadedInfo, setLoadedInfo] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const browserDownloadUrlsRef = useRef(new Set<string>());
  const selectedProfile = profiles.find((profile) => profile.id === profileId);

  useEffect(() => {
    function activateBrowserMode() {
      setProcessingMode("browser");
      setProfiles(browserConvertProfiles);
      setMaxUploadMb(BROWSER_CONVERTER_MAX_MB);
      setCanPickLocalFolder(false);
      setOutputDir("");
      setProfileId(browserConvertProfiles[0]?.id ?? "");
    }

    async function loadInfo() {
      const response = await fetch("/api/media-converter");
      const payload = (await response.json()) as InfoResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "변환 설정을 불러오지 못했습니다.");
      }

      if (payload.enabled && payload.ffmpegDetected !== false && payload.profiles?.length) {
        setProcessingMode("server");
        setProfiles(payload.profiles);
        setMaxUploadMb(payload.maxUploadMb ?? 512);
        setCanPickLocalFolder(Boolean(payload.canPickLocalFolder));
        setOutputDir(payload.canPickLocalFolder ? payload.convertDir ?? "" : "");
        setProfileId(payload.profiles[0]?.id ?? "");
        return;
      }

      activateBrowserMode();
    }

    loadInfo()
      .catch(() => {
        activateBrowserMode();
      })
      .finally(() => {
        setLoadedInfo(true);
      });
  }, []);

  useEffect(() => {
    const urls = browserDownloadUrlsRef.current;

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  useEffect(() => {
    if (processingMode !== "server") {
      return;
    }

    const activeItems = queue.filter((item) => item.mode === "server" && item.job && activeStatuses.has(item.job.status));

    if (activeItems.length === 0) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const updates = await Promise.all(
        activeItems.map(async (item) => {
          if (!item.job) {
            return null;
          }

          try {
            const response = await fetch(`/api/media-converter?jobId=${item.job.id}`);
            const payload = (await response.json()) as StatusResponse;

            return {
              localId: item.localId,
              job: payload.job,
              error: response.ok && payload.job ? undefined : payload.error ?? "작업 상태를 확인하지 못했습니다.",
              terminal: response.status === 404 || (response.ok && !payload.job)
            };
          } catch (pollError) {
            return {
              localId: item.localId,
              error: pollError instanceof Error ? pollError.message : "작업 상태를 확인하지 못했습니다.",
              terminal: false
            };
          }
        })
      );

      if (cancelled) {
        return;
      }

      setQueue((current) =>
        current.map((item) => {
          const update = updates.find((next) => next?.localId === item.localId);

          if (!update) {
            return item;
          }

          if (update.terminal) {
            return {
              ...item,
              status: "failed",
              job: undefined,
              error: update.error
            };
          }

          return {
            ...item,
            job: update.job ?? item.job,
            error: update.error
          };
        })
      );
    }, 1000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [processingMode, queue]);

  async function handleOutputDirPick() {
    if (!canPickLocalFolder) {
      setError("폴더 선택은 Windows 로컬 실행에서만 사용할 수 있습니다. 완료 후 다시 받기로 저장하세요.");
      return;
    }

    setPickingOutputDir(true);
    setError("");

    try {
      const response = await fetch("/api/folder-picker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          initialDir: outputDir
        })
      });
      const payload = (await response.json()) as FolderPickerResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "폴더를 선택하지 못했습니다.");
      }

      if (payload.path) {
        setOutputDir(payload.path);
      }
    } catch (pickError) {
      setError(pickError instanceof Error ? pickError.message : "폴더를 선택하지 못했습니다.");
    } finally {
      setPickingOutputDir(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (files.length === 0) {
      setError("변환할 파일을 선택하세요.");
      return;
    }

    if (!profileId) {
      setError("변환 프로필을 선택하세요.");
      return;
    }

    const oversizedFile = files.find((file) => file.size > maxUploadMb * 1024 * 1024);

    if (oversizedFile) {
      setError(`${oversizedFile.name} 파일이 ${maxUploadMb}MB 제한을 넘습니다.`);
      return;
    }

    setSubmitting(true);
    setError("");

    const items = files.map((file) => ({
      localId: crypto.randomUUID(),
      fileName: file.name,
      mode: processingMode,
      status: processingMode === "server" ? ("uploading" as const) : ("queued" as const),
      progress: 0
    }));

    setQueue((current) => [...items, ...current]);

    try {
      if (processingMode === "server") {
        await Promise.all(items.map((item, index) => startServerConversion(item.localId, files[index])));
      } else {
        for (const [index, item] of items.entries()) {
          await startBrowserConversion(item.localId, files[index]);
        }
      }

      setFiles([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function startServerConversion(localId: string, file: File) {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("profileId", profileId);

    if (canPickLocalFolder && outputDir) {
      formData.set("outputDir", outputDir);
    }

    try {
      const response = await fetch("/api/media-converter", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as StartResponse;

      setQueue((current) =>
        current.map((item) =>
          item.localId === localId
            ? {
                ...item,
                status: response.ok && payload.job ? "queued" : "failed",
                job: response.ok ? payload.job : undefined,
                error: response.ok && payload.job ? undefined : payload.error ?? "변환을 시작하지 못했습니다."
              }
            : item
        )
      );
    } catch (requestError) {
      setQueue((current) =>
        current.map((item) =>
          item.localId === localId
            ? {
                ...item,
                status: "failed",
                job: undefined,
                error: requestError instanceof Error ? requestError.message : "요청 실패"
              }
            : item
        )
      );
    }
  }

  async function startBrowserConversion(localId: string, file: File) {
    const profile = browserConvertProfiles.find((item) => item.id === profileId);

    if (!profile) {
      updateBrowserQueueItem(localId, {
        status: "failed",
        error: "이 브라우저에서 지원하지 않는 변환 프로필입니다."
      });
      return;
    }

    updateBrowserQueueItem(localId, {
      status: "running",
      progress: 1,
      error: undefined
    });

    try {
      const result = await convertMediaInBrowser(file, profile, (progress) => {
        updateBrowserQueueItem(localId, {
          status: "running",
          progress
        });
      });
      const downloadUrl = URL.createObjectURL(result.blob);

      browserDownloadUrlsRef.current.add(downloadUrl);
      updateBrowserQueueItem(localId, {
        status: "completed",
        progress: 100,
        downloadUrl,
        downloadName: result.fileName,
        error: undefined
      });
    } catch (conversionError) {
      updateBrowserQueueItem(localId, {
        status: "failed",
        error: conversionError instanceof Error ? conversionError.message : "브라우저 변환에 실패했습니다."
      });
    }
  }

  function updateBrowserQueueItem(localId: string, update: Partial<QueueItem>) {
    setQueue((current) => current.map((item) => (item.localId === localId ? { ...item, ...update } : item)));
  }

  return (
    <div className="utility-surface">
      <form aria-busy={submitting} className="download-form" onSubmit={handleSubmit}>
        <label className="field form-span">
          <span>파일</span>
          <input
            ref={fileInputRef}
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            required
            type="file"
            multiple
            accept="audio/*,video/*,.3gp,.aac,.aiff,.amr,.aptx,.aptxhd,.avi,.caf,.dts,.eac3,.flac,.flv,.h264,.h265,.m4a,.mka,.mkv,.mov,.mp1,.mp2,.mp3,.mp4,.mpg,.mxf,.ogg,.ogv,.opus,.sbc,.spx,.ts,.tta,.wav,.webm,.wma,.wmv,.wv"
          />
        </label>

        <label className="field form-span">
          <span>변환 프로필</span>
          <select value={profileId} onChange={(event) => setProfileId(event.target.value)} required>
            {profileGroups.map((group) => (
              <optgroup key={group.kind} label={group.label}>
                {profiles
                  .filter((profile) => profile.kind === group.kind)
                  .map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.label} · .{profile.extension}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>

        {selectedProfile ? (
          <div className="profile-summary form-span">
            <strong>{selectedProfile.label}</strong>
            <span>
              {selectedProfile.container}
              {selectedProfile.videoCodec ? ` · ${selectedProfile.videoCodec}` : ""}
              {selectedProfile.audioCodec ? ` · ${selectedProfile.audioCodec}` : ""}
            </span>
          </div>
        ) : null}

        {loadedInfo && processingMode === "server" && canPickLocalFolder ? (
          <div className="field form-span">
            <label htmlFor="media-convert-output-dir">저장 경로</label>
            <div className="path-picker">
              <input
                id="media-convert-output-dir"
                value={outputDir}
                onChange={(event) => setOutputDir(event.target.value)}
                placeholder="예: C:/Users/twincap/Downloads"
                type="text"
              />
              <button className="button" disabled={pickingOutputDir} onClick={handleOutputDirPick} type="button">
                {pickingOutputDir ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <FolderOpen size={16} aria-hidden="true" />}
                폴더 선택
              </button>
            </div>
          </div>
        ) : null}

        {loadedInfo && processingMode === "server" && !canPickLocalFolder ? (
          <div className="notice-box form-span" role="status">
            배포 환경에서는 로컬 폴더를 직접 선택할 수 없습니다. 변환이 끝난 뒤 다시 받기 버튼으로 파일을 저장하세요.
          </div>
        ) : null}

        {loadedInfo && processingMode === "browser" ? (
          <div className="notice-box form-span" role="status">
            서버 없이 브라우저에서 직접 변환합니다. 파일은 외부로 업로드되지 않으며, 첫 실행 때 약 31MB의
            FFmpeg 엔진을 불러옵니다. 여러 파일은 메모리 보호를 위해 차례대로 처리합니다.
          </div>
        ) : null}

        <button
          className="button primary form-span"
          disabled={submitting || !loadedInfo || !profileId || files.length === 0}
          type="submit"
        >
          {submitting ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <FilePlus2 size={16} aria-hidden="true" />}
          대기열에 등록
        </button>

        <span className="runtime-pill form-span">
          {processingMode === "browser" ? "브라우저 처리" : "서버 처리"} · 파일당 최대 {maxUploadMb}MB
        </span>
      </form>

      {error ? <div className="error-box" role="alert">{error}</div> : null}

      <section className="job-panel" aria-label="변환 대기열" aria-live="polite">
        <div className="job-head">
          <div>
            <RefreshCw size={16} aria-hidden="true" />
            <strong>변환 대기열</strong>
          </div>
          <span className="runtime-pill">{queue.length}개</span>
        </div>

        <div className="queue-list">
          {queue.length === 0 ? <div className="empty-state">등록된 파일이 없습니다.</div> : null}
          {queue.map((item) => (
            <QueueRow item={item} key={item.localId} />
          ))}
        </div>
      </section>
    </div>
  );
}

function QueueRow({ item }: { item: QueueItem }) {
  const job = item.job;
  const progress = job?.progress ?? item.progress ?? 0;
  const status = job?.status ?? item.status;
  const downloadUrl = item.downloadUrl ?? (job?.status === "completed" ? `/api/media-converter/file?jobId=${job.id}` : "");
  const downloadName = item.downloadName ?? job?.fileName;

  return (
    <div aria-busy={status === "uploading" || activeStatuses.has(status)} className="queue-item">
      <div className="queue-title">
        <strong>{downloadName ?? item.fileName}</strong>
        <span className="runtime-pill">{translateStatus(status)}</span>
      </div>
      <JobProgress progress={progress} runningLabel="작업 중" status={status} />
      {item.error || job?.error ? <div className="error-box" role="alert">{item.error ?? job?.error}</div> : null}
      {downloadUrl ? (
        <a className="button primary" download={downloadName} href={downloadUrl}>
          <Download size={16} aria-hidden="true" />
          다시 받기
        </a>
      ) : null}
    </div>
  );
}

function translateStatus(status: string) {
  switch (status) {
    case "uploading":
      return "업로드";
    case "queued":
      return "대기";
    case "running":
      return "변환 중";
    case "completed":
      return "완료";
    case "failed":
      return "실패";
    default:
      return status;
  }
}
