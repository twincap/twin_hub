import { canUseLocalDesktopPaths } from "@twin-hub/backend/lib/runtime";

const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function isSameOriginMutation(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function canUseLocalFileAccess(request: Request) {
  if (!canUseLocalDesktopPaths() || !isSameOriginMutation(request)) {
    return false;
  }

  try {
    return loopbackHosts.has(new URL(request.url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function getLocalOutputDir(request: Request, value: FormDataEntryValue | unknown) {
  if (!canUseLocalFileAccess(request) || typeof value !== "string") {
    return undefined;
  }

  const outputDir = value.trim();

  return outputDir || undefined;
}
