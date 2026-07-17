"use client";

import { Download, ExternalLink, FilePlus2, FolderOpen, Loader2, Music, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { JobProgress } from "@/components/job-progress";
import { buildCobaltHandoffUrl } from "@/utilities/media-downloader/cobalt-url";

type DownloadFormat = "video" | "mp3" | "wav" | "opus";

type DownloadJob = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  url: string;
  format: DownloadFormat;
  createdAt: string;
  updatedAt: string;
  fileName?: string;
  progress: number;
  error?: string;
};

type QueueItem = {
  localId: string;
  url: string;
  status: "requesting" | "queued" | "failed" | "external";
  job?: DownloadJob;
  error?: string;
};

type InfoResponse = {
  enabled: boolean;
  downloadDir: string;
  canPickLocalFolder?: boolean;
  storesOnServer?: boolean;
  error?: string;
};

type StartResponse = {
  job?: DownloadJob;
  error?: string;
};

type StatusResponse = {
  job?: DownloadJob;
  canDownload?: boolean;
  error?: string;
};

type FolderPickerResponse = {
  path?: string;
  cancelled?: boolean;
  error?: string;
};

const activeStatuses = new Set(["queued", "running"]);
const localBrowserHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function isLocalBrowserHost() {
  return localBrowserHosts.has(window.location.hostname.toLowerCase());
}

