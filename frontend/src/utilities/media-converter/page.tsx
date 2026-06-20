"use client";

import { Download, FileAudio, FileVideo, Loader2, Package, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ConvertProfile = {
  id: string;
  label: string;
  kind: "audio" | "video" | "container";
  extension: string;
  container: string;
  audioCodec?: string;
  videoCodec?: string;
  notes: string;
};

type ConvertJob = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  profileId: string;
  originalName: string;
  fileName?: string;
  logs: string[];
  error?: string;
};

type InfoResponse = {
  enabled: boolean;
  ffmpegDetected?: boolean;
  ffmpegVersion?: string | null;
  profiles: ConvertProfile[];
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

export default function MediaConverterUtility() {
  const [profiles, setProfiles] = useState<ConvertProfile[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [ffmpegDetected, setFfmpegDetected] = useState<boolean | null>(null);
  const [ffmpegVersion, setFfmpegVersion] = useState<string | null>(null);
  const [maxUploadMb, setMaxUploadMb] = useState(512);
  const [profileId, setProfileId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [outputName, setOutputName] = useState("");
  const [job, setJob] = useState<ConvertJob | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [kindFilter, setKindFilter] = useState<"all" | "audio" | "video" | "container">("all");
  const [query, setQuery] = useState("");

  const active = job?.status === "queued" || job?.status === "running";
  const downloadUrl = job?.status === "completed" ? `/api/media-converter/file?jobId=${job.id}` : "";

  const filteredProfiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return profiles.filter((profile) => {
      const matchesKind = kindFilter === "all" || profile.kind === kindFilter;
      const searchable = [profile.label, profile.container, profile.audioCodec, profile.videoCodec, profile.extension, profile.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesKind && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [kindFilter, profiles, query]);
  const activeProfileId = filteredProfiles.some((profile) => profile.id === profileId)
    ? profileId
    : (filteredProfiles[0]?.id ?? "");
  const selectedProfile = profiles.find((profile) => profile.id === activeProfileId);

  useEffect(() => {
    async function loadInfo() {
      const response = await fetch("/api/media-converter");
      const payload = (await response.json()) as InfoResponse;

      setProfiles(payload.profiles ?? []);
      setEnabled(Boolean(payload.enabled));
      setFfmpegDetected(payload.ffmpegDetected ?? null);
      setFfmpegVersion(payload.ffmpegVersion ?? null);
      setMaxUploadMb(payload.maxUploadMb ?? 512);
      setProfileId(payload.profiles?.[0]?.id ?? "");
    }

    loadInfo().catch((infoError) => {
      setError(infoError instanceof Error ? infoError.message : "Failed to load profiles.");
    });
  }, []);

  useEffect(() => {
    if (!active || !job) {
      return;
    }

    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/media-converter?jobId=${job.id}`);
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

  function handleKindFilter(nextKind: "all" | "audio" | "video" | "container") {
    setKindFilter(nextKind);

    const nextProfile = nextKind === "all" ? profiles[0] : profiles.find((profile) => profile.kind === nextKind);

    if (nextProfile) {
      setProfileId(nextProfile.id);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Select an input file.");
      return;
    }

    if (!activeProfileId) {
      setError("Select an output profile.");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("profileId", activeProfileId);
    formData.set("outputName", outputName);

    setSubmitting(true);
    setError("");
    setJob(null);

    try {
      const response = await fetch("/api/media-converter", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as StartResponse;

      if (!response.ok || !payload.job) {
        setError(payload.error ?? "Failed to start conversion.");
        return;
      }

      setJob(payload.job);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="utility-surface">
      <div className="notice-box">
        This is real FFmpeg transcoding, not file extension renaming. Opus is supported as audio-only and inside WebM/MKV profiles.
        {enabled ? null : " MEDIA_CONVERTER_ENABLED=true is not set, so conversion is currently disabled."}
        {enabled && ffmpegDetected === false ? " FFmpeg was not detected at FFMPEG_PATH." : null}
      </div>

      <form className="download-form" onSubmit={handleSubmit}>
        <label className="field form-span">
          <span>Input file</span>
          <input
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
            type="file"
            accept="audio/*,video/*,.3gp,.aac,.aiff,.amr,.aptx,.aptxhd,.avi,.caf,.dts,.eac3,.flac,.flv,.h264,.h265,.m4a,.mka,.mkv,.mov,.mp1,.mp2,.mp3,.mp4,.mpg,.mxf,.ogg,.ogv,.opus,.sbc,.spx,.ts,.tta,.wav,.webm,.wma,.wmv,.wv"
          />
        </label>

        <div className="segmented-actions form-span" aria-label="Profile filters">
          <button className={kindFilter === "all" ? "active" : ""} onClick={() => handleKindFilter("all")} type="button">
            All
          </button>
          <button className={kindFilter === "audio" ? "active" : ""} onClick={() => handleKindFilter("audio")} type="button">
            <FileAudio size={15} aria-hidden="true" />
            Audio
          </button>
          <button className={kindFilter === "video" ? "active" : ""} onClick={() => handleKindFilter("video")} type="button">
            <FileVideo size={15} aria-hidden="true" />
            Video
          </button>
          <button className={kindFilter === "container" ? "active" : ""} onClick={() => handleKindFilter("container")} type="button">
            <Package size={15} aria-hidden="true" />
            Remux
          </button>
        </div>

        <label className="field form-span">
          <span>Search profiles</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="opus, h264, flac, remux, mkv, webm..." type="search" />
        </label>

        <label className="field form-span">
          <span>Output profile</span>
          <select value={activeProfileId} onChange={(event) => setProfileId(event.target.value)} required>
            {filteredProfiles.length === 0 ? (
              <option value="" disabled>
                No matching profiles
              </option>
            ) : null}
            {filteredProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label} .{profile.extension}
              </option>
            ))}
          </select>
        </label>

        {selectedProfile ? (
          <div className="profile-summary form-span">
            <strong>{selectedProfile.container}</strong>
            <span>
              {[selectedProfile.videoCodec, selectedProfile.audioCodec].filter(Boolean).join(" + ") ||
                (selectedProfile.kind === "container" ? "Stream copy when compatible" : "Audio only")}
            </span>
            <p>{selectedProfile.notes}</p>
          </div>
        ) : null}

        <label className="field form-span">
          <span>Output file name</span>
          <input value={outputName} onChange={(event) => setOutputName(event.target.value)} placeholder="Leave empty to use the input file name." type="text" />
        </label>

        <button className="button primary form-span" disabled={submitting || active || !enabled || !activeProfileId} type="submit">
          {submitting || active ? <Loader2 size={16} aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
          Start conversion
        </button>

        <span className="runtime-pill form-span">Max upload: {maxUploadMb} MB</span>
        <span className="runtime-pill form-span">
          FFmpeg: {ffmpegDetected === null ? "unknown" : ffmpegDetected ? "ready" : "missing"}
          {ffmpegVersion && ffmpegDetected ? ` (${ffmpegVersion.split(" ")[2] ?? "detected"})` : ""}
        </span>
      </form>

      {error ? <div className="error-box">{error}</div> : null}

      {job ? (
        <section className="job-panel" aria-label="Conversion job status">
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
              Download converted file
            </a>
          ) : null}
          <pre className="code-output">{job.logs.join("\n") || "Waiting"}</pre>
        </section>
      ) : null}
    </div>
  );
}
