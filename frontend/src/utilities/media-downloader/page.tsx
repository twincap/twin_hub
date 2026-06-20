"use client";

import { Download, Loader2, Music, Video } from "lucide-react";
import { useEffect, useState } from "react";

type DownloadFormat = "video" | "mp3" | "wav";

type DownloadJob = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  url: string;
  format: DownloadFormat;
  createdAt: string;
  updatedAt: string;
  fileName?: string;
  logs: string[];
  error?: string;
};

type InfoResponse = {
  enabled: boolean;
  supportedHosts: string[];
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

export default function MediaDownloaderUtility() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<DownloadFormat>("video");
  const [fileName, setFileName] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [supportedHosts, setSupportedHosts] = useState<string[]>([]);
  const [loadedInfo, setLoadedInfo] = useState(false);
  const [job, setJob] = useState<DownloadJob | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const active = job?.status === "queued" || job?.status === "running";
  const downloadUrl = job?.status === "completed" ? `/api/media-downloader/file?jobId=${job.id}` : "";

  useEffect(() => {
    async function loadInfo() {
      const response = await fetch("/api/media-downloader");
      const payload = (await response.json()) as InfoResponse;

      setEnabled(Boolean(payload.enabled));
      setSupportedHosts(payload.supportedHosts ?? []);
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
    if (!active || !job) {
      return;
    }

    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/media-downloader?jobId=${job.id}`);
      const payload = (await response.json()) as StatusResponse;

      if (payload.job) {
        setJob(payload.job);
      }

      if (payload.error) {
        setError(payload.error);
      }
    }, 1500);

    return () => window.clearInterval(timer);
  }, [active, job]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!enabled) {
      setError("서버에서 다운로드 기능이 꺼져 있습니다. MEDIA_DOWNLOADER_ENABLED=true 설정이 필요합니다.");
      return;
    }

    setSubmitting(true);
    setError("");
    setJob(null);

    try {
      const response = await fetch("/api/media-downloader", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url,
          format,
          fileName
        })
      });
      const payload = (await response.json()) as StartResponse;

      if (!response.ok || !payload.job) {
        setError(payload.error ?? "다운로드 작업을 시작하지 못했습니다.");
        return;
      }

      setJob(payload.job);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "요청 실패");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="utility-surface">
      <div className="notice-box">
        YouTube/Bilibili URL을 최고 품질로 다운로드합니다. Video는 가능한 최고 화질 MP4, MP3/WAV는 가능한 최고 음질로 처리합니다.
        {enabled ? null : " 현재 배포 환경에서는 다운로드 기능이 꺼져 있습니다."}
      </div>

      <form className="download-form" onSubmit={handleSubmit}>
        <label className="field form-span">
          <span>영상 URL</span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=... 또는 https://www.bilibili.com/video/..."
            required
            type="url"
          />
        </label>

        <label className="field">
          <span>형식</span>
          <select value={format} onChange={(event) => setFormat(event.target.value as DownloadFormat)}>
            <option value="video">Video</option>
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
          </select>
        </label>

        <label className="field form-span">
          <span>파일명</span>
          <input
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
            placeholder="비워두면 원본 제목을 사용합니다."
            type="text"
          />
        </label>

        <button className="button primary form-span" disabled={submitting || active || !loadedInfo || !enabled} type="submit">
          {submitting || active ? (
            <Loader2 size={16} aria-hidden="true" />
          ) : format === "video" ? (
            <Video size={16} aria-hidden="true" />
          ) : (
            <Music size={16} aria-hidden="true" />
          )}
          최고 품질로 시작
        </button>

        {supportedHosts.length > 0 ? <span className="runtime-pill form-span">지원: YouTube, Bilibili</span> : null}
      </form>

      {error ? <div className="error-box">{error}</div> : null}

      {job ? (
        <section className="job-panel" aria-label="다운로드 작업 상태">
          <div className="job-head">
            <div>
              <span className={`status-dot ${job.status}`} />
              <strong>{job.status}</strong>
            </div>
            <code>{job.id}</code>
          </div>
          {job.fileName ? <p>{job.fileName}</p> : null}
          {job.error ? <div className="error-box">{job.error}</div> : null}
          {downloadUrl ? (
            <a className="button primary" href={downloadUrl}>
              <Download size={16} aria-hidden="true" />
              파일 다운로드
            </a>
          ) : null}
          <pre className="code-output">{job.logs.join("\n") || "대기 중"}</pre>
        </section>
      ) : null}
    </div>
  );
}
