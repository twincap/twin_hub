import type { UtilityDefinition } from "@/utilities/types";

export const metadata = {
  slug: "media-converter",
  name: "코덱 변환기",
  summary: "오디오와 비디오 파일을 원하는 형식으로 변환합니다.",
  description: "서버가 없어도 브라우저의 FFmpeg WebAssembly로 오디오와 비디오를 변환합니다.",
  category: "미디어",
  tags: ["ffmpeg", "codec", "opus", "video", "audio", "remux"],
  runtime: "client",
  status: "ready",
  accent: "#23a55a",
  path: "/utilities/media-converter"
} satisfies UtilityDefinition;