export default function MediaDownloaderUtility() {
  const [urls, setUrls] = useState("");
  const [format, setFormat] = useState<DownloadFormat>("video");
  const [outputDir, setOutputDir] = useState("");
  const [canPickLocalFolder, setCanPickLocalFolder] = useState(false);
  const [pickingOutputDir, setPickingOutputDir] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loadedInfo, setLoadedInfo] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadInfo() {
      const response = await fetch("/api/media-downloader");
      const payload = (await response.json()) as InfoResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "다운로드 설정을 불러오지 못했습니다.");
      }

      const localFolderAvailable = Boolean(payload.canPickLocalFolder) && isLocalBrowserHost();

      setEnabled(Boolean(payload.enabled));
      setCanPickLocalFolder(Boolean(payload.enabled) && localFolderAvailable);
      setOutputDir(payload.enabled && localFolderAvailable ? payload.downloadDir ?? "" : "");
      setLoadedInfo(true);

      if (payload.enabled && payload.error) {
        setError(payload.error);
      }
    }

    loadInfo().catch(() => {
      setEnabled(false);
      setCanPickLocalFolder(false);
      setOutputDir("");
      setLoadedInfo(true);
      setError("");
    });
  }, []);

  useEffect(() => {
    const activeItems = queue.filter((item) => item.job && activeStatuses.has(item.job.status));

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
            const response = await fetch(`/api/media-downloader?jobId=${item.job.id}`);
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
  }, [queue]);

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

    const list = urls
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (list.length === 0) {
      setError("다운로드할 URL을 입력하세요.");
      return;
    }

    setError("");

    const items = list.map((url) => ({
      localId: crypto.randomUUID(),
      url,
      status: enabled ? ("requesting" as const) : ("external" as const)
    }));

    setQueue((current) => [...items, ...current]);
    setUrls("");

    if (!enabled) {
      return;
    }

    setSubmitting(true);

    try {
      await Promise.all(items.map((item) => startDownload(item.localId, item.url)));
    } finally {
      setSubmitting(false);
    }
  }

  async function startDownload(localId: string, url: string) {
    try {
      const response = await fetch("/api/media-downloader", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url,
          format,
          outputDir: canPickLocalFolder ? outputDir : undefined
        })
      });
      const payload = (await response.json()) as StartResponse;

      setQueue((current) =>
        current.map((item) =>
          item.localId === localId
            ? {
                ...item,
                status: response.ok && payload.job ? "queued" : "failed",
                job: response.ok ? payload.job : undefined,
                error: response.ok && payload.job ? undefined : payload.error ?? "다운로드를 시작하지 못했습니다."
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

  return (
    <div className="utility-surface">
      <form aria-busy={submitting} className="download-form" onSubmit={handleSubmit}>
        <label className="field form-span">
          <span>URL</span>
          <textarea
            value={urls}
            onChange={(event) => setUrls(event.target.value)}
            placeholder="한 줄에 URL 하나"
            required
          />
        </label>

        <label className="field">
          <span>파일 형식</span>
          <select disabled={loadedInfo && !enabled} value={format} onChange={(event) => setFormat(event.target.value as DownloadFormat)}>
            <option value="video">MP4</option>
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
            <option value="opus">Opus</option>
          </select>
        </label>

        {loadedInfo && enabled && canPickLocalFolder ? (
          <div className="field form-span">
            <label htmlFor="media-download-output-dir">저장 경로</label>
            <div className="path-picker">
              <input
                id="media-download-output-dir"
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

        {loadedInfo && enabled && !canPickLocalFolder ? (
          <div className="notice-box form-span" role="status">
            배포 환경에서는 로컬 폴더를 직접 선택할 수 없습니다. 완료 후 각 항목의 다시 받기 버튼으로 파일을 저장하세요.
          </div>
        ) : null}

        {loadedInfo && !enabled ? (
          <div className="notice-box form-span" role="status">
            서버를 사용할 수 없어 Cobalt 웹 연결 모드로 동작합니다. URL을 등록한 뒤 각 항목의 링크를 직접 눌러
            Cobalt에서 다운로드하세요. 파일 형식 선택은 전달되지 않으므로 이동한 화면에서 다시 선택해야 합니다.
          </div>
        ) : null}

        <button className="button primary form-span" disabled={submitting || !loadedInfo || !urls.trim()} type="submit">
          {submitting ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <FilePlus2 size={16} aria-hidden="true" />}
          {enabled ? "대기열에 등록" : "Cobalt 링크 만들기"}
        </button>
      </form>

      {error ? <div className="error-box" role="alert">{error}</div> : null}

      <section className="job-panel" aria-label="다운로드 대기열" aria-live="polite">
        <div className="job-head">
          <div>
            {format === "video" ? <Video size={16} aria-hidden="true" /> : <Music size={16} aria-hidden="true" />}
            <strong>다운로드 대기열</strong>
          </div>
          <span className="runtime-pill">{queue.length}개</span>
        </div>

        <div className="queue-list">
          {queue.length === 0 ? <div className="empty-state">등록된 다운로드가 없습니다.</div> : null}
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
  const progress = job?.progress ?? 0;
  const status = job?.status ?? item.status;
  const downloadUrl = job?.status === "completed" ? `/api/media-downloader/file?jobId=${job.id}` : "";
  const cobaltUrl = item.status === "external" ? buildCobaltHandoffUrl(item.url) : "";

  return (
    <div aria-busy={status === "requesting" || activeStatuses.has(status)} className="queue-item">
      <div className="queue-title">
        <strong>{job?.fileName ?? item.url}</strong>
        <span className="runtime-pill">{translateStatus(status)}</span>
      </div>
      {status !== "external" ? <JobProgress progress={progress} runningLabel="작업 중" status={status} /> : null}
      {item.error || job?.error ? <div className="error-box" role="alert">{item.error ?? job?.error}</div> : null}
      {cobaltUrl ? (
        <a className="button primary" href={cobaltUrl} rel="noopener noreferrer" target="_blank">
          <ExternalLink size={16} aria-hidden="true" />
          Cobalt에서 열기
        </a>
      ) : null}
      {downloadUrl ? (
        <a className="button primary" download={job?.fileName} href={downloadUrl}>
          <Download size={16} aria-hidden="true" />
          다시 받기
        </a>
      ) : null}
    </div>
  );
}

function translateStatus(status: string) {
  switch (status) {
    case "requesting":
      return "등록 중";
    case "queued":
      return "대기";
    case "running":
      return "다운로드 중";
    case "completed":
      return "완료";
    case "failed":
      return "실패";
    case "external":
      return "링크 준비됨";
    default:
      return status;
  }
}
