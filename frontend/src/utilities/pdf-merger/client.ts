import { PDFDocument } from "pdf-lib";

export const PDF_MERGER_MAX_MB = 512;
export const PDF_MERGER_MAX_BYTES = PDF_MERGER_MAX_MB * 1024 * 1024;

export type PdfFileInput = {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
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

export function validatePdfFiles(files: readonly PdfFileInput[]) {
  if (files.length === 0) {
    throw new Error("PDF 파일을 하나 이상 업로드하세요.");
  }

  let totalBytes = 0;

  for (const file of files) {
    if (!isPdfFile(file)) {
      throw new Error(`${file.name || "업로드 파일"}은 PDF가 아닙니다.`);
    }

    if (file.size === 0) {
      throw new Error(`${file.name || "업로드 파일"} 파일이 비어 있습니다.`);
    }

    totalBytes += file.size;

    if (totalBytes > PDF_MERGER_MAX_BYTES) {
      throw new Error(`PDF 파일 합계가 너무 큽니다. 최대 ${PDF_MERGER_MAX_MB}MB까지 가능합니다.`);
    }
  }
}

export async function inspectPdfFiles(files: readonly PdfFileInput[]): Promise<PdfDocumentInfo[]> {
  validatePdfFiles(files);

  return Promise.all(
    files.map(async (file, fileIndex) => {
      try {
        const document = await PDFDocument.load(await file.arrayBuffer());

        return {
          fileIndex,
          fileName: file.name || `document-${fileIndex + 1}.pdf`,
          label: indexToLabel(fileIndex),
          pageCount: document.getPageCount()
        };
      } catch {
        throw new Error(`${file.name || "업로드 파일"} 파일을 읽지 못했습니다.`);
      }
    })
  );
}

export async function mergePdfFiles(files: readonly PdfFileInput[], order: readonly PdfPageRef[], outputName?: string) {
  validatePdfFiles(files);

  if (order.length === 0) {
    throw new Error("병합할 페이지 순서가 비어 있습니다.");
  }

  let sourceDocuments: PDFDocument[];

  try {
    sourceDocuments = await Promise.all(files.map(async (file) => PDFDocument.load(await file.arrayBuffer())));
  } catch {
    throw new Error("PDF 파일을 읽지 못했습니다.");
  }

  const outputDocument = await PDFDocument.create();

  for (const pageRef of order) {
    validatePageRef(pageRef, sourceDocuments);

    const sourceDocument = sourceDocuments[pageRef.fileIndex];
    const [copiedPage] = await outputDocument.copyPages(sourceDocument, [pageRef.pageIndex]);

    outputDocument.addPage(copiedPage);
  }

  const bytes = await outputDocument.save();

  return {
    bytes,
    fileName: buildOutputName(outputName),
    pageCount: outputDocument.getPageCount()
  };
}

function validatePageRef(pageRef: PdfPageRef, sourceDocuments: PDFDocument[]) {
  if (!Number.isInteger(pageRef.fileIndex) || !Number.isInteger(pageRef.pageIndex)) {
    throw new Error("페이지 순서 값이 올바르지 않습니다.");
  }

  const sourceDocument = sourceDocuments[pageRef.fileIndex];

  if (!sourceDocument) {
    throw new Error("존재하지 않는 PDF 파일의 페이지가 포함되어 있습니다.");
  }

  if (pageRef.pageIndex < 0 || pageRef.pageIndex >= sourceDocument.getPageCount()) {
    throw new Error("존재하지 않는 PDF 페이지가 포함되어 있습니다.");
  }
}

function buildOutputName(outputName: string | undefined) {
  const cleaned = (outputName || "merged")
    .trim()
    .replace(/[^\w .-]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-. ]+|[-. ]+$/g, "");
  const base = cleaned || "merged";

  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

function isPdfFile(file: Pick<PdfFileInput, "name" | "type">) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function indexToLabel(index: number) {
  let value = index + 1;
  let label = "";

  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }

  return label;
}
