const cobaltHandoffBaseUrl = "https://cobalt.tools/#";

export function buildCobaltHandoffUrl(url: string) {
  return `${cobaltHandoffBaseUrl}${encodeURIComponent(url)}`;
}

export function parseMediaSourceUrls(value: string) {
  const candidates = value
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);

  if (candidates.length === 0) {
    throw new Error("다운로드할 URL을 입력하세요.");
  }

  return candidates.map((candidate) => {
    let parsed: URL;

    try {
      parsed = new URL(candidate);
    } catch {
      throw new Error(`올바른 URL이 아닙니다: ${candidate}`);
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error(`HTTP 또는 HTTPS URL만 사용할 수 있습니다: ${candidate}`);
    }

    return parsed.toString();
  });
}
