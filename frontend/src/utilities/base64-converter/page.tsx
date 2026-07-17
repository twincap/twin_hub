"use client";

import { ArrowLeftRight, ArrowRight, Check, Copy, Eraser, LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";
import { decodeBase64, encodeBase64 } from "@/utilities/base64-converter/codec";

type ConversionMode = "encode" | "decode";

const modeCopy: Record<
  ConversionMode,
  {
    action: string;
    inputLabel: string;
    inputPlaceholder: string;
    outputLabel: string;
    outputPlaceholder: string;
  }
> = {
  encode: {
    action: "Base64로 인코딩",
    inputLabel: "원문 텍스트",
    inputPlaceholder: "Base64로 인코딩할 텍스트를 입력하세요.",
    outputLabel: "Base64 결과",
    outputPlaceholder: "인코딩 결과가 여기에 표시됩니다."
  },
  decode: {
    action: "Base64 디코딩",
    inputLabel: "Base64 입력",
    inputPlaceholder: "디코딩할 Base64 문자열을 붙여넣으세요.",
    outputLabel: "디코딩 결과",
    outputPlaceholder: "UTF-8 텍스트 결과가 여기에 표시됩니다."
  }
};

export default function Base64ConverterUtility() {
  const [mode, setMode] = useState<ConversionMode>("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const copy = modeCopy[mode];
  const inputDetails = useMemo(() => getTextDetails(input, mode === "encode"), [input, mode]);
  const outputDetails = useMemo(() => getTextDetails(output, mode === "decode"), [mode, output]);

  function changeMode(nextMode: ConversionMode) {
    if (nextMode === mode) {
      return;
    }

    setMode(nextMode);
    setOutput("");
    setError("");
    setCopied(false);
    setStatusMessage("");
  }

  function changeInput(value: string) {
    setInput(value);
    setOutput("");
    setError("");
    setCopied(false);
    setStatusMessage("");
  }

  function clearAll() {
    setInput("");
    setOutput("");
    setError("");
    setCopied(false);
    setStatusMessage("");
  }

  function convert() {
    if (input.length === 0) {
      return;
    }

    try {
      setOutput(mode === "encode" ? encodeBase64(input) : decodeBase64(input));
      setError("");
      setCopied(false);
      setStatusMessage(mode === "encode" ? "인코딩이 완료되었습니다. Base64 결과를 확인하세요." : "디코딩이 완료되었습니다. UTF-8 결과를 확인하세요.");
    } catch (conversionError) {
      setOutput("");
      setCopied(false);
      setStatusMessage("");
      setError(conversionError instanceof Error ? conversionError.message : "Base64 변환에 실패했습니다.");
    }
  }

  function reverseConversion() {
    if (!output) {
      return;
    }

    setInput(output);
    setOutput("");
    setMode((current) => (current === "encode" ? "decode" : "encode"));
    setError("");
    setCopied(false);
    setStatusMessage("결과를 입력으로 옮기고 변환 방향을 바꿨습니다.");
  }

  async function copyOutput() {
    if (!output) {
      return;
    }

    try {
      await writeClipboard(output);
      setCopied(true);
      setError("");
      setStatusMessage("결과를 클립보드에 복사했습니다.");
    } catch {
      setCopied(false);
      setStatusMessage("");
      setError("결과를 클립보드에 복사하지 못했습니다.");
    }
  }

  return (
    <div className="utility-surface base64-utility">
      <div className="base64-toolbar">
        <div className="segmented-actions" role="group" aria-label="Base64 변환 방식">
          <button className={mode === "encode" ? "active" : ""} onClick={() => changeMode("encode")} type="button" aria-pressed={mode === "encode"}>
            인코딩
          </button>
          <button className={mode === "decode" ? "active" : ""} onClick={() => changeMode("decode")} type="button" aria-pressed={mode === "decode"}>
            디코딩
          </button>
        </div>
        <span className="runtime-pill">
          <LockKeyhole size={13} aria-hidden="true" />
          브라우저에서 처리
        </span>
      </div>

      <form
        className="base64-form"
        onSubmit={(event) => {
          event.preventDefault();
          convert();
        }}
      >
        <div className="base64-editor-grid">
          <div className="base64-editor">
            <div className="base64-field-head">
              <label htmlFor="base64-input">{copy.inputLabel}</label>
              <span>{inputDetails}</span>
            </div>
            <textarea
              id="base64-input"
              value={input}
              onChange={(event) => changeInput(event.target.value)}
              placeholder={copy.inputPlaceholder}
              spellCheck={false}
            />
          </div>

          <div className="base64-direction" aria-hidden="true">
            <ArrowRight size={20} />
          </div>

          <div className="base64-editor">
            <div className="base64-field-head">
              <label htmlFor="base64-output">{copy.outputLabel}</label>
              <span>{outputDetails}</span>
            </div>
            <textarea id="base64-output" value={output} placeholder={copy.outputPlaceholder} readOnly spellCheck={false} />
          </div>
        </div>

        {error ? <div className="error-box" role="alert">{error}</div> : null}

        <div className="base64-actions">
          <button className="button" disabled={!input && !output} onClick={clearAll} type="button">
            <Eraser size={16} aria-hidden="true" />
            모두 지우기
          </button>
          <div className="inline-actions">
            <button className="button" disabled={!output} onClick={reverseConversion} type="button">
              <ArrowLeftRight size={16} aria-hidden="true" />
              반대로 변환
            </button>
            <button className="button" disabled={!output} onClick={() => void copyOutput()} type="button">
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copied ? "복사 완료" : "결과 복사"}
            </button>
            <button className="button primary" disabled={input.length === 0} type="submit">
              <ArrowRight size={16} aria-hidden="true" />
              {copy.action}
            </button>
          </div>
        </div>
      </form>

      <div className="notice-box base64-notice" role="status" aria-live="polite">
        {statusMessage || "입력은 서버로 전송되지 않습니다. 디코딩할 때 줄바꿈·공백, 생략된 패딩과 Base64URL 형식도 자동으로 인식합니다."}
      </div>
    </div>
  );
}

function getTextDetails(value: string, includeBytes: boolean) {
  const characters = Array.from(value).length;

  if (!includeBytes) {
    return `${characters.toLocaleString("ko-KR")}자`;
  }

  const bytes = new TextEncoder().encode(value).length;

  return `${characters.toLocaleString("ko-KR")}자 · ${bytes.toLocaleString("ko-KR")}바이트`;
}

async function writeClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Clipboard permissions vary by browser, so fall back to a selected textarea.
    }
  }

  const textarea = document.createElement("textarea");
  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.opacity = "0";
  document.body.append(textarea);

  let copied = false;

  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, value.length);
    copied = document.execCommand("copy");
  } finally {
    textarea.remove();
    activeElement?.focus();
  }

  if (!copied) {
    throw new Error("Clipboard copy failed");
  }
}
