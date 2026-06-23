import { getPdfMergerInfo, inspectPdfFiles, mergePdfFiles } from "./service";
import type { PdfMergeRequest, PdfSourceFile } from "./types";

export function getPdfMergerPayload() {
  return getPdfMergerInfo();
}

export function inspectPdfPayload(files: PdfSourceFile[]) {
  return inspectPdfFiles(files);
}

export function mergePdfPayload(input: PdfMergeRequest) {
  return mergePdfFiles(input);
}

export type { PdfDocumentInfo, PdfMergeRequest, PdfPageRef, PdfSourceFile } from "./types";
