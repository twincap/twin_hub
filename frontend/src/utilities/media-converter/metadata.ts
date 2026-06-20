import type { UtilityDefinition } from "@/utilities/types";

export const metadata = {
  slug: "media-converter",
  name: "Codec Converter",
  summary: "FFmpeg-powered audio, video, codec, and container converter.",
  description: "Convert or remux common media formats including MP3, WAV, FLAC, Opus, AAC, H.264, H.265, VP9, AV1, and ProRes.",
  category: "Media",
  tags: ["ffmpeg", "codec", "opus", "video", "audio", "remux"],
  runtime: "next-api",
  status: "beta",
  accent: "#23a55a",
  path: "/utilities/media-converter",
  apiRoute: "/api/media-converter"
} satisfies UtilityDefinition;
