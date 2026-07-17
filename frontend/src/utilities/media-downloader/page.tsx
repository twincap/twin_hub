"use client";

import { ExternalLink, FilePlus2, Link2 } from "lucide-react";
import { useState } from "react";
import { buildCobaltHandoffUrl, parseMediaSourceUrls } from "@/utilities/media-downloader/cobalt-url";

type QueueItem = {
  localId: string;
  url: string;
  handoffUrl: string;
};

export default function MediaDownloaderUtility() {
  const [urls, setUrls] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      const sourceUrls = parseMediaSourceUrls(urls);
      const items = sourceUrls.map((url) => ({
        localId: crypto.randomUUID(),
        url,
        handoffUrl: buildCobaltHandoffUrl(url)
      }));

      setQueue((current) => [...items, ...current]);
      setUrls("");
    } catch (urlError) {
      setError(urlError instanceof Error ? urlError.message : "미디어 URL을 확인하세요.");
    }
  }

  return (
    <div className="utility-surface">
      <form className="download-form" onSubmit={handleSubmit}>
        <label className="field form-span">
          <span>URL</span>
          <textarea
            value={urls}
            onChange={(event) => setUrls(event.target.value)}
            placeholder="한 줄에 URL 하나"
            required
          />
        </label>

        <div className="notice-box form-span" role="status">
          서버 없이 사용할 수 있도록 Cobalt 웹으로 안전하게 연결합니다. 링크를 만든 뒤 각 항목의 다운로드 버튼을
          누르면 URL이 자동 입력되고 처리가 시작됩니다. 파일 형식과 품질은 열린 화면에서 선택하세요.
        </div>

        <button className="button primary form-span" disabled={!urls.trim()} type="submit">
          <FilePlus2 size={16} aria-hidden="true" />
          다운로드 링크 만들기
        </button>
      </form>

      {error ? <div className="error-box" role="alert">{error}</div> : null}

      <section className="job-panel" aria-label="다운로드 링크" aria-live="polite">
        <div className="job-head">
          <div>
            <Link2 size={16} aria-hidden="true" />
            <strong>다운로드 링크</strong>
          </div>
          <span className="runtime-pill">{queue.length}개</span>
        </div>

        <div className="queue-list">
          {queue.length === 0 ? <div className="empty-state">등록된 URL이 없습니다.</div> : null}
          {queue.map((item) => (
            <div className="queue-item" key={item.localId}>
              <div className="queue-title">
                <strong>{item.url}</strong>
                <span className="runtime-pill">준비됨</span>
              </div>
              <a className="button primary" href={item.handoffUrl} rel="noopener noreferrer" target="_blank">
                <ExternalLink size={16} aria-hidden="true" />
                Cobalt에서 다운로드
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
