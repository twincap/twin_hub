"use client";

import { Download, FilePlus2, FolderOpen, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

type ConvertProfile = {
  id: string;
  label: string;
  kind: "audio" | "video" | "container";
  extension: string;
  container: string;
  audioCodec?: string;
  videoCodec?: string;
};

type ConvertJob = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  profileId: string;
  originalName: string;
  fileName?: string;
  progress: number;
  logs: string[];
  error?: string;
};

type QueueItem = {
  localId: string;
  fileName: string;
  status: "uploading" | "queued";
  job?: ConvertJob;
  error?: string;
};

type InfoResponse = {
  enabled: boolean;
  ffmpegDetected?: boolean;
  profiles: ConvertProfile[];
  convertDir: string;
  maxUploadMb: number;
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

export default function MediaConverterUtility() {
  const [profiles, setProfiles] = useState<ConvertProfile[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [ffmpegDetected, setFfmpegDetected] = useState<boolean | null>(null);
  const [maxUploadMb, setMaxUploadMb] = useState(512);
  const [profileId, setProfileId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [outputDir, setOutputDir] = useState("");
  const [pickingOutputDir, setPickingOutputDir] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadInfo() {
      const response = await fetch("/api/media-converter");
      const payload = (await response.json()) as InfoResponse;

      setProfiles(payload.profiles ?? []);
      setEnabled(Boolean(payload.enabled));
      setFfmpegDetected(payload.ffmpegDetected ?? null);
      setMaxUploadMb(payload.maxUploadMb ?? 512);
      setOutputDir(payload.convertDir ?? "");
      setProfileId(payload.profiles?.[0]?.id ?? "");
    }

    loadInfo().catch((infoError) => {
      setError(infoError instanceof Error ? infoError.message : "변환 설정을 불러오지 못했습니다.");
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

          const response = await fetch(`/api/media-converter?jobId=${item.job.id}`);
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

    if (!enabled || ffmpegDetected === false) {
      setError("변환 기능을 사용할 수 없습니다. FFmpeg 설정을 확인하세요.");
      return;
    }

    if (files.length === 0) {
      setError("변환할 파일을 선택하세요.");
      return;
    }

    if (!profileId) {
      setError("변환 프로필을 선택하세요.");
      return;
    }

    setSubmitting(true);
    setError("");

    const items = files.map((file) => ({
      localId: crypto.randomUUID(),
      fileName: file.name,
      status: "uploading" as const
    }));

    setQueue((current) => [...items, ...current]);

    await Promise.all(items.map((item, index) => startConversion(item.localId, files[index])));

    setFiles([]);
    setSubmitting(false);
  }

  async function startConversion(localId: string, file: File) {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("profileId", profileId);
    formData.set("outputDir", outputDir);

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
                status: "queued",
                job: payload.job,
                error: response.ok ? undefined : payload.error ?? "변환을 시작하지 못했습니다."
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
          <span>파일</span>
          <input
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
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label} .{profile.extension}
              </option>
            ))}
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

        <button className="button primary form-span" disabled={submitting || !enabled || ffmpegDetected === false || !profileId} type="submit">
          {submitting ? <Loader2 size={16} aria-hidden="true" /> : <FilePlus2 size={16} aria-hidden="true" />}
          대기열에 등록
        </button>

        <span className="runtime-pill form-span">최대 업로드 {maxUploadMb}MB</span>
      </form>

      {error ? <div className="error-box">{error}</div> : null}

      <section className="job-panel" aria-label="변환 대기열">
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
  const progress = job?.progress ?? 0;
  const status = job?.status ?? item.status;
  const downloadUrl = job?.status === "completed" ? `/api/media-converter/file?jobId=${job.id}` : "";

  return (
    <div className="queue-item">
      <div className="queue-title">
        <strong>{job?.fileName ?? item.fileName}</strong>
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
