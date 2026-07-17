import { metadata as base64ConverterMetadata } from "@/utilities/base64-converter/metadata";
import { metadata as mediaConverterMetadata } from "@/utilities/media-converter/metadata";
import { metadata as mediaDownloaderMetadata } from "@/utilities/media-downloader/metadata";
import { metadata as pdfMergerMetadata } from "@/utilities/pdf-merger/metadata";
import type { UtilityDefinition } from "@/utilities/types";

export const utilities = [mediaConverterMetadata, mediaDownloaderMetadata, pdfMergerMetadata, base64ConverterMetadata] as const satisfies readonly UtilityDefinition[];

export type UtilitySlug = (typeof utilities)[number]["slug"];

export function getUtility(slug: string) {
  return utilities.find((utility) => utility.slug === slug);
}
