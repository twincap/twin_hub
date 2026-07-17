import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import {
  inspectPdfFiles,
  mergePdfFiles,
  PDF_MERGER_MAX_BYTES,
  type PdfFileInput
} from "./client.ts";

test("client PDF inspection reports labels and page counts", async () => {
  const files = [await createPdfFile("alpha.pdf", [[100, 200], [200, 300]]), await createPdfFile("beta.pdf", [[300, 400]])];

  assert.deepEqual(await inspectPdfFiles(files), [
    { fileIndex: 0, fileName: "alpha.pdf", label: "A", pageCount: 2 },
    { fileIndex: 1, fileName: "beta.pdf", label: "B", pageCount: 1 }
  ]);
});

test("client PDF merge follows page order and creates a safe file name", async () => {
  const files = [await createPdfFile("alpha.pdf", [[100, 200], [200, 300]]), await createPdfFile("beta.pdf", [[300, 400]])];
  const result = await mergePdfFiles(
    files,
    [
      { fileIndex: 1, pageIndex: 0 },
      { fileIndex: 0, pageIndex: 1 },
      { fileIndex: 0, pageIndex: 0 }
    ],
    "  final report  "
  );
  const merged = await PDFDocument.load(result.bytes);

  assert.equal(result.fileName, "final-report.pdf");
  assert.equal(result.pageCount, 3);
  assert.deepEqual(
    merged.getPages().map((page) => [page.getWidth(), page.getHeight()]),
    [[300, 400], [200, 300], [100, 200]]
  );
});

test("client PDF validation rejects non-PDF, oversized, and invalid page inputs", async () => {
  const textFile = makeFile("notes.txt", "text/plain", new Uint8Array([1]));
  const oversizedFile: PdfFileInput = {
    name: "large.pdf",
    size: PDF_MERGER_MAX_BYTES + 1,
    type: "application/pdf",
    async arrayBuffer() {
      throw new Error("oversized files must be rejected before reading");
    }
  };
  const validFile = await createPdfFile("valid.pdf", [[100, 100]]);

  await assert.rejects(() => inspectPdfFiles([textFile]), /PDF가 아닙니다/);
  await assert.rejects(() => inspectPdfFiles([oversizedFile]), /최대 512MB/);
  await assert.rejects(() => mergePdfFiles([validFile], [{ fileIndex: 0, pageIndex: 1 }]), /존재하지 않는 PDF 페이지/);
});

async function createPdfFile(name: string, pageSizes: Array<[number, number]>) {
  const document = await PDFDocument.create();

  pageSizes.forEach((size) => document.addPage(size));

  return makeFile(name, "application/pdf", await document.save());
}

function makeFile(name: string, type: string, bytes: Uint8Array): PdfFileInput {
  return {
    name,
    size: bytes.byteLength,
    type,
    async arrayBuffer() {
      return bytes.slice().buffer;
    }
  };
}
