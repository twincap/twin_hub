"use client";

import { Download, Loader2, Music, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type DownloadJob = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  url: string;
  format: "video" | "mp3" | "wav";
  quality: string;
  createdAt: string;
  updatedAt: string;
  fileName?: string;
  logs: string[];
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
  const [format, setFormat] = useState<"video" | "mp3" | "wav">("video");
  const [quality, setQuality] = useState("best");
  const [fileName, setFileName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [job, setJob] = useState<DownloadJob | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const audioMode = format === "mp3" || format === "wav";
  const active = job?.status === "queued" || job?.status === "running";
  const downloadUrl = job?.status === "completed" ? `/api/media-downloader/file?jobId=${job.id}` : "";

  const qualityOptions = useMemo(() => {
    if (audioMode) {
      return [
        {
          value: "audio-best",
          label: "Best audio"
        }
      ];
    }

    return [
      {
        value: "best",
        label: "Best available"
      },
      {
        value: "1080",
        label: "1080p 이하"
      },
      {
        value: "720",
        label: "720p 이하"
      },
      {
        value: "480",
        label: "480p 이하"
      }
    ];
  }, [audioMode]);

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
          quality,
          fileName,
          acceptTerms
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

  function handleFormatChange(nextFormat: "video" | "mp3" | "wav") {
    setFormat(nextFormat);
    setQuality(nextFormat === "video" ? "best" : "audio-best");
  }

  return (
    <div className="utility-surface">
      <div className="notice-box">
        권한이 있는 공개 콘텐츠만 다운로드하세요. DRM 우회, 비공개 콘텐츠 쿠키 추출, 약관 회피 기능은 제공하지 않습니다.
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
          <select value={format} onChange={(event) => handleFormatChange(event.target.value as "video" | "mp3" | "wav")}>
            <option value="video">Video</option>
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
          </select>
        </label>

        <label className="field">
          <span>품질</span>
          <select value={quality} onChange={(event) => setQuality(event.target.value)}>
            {qualityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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

        <label className="checkline form-span">
          <input checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} type="checkbox" />
          <span>이 콘텐츠를 다운로드할 권한이 있습니다.</span>
        </label>

        <button className="button primary form-span" disabled={submitting || active} type="submit">
          {submitting || active ? (
            <Loader2 size={16} aria-hidden="true" />
          ) : format === "video" ? (
            <Video size={16} aria-hidden="true" />
          ) : (
            <Music size={16} aria-hidden="true" />
          )}
          작업 시작
        </button>
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
