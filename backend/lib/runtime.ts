import os from "node:os";
import path from "node:path";

const hostedRuntimeKeys = [
  "VERCEL",
  "NETLIFY",
  "RENDER",
  "RAILWAY_ENVIRONMENT",
  "FLY_APP_NAME",
  "AWS_LAMBDA_FUNCTION_NAME"
] as const;

export function isHostedRuntime() {
  return hostedRuntimeKeys.some((key) => Boolean(process.env[key]));
}

export function canUseLocalDesktopPaths() {
  return process.platform === "win32" && !isHostedRuntime();
}

export function getDefaultUtilityOutputDir(folderName: string) {
  if (canUseLocalDesktopPaths()) {
    return path.join(os.homedir(), "Downloads");
  }

  return path.join(os.tmpdir(), "twin-hub", folderName);
}
