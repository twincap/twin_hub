export type PdfSourceFile = {
  fileName: string;
  bytes: Uint8Array;
};

export type PdfDocumentInfo = {
  fileIndex: number;
  fileName: string;
  label: string;
  pageCount: number;
};

export type PdfPageRef = {
  fileIndex: number;
  pageIndex: number;
};

export type PdfMergeRequest = {
  files: PdfSourceFile[];
  order: PdfPageRef[];
  outputName?: string;
};

export type PdfMergerConfig = {
  maxUploadMb: number;
};
