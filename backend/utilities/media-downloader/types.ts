export type MediaDownloadFormat = "video" | "mp3" | "wav";

export type MediaDownloadQuality = "best" | "1080" | "720" | "480" | "audio-best";

export type MediaDownloadStatus = "queued" | "running" | "completed" | "failed";

export type MediaDownloadRequest = {
  url: string;
  format: MediaDownloadFormat;
  quality: MediaDownloadQuality;
  fileName?: string;
  acceptTerms: boolean;
};

export type MediaDownloadJob = {
  id: string;
  status: MediaDownloadStatus;
  url: string;
  format: MediaDownloadFormat;
  quality: MediaDownloadQuality;
  createdAt: string;
  updatedAt: string;
  outputPath?: string;
  fileName?: string;
  logs: string[];
  error?: string;
  processId?: number;
};

export type MediaDownloaderConfig = {
  enabled: boolean;
  downloadDir: string;
  ytdlpPath: string;
};
