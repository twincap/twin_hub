import type { UtilityDefinition } from "@/utilities/types";

export const metadata = {
  slug: "media-downloader",
  name: "미디어 다운로드",
  summary: "YouTube와 Bilibili 영상을 원하는 형식으로 저장합니다.",
  description: "여러 URL을 대기열에 등록하고 최고 품질로 다운로드합니다.",
  category: "미디어",
  tags: ["youtube", "bilibili", "yt-dlp", "audio", "opus"],
  runtime: "next-api",
  status: "beta",
  accent: "#5865f2",
  path: "/utilities/media-downloader",
  apiRoute: "/api/media-downloader"
} satisfies UtilityDefinition;
