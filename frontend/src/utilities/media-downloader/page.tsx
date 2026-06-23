"use client";

import { Download, FilePlus2, FolderOpen, Loader2, Music, Video } from "lucide-react";
import { useEffect, useState } from "react";

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
  logs: string[];
  error?: string;
};

type QueueItem = {
  localId: string;
  url: string;
  status: "requesting" | "queued";
  job?: DownloadJob;
  error?: string;
};

type InfoResponse = {
  enabled: boolean;
  downloadDir: string;
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

export default function MediaDownloaderUtility() {
  const [urls, setUrls] = useState("");
  const [format, setFormat] = useState<DownloadFormat>("video");
  const [outputDir, setOutputDir] = useState("");
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

      setEnabled(Boolean(payload.enabled));
      setOutputDir(payload.downloadDir ?? "");
      setLoadedInfo(true);

      if (payload.error) {
        setError(payload.error);
      }
    }

    loadInfo().catch((infoError) => {
      setLoadedInfo(true);
      setError(infoError instanceof Error ? infoError.message : "다운로드 설정을 불러오지 못했습니다.");
    });
  }, []);

  useEffect(() => {
    const activeItems = queue.filter((item) => item.job && activeStatuses.has(item.job.status));

    if (activeItems.length === 0) {
      return;
    }

    const timer = window.setInterval(async () => {
      const updates = await Promise.all(
        activeItems.map(async (item) => {
          if (!item.job) {
            return null;
          }

          const response = await fetch(`/api/media-downloader?jobId=${item.job.id}`);
          const payload = (await response.json()) as StatusResponse;

          return {
            localId: item.localId,
            job: payload.job,
            error: payload.error
          };
        })
      );

      setQueue((current) =>
        current.map((item) => {
          const update = updates.find((next) => next?.localId === item.localId);

          if (!update) {
            return item;
          }

          return {
            ...item,
            job: update.job ?? item.job,
            error: update.error ?? item.error
          };
        })
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [queue]);

  async function handleOutputDirPick() {
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

    if (!enabled) {
      setError("다운로드 기능을 사용할 수 없습니다. 로컬 백엔드 설정을 확인하세요.");
      return;
    }

    const list = urls
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (list.length === 0) {
      setError("다운로드할 URL을 입력하세요.");
      return;
    }

    setSubmitting(true);
    setError("");

    const items = list.map((url) => ({
      localId: crypto.randomUUID(),
      url,
      status: "requesting" as const
    }));

    setQueue((current) => [...items, ...current]);
    await Promise.all(items.map((item) => startDownload(item.localId, item.url)));
    setUrls("");
    setSubmitting(false);
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
          outputDir
        })
      });
      const payload = (await response.json()) as StartResponse;

      setQueue((current) =>
        current.map((item) =>
          item.localId === localId
            ? {
                ...item,
                status: "queued",
                job: payload.job,
                error: response.ok ? undefined : payload.error ?? "다운로드를 시작하지 못했습니다."
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
                status: "queued",
                error: requestError instanceof Error ? requestError.message : "요청 실패"
              }
            : item
        )
      );
    }
  }

  return (
    <div className="utility-surface">
      <form className="download-form" onSubmit={handleSubmit}>
        <label className="field form-span">
          <span>URL</span>
          <textarea
            value={urls}
            onChange={(event) => setUrls(event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>파일 형식</span>
          <select value={format} onChange={(event) => setFormat(event.target.value as DownloadFormat)}>
            <option value="video">MP4</option>
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
            <option value="opus">Opus</option>
          </select>
        </label>

        <label className="field form-span">
          <span>저장 경로</span>
          <div className="path-picker">
            <input value={outputDir} onChange={(event) => setOutputDir(event.target.value)} placeholder="예: C:/Users/twincap/Downloads" type="text" />
            <button className="button" disabled={pickingOutputDir} onClick={handleOutputDirPick} type="button">
              {pickingOutputDir ? <Loader2 size={16} aria-hidden="true" /> : <FolderOpen size={16} aria-hidden="true" />}
              폴더 선택
            </button>
          </div>
        </label>

        <button className="button primary form-span" disabled={submitting || !loadedInfo || !enabled} type="submit">
          {submitting ? <Loader2 size={16} aria-hidden="true" /> : <FilePlus2 size={16} aria-hidden="true" />}
          대기열에 등록
        </button>
      </form>

      {error ? <div className="error-box">{error}</div> : null}

      <section className="job-panel" aria-label="다운로드 대기열">
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

  return (
    <div className="queue-item">
      <div className="queue-title">
        <strong>{job?.fileName ?? item.url}</strong>
        <span className="runtime-pill">{translateStatus(status)}</span>
      </div>
      <div className="progress-row">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span>{progress}%</span>
      </div>
      {item.error || job?.error ? <div className="error-box">{item.error ?? job?.error}</div> : null}
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
    default:
      return status;
  }
}
