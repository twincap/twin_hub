import type { UtilityDefinition } from "@/utilities/types";

export const metadata = {
  slug: "media-downloader",
  name: "Media Downloader",
  summary: "YouTube, Bilibili 영상을 video, mp3, wav로 저장합니다.",
  description: "권한이 있는 공개 영상만 대상으로 yt-dlp와 ffmpeg를 사용해 서버에서 다운로드/변환합니다.",
  category: "Media",
  tags: ["youtube", "bilibili", "yt-dlp", "audio"],
  runtime: "next-api",
  status: "beta",
  accent: "#5865f2",
  path: "/utilities/media-downloader",
  apiRoute: "/api/media-downloader"
} satisfies UtilityDefinition;
