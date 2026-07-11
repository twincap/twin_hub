"use client";

import { ArrowDown, ArrowUp, Download, FileStack, GripVertical, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { moveArrayItem, moveItemToTarget } from "@/utilities/pdf-merger/ordering";

type PdfDocumentInfo = {
  fileIndex: number;
  fileName: string;
  label: string;
  pageCount: number;
};

type PageItem = {
  id: string;
  fileIndex: number;
  pageIndex: number;
  fileName: string;
  fileLabel: string;
};

type InfoResponse = {
  maxUploadMb: number;
  error?: string;
};

type InspectResponse = {
  documents?: PdfDocumentInfo[];
  error?: string;
};

type ThumbnailMap = Record<string, string>;

export default function PdfMergerUtility() {
  const [maxUploadMb, setMaxUploadMb] = useState(512);
  const [files, setFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<PdfDocumentInfo[]>([]);
  const [order, setOrder] = useState<PageItem[]>([]);
  const [thumbnails, setThumbnails] = useState<ThumbnailMap>({});
  const [outputName, setOutputName] = useState("merged.pdf");
  const [draggingId, setDraggingId] = useState("");
  const [dragOverId, setDragOverId] = useState("");
  const [error, setError] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [renderingPreviews, setRenderingPreviews] = useState(false);
  const [merging, setMerging] = useState(false);
  const pageListRef = useRef<HTMLDivElement>(null);
  const previewRunRef = useRef(0);

  const sequenceText = useMemo(() => order.map(formatPageItem).join(" "), [order]);
  const pageCount = order.length;

  useEffect(() => {
    async function loadInfo() {
      const response = await fetch("/api/pdf-merger");
      const payload = (await response.json()) as InfoResponse;

      setMaxUploadMb(payload.maxUploadMb ?? 512);

      if (payload.error) {
        setError(payload.error);
      }
    }

    loadInfo().catch((infoError) => {
      setError(infoError instanceof Error ? infoError.message : "PDF 병합기 설정을 불러오지 못했습니다.");
    });
  }, []);

  async function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);

    event.currentTarget.value = "";

    if (selectedFiles.length === 0) {
      return;
    }

    await applyFiles([...files, ...selectedFiles]);
  }

  async function applyFiles(nextFiles: File[]) {
    previewRunRef.current += 1;
    setFiles(nextFiles);
    setDocuments([]);
    setOrder([]);
    setThumbnails({});
    setDragOverId("");
    setDraggingId("");
    setInspecting(false);
    setRenderingPreviews(false);

    if (nextFiles.length === 0) {
      return;
    }

    await inspectFiles(nextFiles);
  }

  async function removeFile(index: number) {
    await applyFiles(files.filter((_, fileIndex) => fileIndex !== index));
  }

  async function inspectFiles(nextFiles: File[]) {
    const runId = previewRunRef.current + 1;

    previewRunRef.current = runId;
    setInspecting(true);
    setRenderingPreviews(false);
    setError("");

    try {
      const formData = new FormData();

      formData.set("action", "inspect");
      nextFiles.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/pdf-merger", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as InspectResponse;

      if (!response.ok || !payload.documents) {
        throw new Error(payload.error ?? "PDF 페이지 정보를 읽지 못했습니다.");
      }

      if (previewRunRef.current !== runId) {
        return;
      }

      const nextOrder = buildPageItems(payload.documents);

      setDocuments(payload.documents);
      setOrder(nextOrder);
      setInspecting(false);
      await renderPagePreviews(nextFiles, nextOrder, runId);
    } catch (inspectError) {
      if (previewRunRef.current === runId) {
        setError(inspectError instanceof Error ? inspectError.message : "PDF 페이지 정보를 읽지 못했습니다.");
      }
    } finally {
      if (previewRunRef.current === runId) {
        setInspecting(false);
      }
    }
  }

  async function renderPagePreviews(nextFiles: File[], pageItems: PageItem[], runId: number) {
    setRenderingPreviews(true);
    setThumbnails({});

    try {
      const pdfjs = await import("pdfjs-dist");

      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();

      for (const [fileIndex, file] of nextFiles.entries()) {
        if (previewRunRef.current !== runId) {
          return;
        }

        const filePageItems = pageItems.filter((pageItem) => pageItem.fileIndex === fileIndex);

        if (filePageItems.length === 0) {
          continue;
        }

        const documentData = await file.arrayBuffer();
        const pdfDocument = await pdfjs.getDocument({
          data: documentData.slice(0)
        }).promise;

        if (previewRunRef.current !== runId) {
          return;
        }

        for (const pageItem of filePageItems) {
          if (previewRunRef.current !== runId) {
            return;
          }

          const page = await pdfDocument.getPage(pageItem.pageIndex + 1);
          const viewport = page.getViewport({ scale: 0.34 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            continue;
          }

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          await page.render({
            canvas,
            canvasContext: context,
            viewport
          }).promise;

          if (previewRunRef.current !== runId) {
            return;
          }

          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);

          setThumbnails((current) => ({
            ...current,
            [pageItem.id]: dataUrl
          }));
        }
      }
    } catch (previewError) {
      if (previewRunRef.current === runId) {
        setError(previewError instanceof Error ? previewError.message : "PDF 미리보기 이미지를 만들지 못했습니다.");
      }
    } finally {
      if (previewRunRef.current === runId) {
        setRenderingPreviews(false);
      }
    }
  }

  function movePage(index: number, offset: number) {
    reorderWithAnimation((current) => moveArrayItem(current, index, index + offset));
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleDragEnter(targetId: string) {
    if (!draggingId || draggingId === targetId || dragOverId === targetId) {
      return;
    }

    setDragOverId(targetId);
    reorderWithAnimation((current) => moveItemToTarget(current, draggingId, targetId));
  }

  function handleDrop() {
    setDraggingId("");
    setDragOverId("");
  }

  function resetOrder() {
    reorderWithAnimation(() => buildPageItems(documents));
  }

  function reorderWithAnimation(updater: (current: PageItem[]) => PageItem[]) {
    const previousRects = capturePageRects(pageListRef.current);

    setOrder((current) => updater(current));
    window.requestAnimationFrame(() => animateFromRects(pageListRef.current, previousRects));
  }

  async function handleMerge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (files.length === 0 || order.length === 0) {
      setError("병합할 PDF와 페이지 순서를 먼저 준비하세요.");
      return;
    }

    setMerging(true);
    setError("");

    try {
      const formData = new FormData();

      formData.set("action", "merge");
      formData.set("outputName", outputName);
      formData.set(
        "order",
        JSON.stringify(
          order.map((item) => ({
            fileIndex: item.fileIndex,
            pageIndex: item.pageIndex
          }))
        )
      );
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/pdf-merger", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };

        throw new Error(payload.error ?? "PDF 병합에 실패했습니다.");
      }

      const blob = await response.blob();
      const fileName = getResponseFileName(response.headers.get("Content-Disposition")) ?? ensurePdfName(outputName);

      downloadBlob(blob, fileName);
    } catch (mergeError) {
      setError(mergeError instanceof Error ? mergeError.message : "PDF 병합에 실패했습니다.");
    } finally {
      setMerging(false);
    }
  }

  return (
    <div className="utility-surface">
      <form aria-busy={inspecting || merging} className="download-form" onSubmit={handleMerge}>
        <label className="field form-span">
          <span>PDF 파일 추가</span>
          <input accept="application/pdf,.pdf" disabled={merging} multiple onChange={handleFilesChange} type="file" />
        </label>

        <div className="pdf-selected-files form-span">
          <div className="job-head">
            <div>
              <Plus size={16} aria-hidden="true" />
              <strong>선택된 PDF</strong>
            </div>
            <span className="runtime-pill">{files.length}개</span>
          </div>
          {files.length === 0 ? <div className="empty-state compact">PDF를 여러 개 추가하세요.</div> : null}
          {files.map((file, index) => (
            <div className="pdf-file-row" key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
              <span>
                {indexToLabel(index)}: {file.name}
              </span>
              <button
                aria-label={`${file.name} 삭제`}
                className="icon-button"
                disabled={inspecting || merging}
                onClick={() => void removeFile(index)}
                type="button"
                title="삭제"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <label className="field form-span">
          <span>저장 파일명</span>
          <input value={outputName} onChange={(event) => setOutputName(event.target.value)} placeholder="merged.pdf" type="text" />
        </label>

        <button className="button primary form-span" disabled={inspecting || merging || order.length === 0} type="submit">
          {merging ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
          PDF 병합
        </button>

        <span className="runtime-pill form-span">최대 업로드 {maxUploadMb}MB</span>
      </form>

      {error ? <div className="error-box" role="alert">{error}</div> : null}

      <section className="job-panel" aria-label="PDF 페이지 순서" aria-live="polite">
        <div className="job-head">
          <div>
            <FileStack size={16} aria-hidden="true" />
            <strong>페이지 순서</strong>
          </div>
          <span className="runtime-pill">{pageCount}페이지</span>
        </div>

        {documents.length > 0 ? (
          <div className="pdf-document-list">
            {documents.map((documentInfo) => (
              <span className="runtime-pill" key={`${documentInfo.fileIndex}-${documentInfo.fileName}`}>
                {documentInfo.label}: {documentInfo.fileName} · {documentInfo.pageCount}페이지
              </span>
            ))}
          </div>
        ) : null}

        <div className="pdf-sequence" role="status">
          {sequenceText || (inspecting ? "PDF 페이지를 읽는 중입니다." : "PDF를 업로드하면 페이지 순서가 여기에 표시됩니다.")}
        </div>

        <div className="inline-actions">
          <button className="button" disabled={order.length === 0 || inspecting || merging} onClick={resetOrder} type="button">
            <RefreshCw size={16} aria-hidden="true" />
            기본 순서
          </button>
          {renderingPreviews ? <span className="runtime-pill">미리보기 생성 중</span> : null}
        </div>

        <div className="pdf-page-list" ref={pageListRef}>
          {order.length === 0 ? <div className="empty-state">아직 페이지가 없습니다.</div> : null}
          {order.map((item, index) => (
            <div
              className={`pdf-page-card${draggingId === item.id ? " dragging" : ""}${dragOverId === item.id ? " drag-over" : ""}`}
              data-page-id={item.id}
              draggable
              key={item.id}
              onDragEnter={() => handleDragEnter(item.id)}
              onDragEnd={handleDrop}
              onDragOver={handleDragOver}
              onDragStart={(event) => {
                setDraggingId(item.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDrop={handleDrop}
            >
              <div className="pdf-page-thumb">
                {thumbnails[item.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={`${formatPageItem(item)} 미리보기`} src={thumbnails[item.id]} />
                ) : (
                  <div className="pdf-page-thumb-placeholder">
                    {renderingPreviews ? <Loader2 className="spin" size={18} aria-hidden="true" /> : null}
                    <span>{formatPageItem(item)}</span>
                  </div>
                )}
              </div>

              <div className="pdf-page-card-body">
                <div className="pdf-page-title">
                  <GripVertical size={16} aria-hidden="true" />
                  <strong>{formatPageItem(item)}</strong>
                  <span>{item.fileName}</span>
                </div>
                <div className="inline-actions">
                  <button
                    aria-label={`${formatPageItem(item)} 위로 이동`}
                    className="icon-button"
                    disabled={index === 0}
                    onClick={() => movePage(index, -1)}
                    type="button"
                    title="위로"
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    aria-label={`${formatPageItem(item)} 아래로 이동`}
                    className="icon-button"
                    disabled={index === order.length - 1}
                    onClick={() => movePage(index, 1)}
                    type="button"
                    title="아래로"
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function buildPageItems(documents: PdfDocumentInfo[]) {
  return documents.flatMap((documentInfo) =>
    Array.from({ length: documentInfo.pageCount }, (_, pageIndex) => ({
      id: `${documentInfo.fileIndex}-${pageIndex}`,
      fileIndex: documentInfo.fileIndex,
      pageIndex,
      fileName: documentInfo.fileName,
      fileLabel: documentInfo.label
    }))
  );
}

function formatPageItem(item: PageItem) {
  return `${item.fileLabel}${item.pageIndex + 1}`;
}

function capturePageRects(container: HTMLDivElement | null) {
  const rects = new Map<string, DOMRect>();

  container?.querySelectorAll<HTMLElement>("[data-page-id]").forEach((element) => {
    const pageId = element.dataset.pageId;

    if (pageId) {
      rects.set(pageId, element.getBoundingClientRect());
    }
  });

  return rects;
}

function animateFromRects(container: HTMLDivElement | null, previousRects: Map<string, DOMRect>) {
  container?.querySelectorAll<HTMLElement>("[data-page-id]").forEach((element) => {
    const pageId = element.dataset.pageId;
    const previousRect = pageId ? previousRects.get(pageId) : null;

    if (!previousRect) {
      return;
    }

    const nextRect = element.getBoundingClientRect();
    const deltaX = previousRect.left - nextRect.left;
    const deltaY = previousRect.top - nextRect.top;

    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
      return;
    }

    element.animate(
      [
        {
          transform: `translate(${deltaX}px, ${deltaY}px)`
        },
        {
          transform: "translate(0, 0)"
        }
      ],
      {
        duration: 190,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)"
      }
    );
  });
}

function ensurePdfName(name: string) {
  const cleaned = name.trim() || "merged.pdf";

  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

function getResponseFileName(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }

  const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);

  return match ? decodeURIComponent(match[1]) : null;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
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
