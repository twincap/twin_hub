import type { UtilityDefinition } from "@/utilities/types";

export const metadata = {
  slug: "media-downloader",
  name: "미디어 다운로드",
  summary: "미디어 URL을 서버 다운로드 또는 Cobalt 웹 연결로 처리합니다.",
  description: "다운로드 서버가 활성화되어 있으면 대기열에서 직접 처리하고, 사용할 수 없으면 URL별 Cobalt 웹 링크를 제공합니다.",
  category: "미디어",
  tags: ["youtube", "bilibili", "yt-dlp", "cobalt", "audio", "opus"],
  runtime: "external-api",
  status: "ready",
  accent: "#5865f2",
  path: "/utilities/media-downloader",
  apiRoute: "/api/media-downloader"
} satisfies UtilityDefinition;
