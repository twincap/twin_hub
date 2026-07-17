const ASCII_WHITESPACE = /[\t\n\f\r ]/g;
const STANDARD_ALPHABET_MARKER = /[+/]/;
const URL_SAFE_ALPHABET_MARKER = /[-_]/;
const BASE64_STRUCTURE = /^[A-Za-z0-9+/]*={0,2}$/;
const BINARY_CHUNK_SIZE = 0x8000;

export function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += BINARY_CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, offset + BINARY_CHUNK_SIZE);

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function decodeBase64(value: string) {
  const normalized = normalizeBase64(value);

  if (!normalized) {
    return "";
  }

  let binary: string;

  try {
    binary = atob(normalized);
  } catch {
    throw invalidBase64Error();
  }

  if (btoa(binary) !== normalized) {
    throw invalidBase64Error();
  }

  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new Error("디코딩한 데이터가 올바른 UTF-8 텍스트가 아닙니다.");
  }
}

function normalizeBase64(value: string) {
  const compact = value.replace(ASCII_WHITESPACE, "");
  const hasStandardAlphabet = STANDARD_ALPHABET_MARKER.test(compact);
  const hasUrlSafeAlphabet = URL_SAFE_ALPHABET_MARKER.test(compact);

  if (hasStandardAlphabet && hasUrlSafeAlphabet) {
    throw invalidBase64Error();
  }

  const standard = compact.replace(/-/g, "+").replace(/_/g, "/");

  if (!BASE64_STRUCTURE.test(standard)) {
    throw invalidBase64Error();
  }

  const hasPadding = standard.includes("=");

  if ((hasPadding && standard.length % 4 !== 0) || (!hasPadding && standard.length % 4 === 1)) {
    throw invalidBase64Error();
  }

  if (hasPadding || standard.length === 0) {
    return standard;
  }

  return standard.padEnd(standard.length + ((4 - (standard.length % 4)) % 4), "=");
}

function invalidBase64Error() {
  return new Error("올바른 Base64 형식이 아닙니다.");
}
