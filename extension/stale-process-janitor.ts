import { execFile } from "node:child_process";
import type { Dirent } from "node:fs";
import { access, readdir, readFile, unlink } from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";
import type * as vscode from "vscode";
import { WebSocket } from "ws";
import { TERMINAL_HOST_PROTOCOL_VERSION } from "../shared/terminal-host-protocol";
import { appendTerminalRestartReproLog } from "./terminal-restart-repro-log";
import { logVSmuxDebug } from "./vsmux-debug-log";

type UnixProcessSnapshot = {
  command: string;
  pid: number;
  ppid: number;
};

type TerminalDaemonInfo = {
  port?: number;
  pid?: number;
  protocolVersion?: typeof TERMINAL_HOST_PROTOCOL_VERSION;
  token?: string;
};

type ReusableDaemonInfo = {
  pid: number;
  port: number;
  protocolVersion: typeof TERMINAL_HOST_PROTOCOL_VERSION;
  token: string;
};

const TERMINAL_DAEMON_STATE_PREFIX = "terminal-daemon-";
const DAEMON_INFO_FILE_NAME = "daemon-info.json";
const DAEMON_LAUNCH_LOCK_FILE_NAME = "daemon-launch.lock";
const DAEMON_CONTROL_CONNECT_TIMEOUT_MS = 1_500;
const execFileAsync = promisify(execFile);

export async function runStaleVsmuxProcessJanitor(
  context: Pick<vscode.ExtensionContext, "extensionUri" | "globalStorageUri">,
  workspaceId: string,
  workspaceRoot?: string,
): Promise<void> {
  await appendTerminalRestartReproLog(workspaceRoot, "janitor.start", {
    currentExtensionPath: context.extensionUri.fsPath,
    currentPid: process.pid,
    globalStoragePath: context.globalStorageUri.fsPath,
  });
  const staleProcessIds =
    process.platform === "win32"
      ? []
      : await listStaleVsmuxProcessIds(
          context.extensionUri.fsPath,
          context.globalStorageUri.fsPath,
          process.pid,
          workspaceId,
        );

  for (const pid of staleProcessIds) {
    await terminateProcess(pid);
  }

  const prunedDaemonStateCount = await pruneStaleDaemonState(context.globalStorageUri.fsPath);
  await appendTerminalRestartReproLog(workspaceRoot, "janitor.complete", {
    killedProcessCount: staleProcessIds.length,
    killedProcessIds: staleProcessIds,
    prunedDaemonStateCount,
    storagePath: context.globalStorageUri.fsPath,
  });
  logVSmuxDebug("janitor.staleProcesses.completed", {
    killedProcessCount: staleProcessIds.length,
    killedProcessIds: staleProcessIds,
    storagePath: context.globalStorageUri.fsPath,
  });
}

