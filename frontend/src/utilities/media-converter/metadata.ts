import type { UtilityDefinition } from "@/utilities/types";

export const metadata = {
  slug: "media-converter",
  name: "코덱 변환기",
  summary: "오디오와 비디오 파일을 원하는 형식으로 변환합니다.",
  description: "여러 파일을 대기열에 등록하고 FFmpeg로 변환합니다.",
  category: "미디어",
  tags: ["ffmpeg", "codec", "opus", "video", "audio", "remux"],
  runtime: "next-api",
  status: "beta",
  accent: "#23a55a",
  path: "/utilities/media-converter",
  apiRoute: "/api/media-converter"
} satisfies UtilityDefinition;
