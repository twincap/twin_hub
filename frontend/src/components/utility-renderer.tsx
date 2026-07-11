import MediaConverterUtility from "@/utilities/media-converter/page";
import MediaDownloaderUtility from "@/utilities/media-downloader/page";
import PdfMergerUtility from "@/utilities/pdf-merger/page";
import type { ComponentType } from "react";
import type { UtilitySlug } from "@/utilities/registry";
import type { UtilityDefinition } from "@/utilities/types";

type UtilityRendererProps = {
  utility: UtilityDefinition;
};

const utilityComponents: Record<UtilitySlug, ComponentType> = {
  "media-converter": MediaConverterUtility,
  "media-downloader": MediaDownloaderUtility,
  "pdf-merger": PdfMergerUtility
};

export function UtilityRenderer({ utility }: UtilityRendererProps) {
  const Component = utilityComponents[utility.slug as UtilitySlug];

  if (!Component) {
    return <div className="empty-state">연결된 유틸 화면이 없습니다.</div>;
  }

  return <Component />;
}