export async function listStaleVsmuxProcessIds(
  currentExtensionPath: string,
  globalStoragePath: string,
  currentPid: number,
  workspaceId?: string,
): Promise<number[]> {
  try {
    const reusableDaemonProcessIds = await listReusableDaemonProcessIds(
      globalStoragePath,
      workspaceId,
    );
    const { stdout } = await execFileAsync("ps", ["eww", "-axo", "pid=,ppid=,command="], {
      maxBuffer: 8 * 1024 * 1024,
    });
    return selectStaleVsmuxProcessIds(parseUnixProcessList(stdout), {
      currentExtensionPath,
      currentPid,
      globalStoragePath,
      reusableDaemonProcessIds,
    });
  } catch (error) {
    logVSmuxDebug("janitor.staleProcesses.psFailed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export function parseUnixProcessList(rawOutput: string): UnixProcessSnapshot[] {
  const processes: UnixProcessSnapshot[] = [];
  for (const line of rawOutput.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      continue;
    }

    const match = trimmedLine.match(/^(\d+)\s+(\d+)\s+([\s\S]+)$/);
    if (!match) {
      continue;
    }

    processes.push({
      command: match[3],
      pid: Number.parseInt(match[1], 10),
      ppid: Number.parseInt(match[2], 10),
    });
  }

  return processes;
}

export function selectStaleVsmuxProcessIds(
  processes: readonly UnixProcessSnapshot[],
  options: {
    currentExtensionPath: string;
    currentPid: number;
    globalStoragePath: string;
    reusableDaemonProcessIds?: ReadonlySet<number>;
  },
): number[] {
  const normalizedExtensionPath = normalizeForComparison(options.currentExtensionPath);
  const normalizedGlobalStoragePath = normalizeForComparison(options.globalStoragePath);
  const reusableDaemonProcessIds = options.reusableDaemonProcessIds ?? new Set<number>();

  return processes
    .filter((processInfo) => {
      if (!Number.isInteger(processInfo.pid) || processInfo.pid <= 1) {
        return false;
      }
      if (processInfo.pid === options.currentPid) {
        return false;
      }
      if (reusableDaemonProcessIds.has(processInfo.pid)) {
        return false;
      }

      const normalizedCommand = normalizeForComparison(processInfo.command);
      const isHelperProcess = isVsmuxHelperProcess(normalizedCommand);
      const isOwnedByCurrentStorage =
        normalizedGlobalStoragePath.length > 0 &&
        normalizedCommand.includes(normalizedGlobalStoragePath);
      const hasVsmuxEnvironmentMarkers =
        normalizedCommand.includes("vsmux_agent=") ||
        normalizedCommand.includes("vsmux_session_state_file=") ||
        normalizedCommand.includes("vsmux_wrapper_pid=") ||
        normalizedCommand.includes("vsmux_vscode_app_root=") ||
        normalizedCommand.includes("opencode_config_dir=") ||
        normalizedCommand.includes("codex_tui_session_log_path=");
      const isOldExtensionHelper =
        isHelperProcess &&
        normalizedCommand.includes("/maddada.vsmux-") &&
        !normalizedCommand.includes(normalizedExtensionPath);
      const isOrphanedOldOwnedProcess =
        processInfo.ppid === 1 &&
        (isOldExtensionHelper ||
          ((isOwnedByCurrentStorage || hasVsmuxEnvironmentMarkers) &&
            normalizedCommand.includes("/maddada.vsmux-") &&
            !normalizedCommand.includes(normalizedExtensionPath)));

      return isOrphanedOldOwnedProcess || isOldExtensionHelper;
    })
    .map((processInfo) => processInfo.pid);
}

async function listReusableDaemonProcessIds(
  globalStoragePath: string,
  workspaceId?: string,
): Promise<Set<number>> {
  if (!workspaceId) {
    return new Set();
  }

  const reusableDaemonInfo = await getReusableDaemonInfo(
    path.join(
      globalStoragePath,
      `${TERMINAL_DAEMON_STATE_PREFIX}${workspaceId}`,
      DAEMON_INFO_FILE_NAME,
    ),
  );
  if (!reusableDaemonInfo) {
    return new Set();
  }

  return new Set([reusableDaemonInfo.pid]);
}

async function getReusableDaemonInfo(
  infoFilePath: string,
): Promise<ReusableDaemonInfo | undefined> {
  const daemonInfo = await readDaemonInfo(infoFilePath);
  const pid = daemonInfo?.pid;
  const port = daemonInfo?.port;
  const protocolVersion = daemonInfo?.protocolVersion;
  const token = daemonInfo?.token;
  if (
    typeof pid !== "number" ||
    !Number.isInteger(pid) ||
    pid <= 1 ||
    protocolVersion !== TERMINAL_HOST_PROTOCOL_VERSION ||
    typeof port !== "number" ||
    !Number.isFinite(port) ||
    typeof token !== "string" ||
    token.length === 0
  ) {
    return undefined;
  }

  const reusableDaemonInfo: ReusableDaemonInfo = {
    pid,
    port,
    protocolVersion,
    token,
  };
  if (!(await canReachDaemon(reusableDaemonInfo))) {
    return undefined;
  }

  return reusableDaemonInfo;
}

async function pruneStaleDaemonState(globalStoragePath: string): Promise<number> {
  let entries: Dirent[] = [];
  try {
    entries = await readdir(globalStoragePath, { withFileTypes: true });
  } catch {
    return 0;
  }

  let prunedCount = 0;
  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(TERMINAL_DAEMON_STATE_PREFIX))
      .map(async (entry) => {
        const daemonStateDir = path.join(globalStoragePath, entry.name);
        const daemonInfoPath = path.join(daemonStateDir, DAEMON_INFO_FILE_NAME);
        const launchLockPath = path.join(daemonStateDir, DAEMON_LAUNCH_LOCK_FILE_NAME);
        const daemonInfo = await readDaemonInfo(daemonInfoPath);
        if (!daemonInfo?.pid || isProcessAlive(daemonInfo.pid)) {
          await pruneDeadLaunchLock(launchLockPath);
          return;
        }

        await Promise.allSettled([unlink(daemonInfoPath), unlink(launchLockPath)]);
        prunedCount += 1;
      }),
  );
  return prunedCount;
}

async function pruneDeadLaunchLock(lockFilePath: string): Promise<void> {
  try {
    await access(lockFilePath);
  } catch {
    return;
  }

  try {
    const rawLock = await readFile(lockFilePath, "utf8");
    const payload = JSON.parse(rawLock) as { pid?: number };
    if (payload.pid && isProcessAlive(payload.pid)) {
      return;
    }
  } catch {
    // If the lock file is unreadable or corrupt, treat it as stale.
  }

  await unlink(lockFilePath).catch(() => undefined);
}

async function readDaemonInfo(infoFilePath: string): Promise<TerminalDaemonInfo | undefined> {
  try {
    const rawInfo = await readFile(infoFilePath, "utf8");
    return JSON.parse(rawInfo) as TerminalDaemonInfo;
  } catch {
    return undefined;
  }
}

function normalizeForComparison(value: string): string {
  return value.replaceAll("\\", "/").toLowerCase();
}

function isVsmuxHelperProcess(command: string): boolean {
  return (
    command.includes("terminal-daemon-process.js") ||
    command.includes("agent-shell-wrapper-runner.js") ||
    command.includes("agent-shell-notify-runner.js")
  );
}

async function canReachDaemon(
  daemonInfo: Pick<ReusableDaemonInfo, "port" | "token">,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new WebSocket(
      `ws://127.0.0.1:${String(daemonInfo.port)}/control?token=${encodeURIComponent(daemonInfo.token)}`,
    );
    const timeout = setTimeout(() => {
      try {
        socket.close();
      } catch {
        // Ignore socket close failures during daemon reachability checks.
      }
      resolve(false);
    }, DAEMON_CONTROL_CONNECT_TIMEOUT_MS);

    socket.once("open", () => {
      clearTimeout(timeout);
      socket.close();
      resolve(true);
    });
    socket.once("error", () => {
      clearTimeout(timeout);
      resolve(false);
    });
    socket.once("close", () => {
      clearTimeout(timeout);
    });
  });
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !(
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ESRCH"
    );
  }
}

async function terminateProcess(pid: number): Promise<void> {
  if (!isProcessAlive(pid)) {
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }

  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) {
      return;
    }
    await delay(100);
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // Ignore races where the process exits between checks.
  }
}

async function delay(durationMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
