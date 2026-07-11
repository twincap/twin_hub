export type BackendUtilityPayload = {
  utility?: Record<string, unknown>;
  backend?: boolean;
  source: string;
  timestamp: string;
  [key: string]: unknown;
};

import { getMediaDownloaderPayload } from "./media-downloader";
import { getMediaConverterPayload } from "./media-converter";
import { getPdfMergerPayload } from "./pdf-merger";

const utilityPayloadHandlers: Record<string, () => BackendUtilityPayload> = {
  "media-converter": getMediaConverterPayload,
  "media-downloader": getMediaDownloaderPayload,
  "pdf-merger": getPdfMergerPayload
};

export async function getUtilityBackendPayload(slug: string): Promise<BackendUtilityPayload | null> {
  return utilityPayloadHandlers[slug]?.() ?? null;
}
