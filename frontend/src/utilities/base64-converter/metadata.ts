import type { UtilityDefinition } from "@/utilities/types";

export const metadata = {
  slug: "base64-converter",
  name: "Base64 인코더·디코더",
  summary: "UTF-8 텍스트를 Base64로 인코딩하거나 다시 디코딩합니다.",
  description: "한글과 이모지를 포함한 UTF-8 텍스트를 브라우저에서 바로 Base64로 변환합니다.",
  category: "텍스트",
  tags: ["base64", "encode", "decode", "utf-8", "text"],
  runtime: "client",
  status: "ready",
  accent: "#eb459e",
  path: "/utilities/base64-converter"
} satisfies UtilityDefinition;
