export type MediaDownloadFormat = "video" | "mp3" | "wav";

export type MediaDownloadStatus = "queued" | "running" | "completed" | "failed";

export type MediaDownloadRequest = {
  url: string;
  format: MediaDownloadFormat;
  fileName?: string;
};

export type MediaDownloadJob = {
  id: string;
  status: MediaDownloadStatus;
  url: string;
  format: MediaDownloadFormat;
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
