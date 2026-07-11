import { NextResponse } from "next/server";
import { getPdfMergerPayload, inspectPdfPayload, mergePdfPayload } from "@twin-hub/backend/utilities/pdf-merger";
import type { PdfPageRef, PdfSourceFile } from "@twin-hub/backend/utilities/pdf-merger";
import { isSameOriginMutation } from "@/server/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getPdfMergerPayload());
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      {
        error: "Cross-origin requests are not allowed."
      },
      {
        status: 403
      }
    );
  }

  const info = getPdfMergerPayload();
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error: "A multipart form body is required."
      },
      {
        status: 400
      }
    );
  }

  const action = String(formData.get("action") ?? "inspect");
  const files = await readPdfFiles(formData, info.maxUploadMb);

  if (!files.ok) {
    return NextResponse.json(
      {
        error: files.error
      },
      {
        status: files.status
      }
    );
  }

  if (action === "inspect") {
    const result = await inspectPdfPayload(files.files);

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error
        },
        {
          status: result.status
        }
      );
    }

    return NextResponse.json({
      documents: result.documents
    });
  }

  if (action === "merge") {
    const order = parseOrder(formData.get("order"));
    const outputName = formData.get("outputName") ? String(formData.get("outputName")) : undefined;

    if (!order.ok) {
      return NextResponse.json(
        {
          error: order.error
        },
        {
          status: order.status
        }
      );
    }

    const result = await mergePdfPayload({
      files: files.files,
      order: order.order,
      outputName
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error
        },
        {
          status: result.status
        }
      );
    }

    const responseBody = result.bytes.buffer.slice(result.bytes.byteOffset, result.bytes.byteOffset + result.bytes.byteLength) as ArrayBuffer;

    return new Response(responseBody, {
      headers: {
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`,
        "Content-Length": String(result.bytes.length),
        "Content-Type": "application/pdf",
        "X-Merged-Page-Count": String(result.pageCount)
      }
    });
  }

  return NextResponse.json(
    {
      error: "Unknown PDF merger action."
    },
    {
      status: 400
    }
  );
}

async function readPdfFiles(formData: FormData, maxUploadMb: number) {
  const uploadedFiles = formData.getAll("files");
  const files: PdfSourceFile[] = [];
  let totalBytes = 0;

  for (const item of uploadedFiles) {
    if (!(item instanceof File)) {
      continue;
    }

    if (!isPdfFile(item)) {
      return {
        ok: false as const,
        status: 400,
        error: `${item.name || "업로드 파일"}은 PDF가 아닙니다.`
      };
    }

    totalBytes += item.size;

    if (totalBytes > maxUploadMb * 1024 * 1024) {
      return {
        ok: false as const,
        status: 413,
        error: `PDF 파일 합계가 너무 큽니다. 최대 ${maxUploadMb}MB까지 가능합니다.`
      };
    }

    files.push({
      fileName: item.name || `document-${files.length + 1}.pdf`,
      bytes: new Uint8Array(await item.arrayBuffer())
    });
  }

  if (files.length === 0) {
    return {
      ok: false as const,
      status: 400,
      error: "PDF 파일을 하나 이상 업로드하세요."
    };
  }

  return {
    ok: true as const,
    files
  };
}

function parseOrder(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return {
      ok: false as const,
      status: 400,
      error: "페이지 순서가 필요합니다."
    };
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error("Order must be an array.");
    }

    const order: PdfPageRef[] = parsed.map((item) => {
      const pageRef = item as Partial<PdfPageRef>;

      return {
        fileIndex: Number(pageRef.fileIndex),
        pageIndex: Number(pageRef.pageIndex)
      };
    });

    return {
      ok: true as const,
      order
    };
  } catch {
    return {
      ok: false as const,
      status: 400,
      error: "페이지 순서 JSON을 읽지 못했습니다."
    };
  }
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
