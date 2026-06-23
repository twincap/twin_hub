export type BackendUtilityInput = {
  slug: string;
  utility: Record<string, unknown>;
};

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

export async function getUtilityBackendPayload(input: BackendUtilityInput): Promise<BackendUtilityPayload | null> {
  switch (input.slug) {
    case "media-converter":
      return getMediaConverterPayload();
    case "media-downloader":
      return getMediaDownloaderPayload();
    case "pdf-merger":
      return getPdfMergerPayload();
    default:
      return null;
  }
}
