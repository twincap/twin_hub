import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import { canUseLocalFileAccess } from "@/server/request-security";

type FolderPickerResult = {
  path?: string;
  cancelled?: boolean;
};

export async function POST(request: Request) {
  if (!canUseLocalFileAccess(request)) {
    return NextResponse.json(
      {
        error: "폴더 선택은 Windows 로컬 실행에서만 사용할 수 있습니다."
      },
      {
        status: 403
      }
    );
  }

  const initialDir = await readInitialDir(request);

  try {
    return NextResponse.json(await pickFolder(initialDir));
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "폴더를 선택하지 못했습니다."
      },
      {
        status: 500
      }
    );
  }
}

async function readInitialDir(request: Request) {
  try {
    const body = (await request.json()) as { initialDir?: unknown };

    return typeof body.initialDir === "string" ? body.initialDir.slice(0, 4096) : "";
  } catch {
    return "";
  }
}

function pickFolder(initialDir: string) {
  const script = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Select save folder'
$dialog.ShowNewFolderButton = $true
$initial = [Environment]::GetEnvironmentVariable('TWIN_HUB_INITIAL_DIR')
if ($initial -and (Test-Path -LiteralPath $initial -PathType Container)) {
  $dialog.SelectedPath = (Resolve-Path -LiteralPath $initial).Path
}
$owner = New-Object System.Windows.Forms.Form
$owner.StartPosition = 'CenterScreen'
$owner.ShowInTaskbar = $false
$owner.TopMost = $true
$owner.Size = New-Object System.Drawing.Size(1, 1)
$owner.Add_Shown({ $owner.Hide() })
$owner.Show()
$owner.Activate()
$result = $dialog.ShowDialog($owner)
$owner.Dispose()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  [Console]::Out.Write($dialog.SelectedPath)
  exit 0
}
exit 2
`;

  return new Promise<FolderPickerResult>((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-Sta", "-ExecutionPolicy", "Bypass", "-Command", script], {
      env: {
        ...process.env,
        TWIN_HUB_INITIAL_DIR: initialDir
      },
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const selectedPath = stdout.trim();

      if (code === 0 && selectedPath) {
        resolve({
          path: selectedPath
        });
        return;
      }

      if (code === 2) {
        resolve({
          cancelled: true
        });
        return;
      }

      reject(new Error(stderr.trim() || `Folder picker exited with code ${code ?? "unknown"}.`));
    });
  });
}
