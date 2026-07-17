import type { UtilityDefinition } from "@/utilities/types";

export const metadata = {
  slug: "media-downloader",
  name: "미디어 다운로드",
  summary: "YouTube와 Bilibili 미디어를 웹에서 바로 다운로드합니다.",
  description: "입력한 미디어 URL을 Cobalt 웹으로 연결해 서버 설정 없이 다운로드합니다.",
  category: "미디어",
  tags: ["youtube", "bilibili", "yt-dlp", "cobalt", "audio", "opus"],
  runtime: "external-api",
  status: "ready",
  accent: "#5865f2",
  path: "/utilities/media-downloader"
} satisfies UtilityDefinition;
