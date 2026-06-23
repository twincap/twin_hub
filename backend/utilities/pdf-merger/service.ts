import { PDFDocument } from "pdf-lib";
import type { PdfDocumentInfo, PdfMergeRequest, PdfMergerConfig, PdfPageRef, PdfSourceFile } from "./types";

export function getPdfMergerConfig(): PdfMergerConfig {
  return {
    maxUploadMb: Number(process.env.PDF_MERGER_MAX_MB ?? 512)
  };
}

export function getPdfMergerInfo() {
  const config = getPdfMergerConfig();

  return {
    maxUploadMb: config.maxUploadMb,
    requires: ["pdf-lib"],
    source: "backend/utilities/pdf-merger",
    timestamp: new Date().toISOString()
  };
}

export async function inspectPdfFiles(files: PdfSourceFile[]) {
  const validation = validateFiles(files);

  if (!validation.ok) {
    return validation;
  }

  try {
    const documents = await Promise.all(
      files.map(async (file, fileIndex) => {
        const document = await PDFDocument.load(file.bytes);

        return {
          fileIndex,
          fileName: file.fileName,
          label: indexToLabel(fileIndex),
          pageCount: document.getPageCount()
        };
      })
    );

    return {
      ok: true as const,
      documents
    };
  } catch (error) {
    return {
      ok: false as const,
      status: 400,
      error: error instanceof Error ? error.message : "PDF 파일을 읽지 못했습니다."
    };
  }
}

export async function mergePdfFiles(input: PdfMergeRequest) {
  const validation = validateFiles(input.files);

  if (!validation.ok) {
    return validation;
  }

  if (input.order.length === 0) {
    return {
      ok: false as const,
      status: 400,
      error: "병합할 페이지 순서가 비어 있습니다."
    };
  }

  try {
    const sourceDocuments = await Promise.all(input.files.map((file) => PDFDocument.load(file.bytes)));
    const outputDocument = await PDFDocument.create();

    for (const pageRef of input.order) {
      const pageValidation = validatePageRef(pageRef, sourceDocuments);

      if (!pageValidation.ok) {
        return pageValidation;
      }

      const sourceDocument = sourceDocuments[pageRef.fileIndex];
      const [copiedPage] = await outputDocument.copyPages(sourceDocument, [pageRef.pageIndex]);

      outputDocument.addPage(copiedPage);
    }

    const bytes = await outputDocument.save();

    return {
      ok: true as const,
      bytes,
      fileName: buildOutputName(input.outputName),
      pageCount: outputDocument.getPageCount()
    };
  } catch (error) {
    return {
      ok: false as const,
      status: 400,
      error: error instanceof Error ? error.message : "PDF 병합에 실패했습니다."
    };
  }
}

function validateFiles(files: PdfSourceFile[]) {
  if (files.length === 0) {
    return {
      ok: false as const,
      status: 400,
      error: "PDF 파일을 하나 이상 업로드하세요."
    };
  }

  for (const file of files) {
    if (file.bytes.length === 0) {
      return {
        ok: false as const,
        status: 400,
        error: `${file.fileName} 파일이 비어 있습니다.`
      };
    }
  }

  return {
    ok: true as const
  };
}

function validatePageRef(pageRef: PdfPageRef, sourceDocuments: PDFDocument[]) {
  if (!Number.isInteger(pageRef.fileIndex) || !Number.isInteger(pageRef.pageIndex)) {
    return {
      ok: false as const,
      status: 400,
      error: "페이지 순서 값이 올바르지 않습니다."
    };
  }

  const sourceDocument = sourceDocuments[pageRef.fileIndex];

  if (!sourceDocument) {
    return {
      ok: false as const,
      status: 400,
      error: "존재하지 않는 PDF 파일의 페이지가 포함되어 있습니다."
    };
  }

  if (pageRef.pageIndex < 0 || pageRef.pageIndex >= sourceDocument.getPageCount()) {
    return {
      ok: false as const,
      status: 400,
      error: "존재하지 않는 PDF 페이지가 포함되어 있습니다."
    };
  }

  return {
    ok: true as const
  };
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
