import { createWriteStream } from "node:fs";
import { chmod, mkdir, rename, rm, stat } from "node:fs/promises";
import * as https from "node:https";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { pipeline } from "node:stream/promises";
import { execFile } from "node:child_process";
import * as vscode from "vscode";
import { getSupportedZmxTarget, ZMX_DOWNLOAD_URLS, ZMX_VERSION } from "./zmx-binary-helpers";

export async function ensureZmxBinary(context: vscode.ExtensionContext): Promise<string> {
  const target = getSupportedZmxTarget(process.platform, process.arch);
  const installDirectory = path.join(context.globalStorageUri.fsPath, "zmx", ZMX_VERSION, target);
  const binaryPath = path.join(installDirectory, "zmx");

  if (await pathExists(binaryPath)) {
    return binaryPath;
  }

  await vscode.window.withProgress(
    {
      cancellable: false,
      location: vscode.ProgressLocation.Notification,
      title: "VS-AGENT-MUX is installing the zmx session backend",
    },
    async (progress) => {
      progress.report({ increment: 20, message: `Downloading zmx ${ZMX_VERSION}` });
      await mkdir(installDirectory, { recursive: true });

      const temporaryDirectory = path.join(
        tmpdir(),
        `VS-AGENT-MUX-zmx-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      );
      const archivePath = path.join(temporaryDirectory, "zmx.tar.gz");

      await mkdir(temporaryDirectory, { recursive: true });

      try {
        await downloadToFile(ZMX_DOWNLOAD_URLS[target], archivePath);
        progress.report({ increment: 55, message: "Extracting zmx" });
        await execFileAsync("/usr/bin/tar", ["-xzf", archivePath, "-C", temporaryDirectory]);
        await rename(path.join(temporaryDirectory, "zmx"), binaryPath);
        await chmod(binaryPath, 0o755);
      } finally {
        await rm(temporaryDirectory, { force: true, recursive: true });
      }
    },
  );

  return binaryPath;
}

function downloadToFile(url: string, destinationPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        void downloadToFile(response.headers.location, destinationPath).then(resolve, reject);
        response.resume();
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download zmx: HTTP ${response.statusCode ?? "unknown"}`));
        response.resume();
        return;
      }

      const fileStream = createWriteStream(destinationPath);
      void pipeline(response, fileStream).then(resolve, reject);
    });

    request.on("error", reject);
  });
}

function execFileAsync(command: string, args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(command, [...args], (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export { ZMX_DOWNLOAD_URLS, ZMX_VERSION };
