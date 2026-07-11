import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { inspectPdfFiles, mergePdfFiles } from "./service.ts";
import type { PdfSourceFile } from "./types.ts";

test("PDF inspection reports source labels and page counts", async () => {
  const files = await createSourceFiles();
  const result = await inspectPdfFiles(files);

  assert.deepEqual(result, {
    ok: true,
    documents: [
      { fileIndex: 0, fileName: "alpha.pdf", label: "A", pageCount: 2 },
      { fileIndex: 1, fileName: "beta.pdf", label: "B", pageCount: 1 }
    ]
  });
});

test("PDF merge follows the requested page order and sanitizes the output name", async () => {
  const files = await createSourceFiles();
  const result = await mergePdfFiles({
    files,
    order: [
      { fileIndex: 1, pageIndex: 0 },
      { fileIndex: 0, pageIndex: 1 }
    ],
    outputName: "  Quarterly / report  "
  });

  assert.equal(result.ok, true);
  assert.equal(result.fileName, "Quarterly-report.pdf");
  assert.equal(result.pageCount, 2);

  const merged = await PDFDocument.load(result.bytes);
  assert.deepEqual(
    merged.getPages().map((page) => page.getWidth()),
    [333, 222]
  );
});

test("PDF merge rejects empty and out-of-range page orders", async () => {
  const files = await createSourceFiles();
  const emptyOrder = await mergePdfFiles({ files, order: [] });
  const missingFile = await mergePdfFiles({
    files,
    order: [{ fileIndex: 3, pageIndex: 0 }]
  });
  const missingPage = await mergePdfFiles({
    files,
    order: [{ fileIndex: 0, pageIndex: 9 }]
  });

  assert.equal(emptyOrder.ok, false);
  assert.equal(emptyOrder.status, 400);
  assert.equal(missingFile.ok, false);
  assert.equal(missingFile.status, 400);
  assert.equal(missingPage.ok, false);
  assert.equal(missingPage.status, 400);
});

test("PDF merge falls back to merged.pdf when the output name has no safe characters", async () => {
  const files = await createSourceFiles();
  const result = await mergePdfFiles({
    files,
    order: [{ fileIndex: 0, pageIndex: 0 }],
    outputName: "///"
  });

  assert.equal(result.ok, true);
  assert.equal(result.fileName, "merged.pdf");
});

async function createSourceFiles(): Promise<PdfSourceFile[]> {
  return [
    {
      fileName: "alpha.pdf",
      bytes: await createPdf([111, 222])
    },
    {
      fileName: "beta.pdf",
      bytes: await createPdf([333])
    }
  ];
}

async function createPdf(pageWidths: number[]) {
  const document = await PDFDocument.create();

  for (const width of pageWidths) {
    document.addPage([width, 400]);
  }

  return document.save();
}
