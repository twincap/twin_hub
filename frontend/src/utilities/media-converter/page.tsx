"use client";

import { Download, FilePlus2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { JobProgress } from "@/components/job-progress";
import {
  convertMediaInBrowser,
  disposeBrowserFfmpeg
} from "@/utilities/media-converter/browser-ffmpeg";
import {
  BROWSER_CONVERTER_MAX_MB,
  browserConvertProfiles
} from "@/utilities/media-converter/browser-profiles";

type QueueItem = {
  localId: string;
  fileName: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  downloadUrl?: string;
  downloadName?: string;
  error?: string;
};

const activeStatuses = new Set(["queued", "running"]);
const maxBatchFiles = 5;
const maxQueueItems = 10;
const profileGroups = [
  { kind: "audio" as const, label: "오디오" },
  { kind: "video" as const, label: "비디오" },
  { kind: "container" as const, label: "컨테이너" }
];

export default function MediaConverterUtility() {
  const [profileId, setProfileId] = useState(browserConvertProfiles[0]?.id ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const browserDownloadUrlsRef = useRef(new Set<string>());
  const mountedRef = useRef(false);
  const submittingRef = useRef(false);
  const selectedProfile = browserConvertProfiles.find((profile) => profile.id === profileId);

  useEffect(() => {
    const urls = browserDownloadUrlsRef.current;
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
      disposeBrowserFfmpeg();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    if (files.length === 0) {
      setError("변환할 파일을 선택하세요.");
      return;
    }

    const profile = browserConvertProfiles.find((item) => item.id === profileId);

    if (!profile) {
      setError("변환 프로필을 선택하세요.");
      return;
    }

    if (files.length > maxBatchFiles) {
      setError(`한 번에 최대 ${maxBatchFiles}개 파일을 변환할 수 있습니다.`);
      return;
    }

    if (queue.length + files.length > maxQueueItems) {
      setError(`결과 목록은 최대 ${maxQueueItems}개입니다. 저장한 항목을 목록에서 제거한 뒤 다시 시도하세요.`);
      return;
    }

    const oversizedFile = files.find((file) => file.size > BROWSER_CONVERTER_MAX_MB * 1024 * 1024);

    if (oversizedFile) {
      setError(`${oversizedFile.name} 파일이 ${BROWSER_CONVERTER_MAX_MB}MB 제한을 넘습니다.`);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError("");

    const items = files.map((file) => ({
      localId: crypto.randomUUID(),
      fileName: file.name,
      status: "queued" as const,
      progress: 0
    }));

    setQueue([...items, ...queue]);

    try {
      for (const [index, item] of items.entries()) {
        if (!mountedRef.current) {
          break;
        }

        await startBrowserConversion(item.localId, files[index], profile);
      }

      if (!mountedRef.current) {
        return;
      }

      setFiles([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      submittingRef.current = false;

      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  }

  async function startBrowserConversion(
    localId: string,
    file: File,
    profile: (typeof browserConvertProfiles)[number]
  ) {
    if (!mountedRef.current) {
      return;
    }

    updateQueueItem(localId, {
      status: "running",
      progress: 1,
      error: undefined
    });

    try {
      const result = await convertMediaInBrowser(file, profile, (progress) => {
        if (!mountedRef.current) {
          return;
        }

        updateQueueItem(localId, {
          status: "running",
          progress
        });
      });

      if (!mountedRef.current) {
        return;
      }

      const downloadUrl = URL.createObjectURL(result.blob);

      browserDownloadUrlsRef.current.add(downloadUrl);
      updateQueueItem(localId, {
        status: "completed",
        progress: 100,
        downloadUrl,
        downloadName: result.fileName,
        error: undefined
      });
    } catch (conversionError) {
      if (!mountedRef.current) {
        return;
      }

      updateQueueItem(localId, {
        status: "failed",
        error: conversionError instanceof Error ? conversionError.message : "브라우저 변환에 실패했습니다."
      });
    }
  }

  function updateQueueItem(localId: string, update: Partial<QueueItem>) {
    setQueue((current) => current.map((item) => (item.localId === localId ? { ...item, ...update } : item)));
  }

  function removeQueueItem(localId: string) {
    const item = queue.find((candidate) => candidate.localId === localId);

    if (!item || activeStatuses.has(item.status)) {
      return;
    }

    releaseQueueItemUrl(item);
    setQueue((current) => current.filter((candidate) => candidate.localId !== localId));
  }

  function releaseQueueItemUrl(item: QueueItem) {
    if (!item.downloadUrl) {
      return;
    }

    URL.revokeObjectURL(item.downloadUrl);
    browserDownloadUrlsRef.current.delete(item.downloadUrl);
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
            accept="audio/*,video/*,.aac,.aiff,.avi,.flac,.h264,.h265,.m4a,.mka,.mkv,.mov,.mp3,.mp4,.mpg,.ogg,.ogv,.opus,.ts,.wav,.webm"
          />
        </label>

        <label className="field form-span">
          <span>변환 프로필</span>
          <select value={profileId} onChange={(event) => setProfileId(event.target.value)} required>
            {profileGroups.map((group) => (
              <optgroup key={group.kind} label={group.label}>
                {browserConvertProfiles
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
              {"videoCodec" in selectedProfile && selectedProfile.videoCodec ? ` · ${selectedProfile.videoCodec}` : ""}
              {"audioCodec" in selectedProfile && selectedProfile.audioCodec ? ` · ${selectedProfile.audioCodec}` : ""}
            </span>
          </div>
        ) : null}

        <div className="notice-box form-span" role="status">
          서버 없이 브라우저에서 직접 변환합니다. 파일은 외부로 업로드되지 않으며, 첫 실행 때 약 31MB의 FFmpeg
          엔진을 불러옵니다. 여러 파일은 메모리 보호를 위해 차례대로 처리합니다.
        </div>

        <button className="button primary form-span" disabled={submitting || !profileId || files.length === 0} type="submit">
          {submitting ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <FilePlus2 size={16} aria-hidden="true" />}
          변환 시작
        </button>

        <span className="runtime-pill form-span">
          브라우저 처리 · 한 번 최대 {maxBatchFiles}개 · 파일당 최대 {BROWSER_CONVERTER_MAX_MB}MB
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
            <QueueRow item={item} key={item.localId} onRemove={() => removeQueueItem(item.localId)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function QueueRow({ item, onRemove }: { item: QueueItem; onRemove: () => void }) {
  return (
    <div aria-busy={activeStatuses.has(item.status)} className="queue-item">
      <div className="queue-title">
        <strong>{item.downloadName ?? item.fileName}</strong>
        <div className="inline-actions">
          <span className="runtime-pill">{translateStatus(item.status)}</span>
          <button
            aria-label={`${item.fileName} 목록에서 제거`}
            className="icon-button"
            disabled={activeStatuses.has(item.status)}
            onClick={onRemove}
            title="목록에서 제거"
            type="button"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <JobProgress progress={item.progress} runningLabel="작업 중" status={item.status} />
      {item.error ? <div className="error-box" role="alert">{item.error}</div> : null}
      {item.downloadUrl ? (
        <a className="button primary" download={item.downloadName} href={item.downloadUrl}>
          <Download size={16} aria-hidden="true" />
          결과 저장
        </a>
      ) : null}
    </div>
  );
}

function translateStatus(status: QueueItem["status"]) {
  switch (status) {
    case "queued":
      return "대기";
    case "running":
      return "변환 중";
    case "completed":
      return "완료";
    case "failed":
      return "실패";
  }
}
