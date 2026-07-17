import type { UtilityDefinition } from "@/utilities/types";

export const metadata = {
  slug: "pdf-merger",
  name: "PDF 병합기",
  summary: "여러 PDF의 페이지를 원하는 순서로 섞어서 병합합니다.",
  description: "업로드한 PDF의 각 페이지를 펼친 뒤 페이지 단위로 순서를 바꿔 새 PDF를 만듭니다.",
  category: "문서",
  tags: ["pdf", "merge", "page-order", "document"],
  runtime: "client",
  status: "ready",
  accent: "#f0b232",
  path: "/utilities/pdf-merger"
} satisfies UtilityDefinition;
