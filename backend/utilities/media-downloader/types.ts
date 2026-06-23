export type MediaDownloadFormat = "video" | "mp3" | "wav" | "opus";

export type MediaDownloadStatus = "queued" | "running" | "completed" | "failed";

export type MediaDownloadRequest = {
  url: string;
  format: MediaDownloadFormat;
  fileName?: string;
  outputDir?: string;
};

export type MediaDownloadJob = {
  id: string;
  status: MediaDownloadStatus;
  url: string;
  format: MediaDownloadFormat;
  createdAt: string;
  updatedAt: string;
  outputPath?: string;
  outputDir?: string;
  fileName?: string;
  progress: number;
  lastOutputAt?: string;
  logs: string[];
  error?: string;
  processId?: number;
};

export type MediaDownloaderConfig = {
  enabled: boolean;
  downloadDir: string;
  ytdlpPath: string;
  ytdlpJsRuntime: string;
  noOutputTimeoutMs: number;
};
