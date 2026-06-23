import { metadata as mediaConverterMetadata } from "@/utilities/media-converter/metadata";
import { metadata as mediaDownloaderMetadata } from "@/utilities/media-downloader/metadata";
import { metadata as pdfMergerMetadata } from "@/utilities/pdf-merger/metadata";
import type { UtilityDefinition } from "@/utilities/types";

export const utilities: UtilityDefinition[] = [mediaConverterMetadata, mediaDownloaderMetadata, pdfMergerMetadata];

export function getUtility(slug: string) {
  return utilities.find((utility) => utility.slug === slug);
}
