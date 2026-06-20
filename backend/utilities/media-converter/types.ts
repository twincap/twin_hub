export type MediaConvertStatus = "queued" | "running" | "completed" | "failed";

export type MediaConvertKind = "audio" | "video" | "container";

export type MediaConvertProfile = {
  id: string;
  label: string;
  kind: MediaConvertKind;
  extension: string;
  container: string;
  audioCodec?: string;
  videoCodec?: string;
  notes: string;
  ffmpegArgs: string[];
};

export type MediaConvertRequest = {
  inputPath: string;
  originalName: string;
  profileId: string;
  outputName?: string;
};

export type MediaConvertJob = {
  id: string;
  status: MediaConvertStatus;
  profileId: string;
  originalName: string;
  createdAt: string;
  updatedAt: string;
  inputPath: string;
  outputPath?: string;
  fileName?: string;
  logs: string[];
  error?: string;
  processId?: number;
};

export type MediaConverterConfig = {
  enabled: boolean;
  convertDir: string;
  ffmpegPath: string;
  maxUploadMb: number;
};
