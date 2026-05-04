import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { appendAgentShellDebugLog } from "./agent-shell-debug-log";
import { detectCodexLifecycleEventFromLogLine } from "./agent-shell-integration";
import { ensureClaudeHooksFile } from "./claude-hooks-config";
import { ensureCodexHooksFile } from "./codex-hooks-config";
import {
  updatePersistedSessionStateFile,
  writePersistedSessionStateToFile,
} from "./session-state-file";

type AgentName = "claude" | "codex" | "gemini" | "opencode";

type WrapperRunnerOptions = {
  agent: AgentName;
  binDir: string;
  claudeSettingsPath: string;
  debugLogPath: string;
  forwardedArgs: string[];
  notifyRunnerPath: string;
  opencodeConfigDir: string;
};

type CodexWatcherHandle = {
  stop: () => void;
};

const CODEX_LOG_POLL_INTERVAL_MS = 200;
const AGENT_COLOR_ENVIRONMENT_KEYS = [
  "ANSI_COLORS_DISABLED",
  "CI",
  "CLICOLOR",
  "CLICOLOR_FORCE",
  "COLORTERM",
  "FORCE_COLOR",
  "NO_COLOR",
  "NODE_DISABLE_COLORS",
  "TERM",
  "TERM_PROGRAM",
  "TERM_PROGRAM_VERSION",
] as const;

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  process.env.zmux_AGENT_SHELL_DEBUG_LOG_PATH = options.debugLogPath;
  const executablePath = resolveExecutablePath(options.agent, options.binDir);
  if (!executablePath) {
    throw new Error(`zmux: ${options.agent} not found in PATH.`);
  }

  const environment = createAgentEnvironment(options.agent, process.env);
  const args = [...options.forwardedArgs];
  await appendAgentShellDebugLog("wrapper.launch.prepare", {
    agent: options.agent,
    executablePath,
    forwardedArgs: options.forwardedArgs,
  });

  switch (options.agent) {
    case "claude":
      delete environment.ELECTRON_RUN_AS_NODE;
      await writeInitialSessionState("claude", "Claude Code");
      try {
        const hooksResult = await ensureClaudeHooksFile(
          resolveClaudeNotifyCommandPath(options.claudeSettingsPath),
          environment,
        );
        await appendAgentShellDebugLog("wrapper.claude.hooksReady", {
          changed: hooksResult.changed,
          settingsPath: hooksResult.settingsPath,
        });
      } catch (error) {
        await appendAgentShellDebugLog("wrapper.claude.hooksFailed", serializeUnknownError(error));
      }
      args.unshift("--settings", options.claudeSettingsPath);
      break;
    case "codex": {
      delete environment.ELECTRON_RUN_AS_NODE;
      await writeInitialSessionState("codex", "Codex");
      environment.CODEX_TUI_RECORD_SESSION = "1";
      environment.zmux_AGENT_SHELL_DEBUG_LOG_PATH = options.debugLogPath;
      if (!environment.CODEX_TUI_SESSION_LOG_PATH) {
        environment.CODEX_TUI_SESSION_LOG_PATH = path.join(
          os.tmpdir(),
          `zmux-codex-${process.pid}-${Date.now()}.jsonl`,
        );
      }
      args.unshift("-c", "features.codex_hooks=true");
      args.unshift("-c", `notify=${JSON.stringify([process.execPath, options.notifyRunnerPath])}`);
      try {
        const hooksResult = await ensureCodexHooksFile(options.notifyRunnerPath, environment);
        await appendAgentShellDebugLog("wrapper.codex.hooksReady", {
          changed: hooksResult.changed,
          hooksPath: hooksResult.hooksPath,
        });
      } catch (error) {
        await appendAgentShellDebugLog("wrapper.codex.hooksFailed", serializeUnknownError(error));
      }
      break;
    }
    case "gemini":
      delete environment.ELECTRON_RUN_AS_NODE;
      await writeInitialSessionState("gemini", "Gemini");
      break;
    case "opencode":
      delete environment.ELECTRON_RUN_AS_NODE;
      await writeInitialSessionState("opencode", "OpenCode");
      environment.OPENCODE_CONFIG_DIR = options.opencodeConfigDir;
      break;
  }

  const watcher =
    options.agent === "codex" && environment.CODEX_TUI_SESSION_LOG_PATH
      ? startCodexWatcher(
          environment.CODEX_TUI_SESSION_LOG_PATH,
          options.notifyRunnerPath,
          environment.zmux_SESSION_STATE_FILE,
        )
      : undefined;

  await appendAgentShellDebugLog("wrapper.launch.spawn", {
    agent: options.agent,
    args,
    colorEnv: readAgentColorEnvironmentSnapshot(environment),
    codexHome: environment.CODEX_HOME,
    detached: shouldSpawnAgentInDetachedGroup(),
    notifyRunnerPath: options.notifyRunnerPath,
    sessionLogPath: environment.CODEX_TUI_SESSION_LOG_PATH,
    sessionStateFilePath: environment.zmux_SESSION_STATE_FILE,
    wrapperTty: readWrapperTtySnapshot(),
  });
  const exitCode = await spawnAgentProcess(options.agent, executablePath, args, environment);
  await appendAgentShellDebugLog("wrapper.launch.exit", {
    agent: options.agent,
    exitCode,
  });
  watcher?.stop();
  process.exit(exitCode);
}

export function createAgentEnvironment(
  agent: AgentName,
  baseEnvironment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  /**
   * CDXC:Claude-session-status 2026-04-25-08:10
   * Claude Code terminal-title OSC updates must stay enabled. zmux uses those
   * title transitions to derive Claude sidebar names and working/done indicators.
   */
  const environment: NodeJS.ProcessEnv = {
    ...baseEnvironment,
    zmux_AGENT: agent,
    zmux_WRAPPER_PID: String(process.pid),
  };

  return environment;
}

function readAgentColorEnvironmentSnapshot(environment: NodeJS.ProcessEnv): Record<string, string | null> {
  /**
   * CDXC:AgentCliColorDiagnostics 2026-05-04-15:39
   * Claude/Codex color output is controlled by the child process environment,
   * not only by Ghostty rendering. Persist these exact inherited values so rare
   * monochrome agent launches can be tied to NO_COLOR, TERM=dumb, CI, or forced
   * color flags without changing runtime behavior.
   */
  return Object.fromEntries(
    AGENT_COLOR_ENVIRONMENT_KEYS.map((key) => [key, environment[key] ?? null]),
  ) as Record<string, string | null>;
}

function parseArgs(argv: readonly string[]): WrapperRunnerOptions {
  const separatorIndex = argv.indexOf("--");
  const optionArgs = separatorIndex >= 0 ? argv.slice(0, separatorIndex) : argv;
  const forwardedArgs = separatorIndex >= 0 ? argv.slice(separatorIndex + 1) : [];
  const values = new Map<string, string>();

  for (let index = 0; index < optionArgs.length; index += 2) {
    const key = optionArgs[index];
    const value = optionArgs[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid wrapper argument list: ${argv.join(" ")}`);
    }

    values.set(key.slice(2), value);
  }

  const agent = getRequiredArg(values, "agent");
  if (agent !== "claude" && agent !== "codex" && agent !== "gemini" && agent !== "opencode") {
    throw new Error(`Unsupported agent: ${agent}`);
  }

  return {
    agent,
    binDir: getRequiredArg(values, "bin-dir"),
    claudeSettingsPath: getRequiredArg(values, "claude-settings-path"),
    debugLogPath: getRequiredArg(values, "debug-log-path"),
    forwardedArgs,
    notifyRunnerPath: getRequiredArg(values, "notify-runner-path"),
    opencodeConfigDir: getRequiredArg(values, "opencode-config-dir"),
  };
}

function getRequiredArg(values: ReadonlyMap<string, string>, key: string): string {
  const value = values.get(key);
  if (!value) {
    throw new Error(`Missing required argument: --${key}`);
  }

  return value;
}

function resolveExecutablePath(agent: AgentName, binDir: string): string | undefined {
  const currentPath = process.env.PATH ?? "";
  const pathEntries = currentPath.split(path.delimiter);
  const normalizedBinDir = normalizePath(binDir);
  const candidateNames = getCandidateExecutableNames(agent);

  for (const pathEntry of pathEntries) {
    if (!pathEntry) {
      continue;
    }

    if (normalizePath(pathEntry) === normalizedBinDir) {
      continue;
    }

    for (const candidateName of candidateNames) {
      const candidatePath = path.join(pathEntry, candidateName);
      try {
        const fileStats = statSync(candidatePath);
        if (fileStats.isFile()) {
          return candidatePath;
        }
      } catch {
        continue;
      }
    }
  }

  return undefined;
}

function normalizePath(value: string): string {
  const resolvedValue = path.resolve(value);
  return process.platform === "win32" ? resolvedValue.toLowerCase() : resolvedValue;
}

export function getCandidateExecutableNames(
  agent: AgentName,
  platform = process.platform,
  pathExt = process.env.PATHEXT,
): string[] {
  if (platform !== "win32") {
    return [agent];
  }

  const pathExtensions = (pathExt ?? ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .filter((entry) => entry.length > 0);

  const pathextCandidates = pathExtensions.map((extension) => `${agent}${extension.toLowerCase()}`);
  return agent === "codex" ? pathextCandidates : [...pathextCandidates, agent];
}

async function writeInitialSessionState(agent: AgentName, title: string): Promise<void> {
  const stateFilePath = process.env.zmux_SESSION_STATE_FILE?.trim();
  if (!stateFilePath) {
    return;
  }

  await writePersistedSessionStateToFile(stateFilePath, {
    agentName: agent,
    agentStatus: "idle",
    lastActivityAt: new Date().toISOString(),
    title,
  }).catch(() => undefined);
}

function resolveClaudeNotifyCommandPath(claudeSettingsPath: string): string {
  return path.join(
    path.dirname(claudeSettingsPath),
    process.platform === "win32" ? "notify.cmd" : "notify.sh",
  );
}

function startCodexWatcher(
  logFilePath: string,
  notifyRunnerPath: string,
  sessionStateFilePath: string | undefined,
): CodexWatcherHandle {
  let disposed = false;
  let pendingLine = "";
  let lastContentLength = 0;
  let lastSeenSessionId: string | undefined;
  let lastStartedTurnId: string | undefined;
  let lastStoppedTurnId: string | undefined;
  let polling = false;

  const timer = setInterval(() => {
    if (disposed || polling) {
      return;
    }

    polling = true;
    void readFile(logFilePath, "utf8")
      .then((content) => {
        if (disposed) {
          return;
        }

        if (content.length < lastContentLength) {
          lastContentLength = 0;
          pendingLine = "";
        }

        if (content.length === lastContentLength) {
          return;
        }

        const nextChunk = `${pendingLine}${content.slice(lastContentLength)}`;
        lastContentLength = content.length;
        const lines = nextChunk.split(/\r?\n/);
        pendingLine = lines.pop() ?? "";

        for (const line of lines) {
          const sessionId = extractCodexSessionId(line);
          if (sessionId && sessionId !== lastSeenSessionId) {
            lastSeenSessionId = sessionId;
            void persistCodexSessionId(sessionStateFilePath, sessionId);
          }

          const eventType = detectCodexLifecycleEventFromLogLine(line);
          if (!eventType) {
            continue;
          }

          const turnId = extractTurnId(line) ?? eventType;
          if (eventType === "start") {
            if (turnId === lastStartedTurnId) {
              continue;
            }

            lastStartedTurnId = turnId;
            void appendAgentShellDebugLog("wrapper.codex.watcherEvent", {
              eventType,
              logFilePath,
              source: "session-log",
              turnId,
            });
            emitNotifyEvent("Start", notifyRunnerPath);
            continue;
          }

          if (turnId === lastStoppedTurnId) {
            continue;
          }

          lastStoppedTurnId = turnId;
          void appendAgentShellDebugLog("wrapper.codex.watcherEvent", {
            eventType,
            logFilePath,
            source: "session-log",
            turnId,
          });
          emitNotifyEvent("Stop", notifyRunnerPath);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        polling = false;
      });
  }, CODEX_LOG_POLL_INTERVAL_MS);

  timer.unref?.();

  return {
    stop: () => {
      disposed = true;
      clearInterval(timer);
    },
  };
}

function extractTurnId(line: string): string | undefined {
  return line.match(/"turn_id":"([^"]+)"/)?.[1];
}

export function extractCodexSessionId(line: string): string | undefined {
  try {
    const parsed = JSON.parse(line) as {
      payload?: { id?: unknown };
      type?: unknown;
    };
    return parsed.type === "session_meta" && typeof parsed.payload?.id === "string"
      ? parsed.payload.id
      : undefined;
  } catch {
    return undefined;
  }
}

async function persistCodexSessionId(
  stateFilePath: string | undefined,
  sessionId: string,
): Promise<void> {
  const normalizedStateFilePath = stateFilePath?.trim();
  if (!normalizedStateFilePath) {
    return;
  }

  await updatePersistedSessionStateFile(normalizedStateFilePath, (state) => ({
    ...state,
    agentSessionId: sessionId,
  })).catch(() => undefined);
}

function emitNotifyEvent(eventName: "Start" | "Stop", notifyRunnerPath: string): void {
  void appendAgentShellDebugLog("wrapper.notify.emit", {
    eventName,
    notifyRunnerPath,
  });
  const payload = JSON.stringify({
    agent: "codex",
    hook_event_name: eventName,
  });

  const child = spawn(process.execPath, [notifyRunnerPath, payload], {
    detached: true,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      zmux_AGENT: "codex",
    },
    stdio: "ignore",
  });
  child.unref();
}

export function shouldSpawnAgentInDetachedGroup(platform = process.platform): boolean {
  void platform;
  /**
   * CDXC:AgentTerminalResize 2026-04-29-08:13
   * Interactive agent CLIs must stay in the terminal's foreground process
   * group. Detaching the child creates a new session on Unix, which leaves
   * Claude Code without the controlling TTY it uses through Ink/Node to receive
   * SIGWINCH and recompute terminal columns during embedded Ghostty resizes.
   */
  return false;
}

export function getProcessTreeKillTarget(pid: number, platform = process.platform): number {
  return shouldSpawnAgentInDetachedGroup(platform) ? -Math.abs(pid) : Math.abs(pid);
}

function spawnAgentProcess(
  agent: AgentName,
  executablePath: string,
  args: readonly string[],
  environment: NodeJS.ProcessEnv,
): Promise<number> {
  if (process.platform === "win32" && agent === "codex") {
    const executableDir = path.dirname(executablePath);
    const nodePath = path.join(executableDir, "node.exe");
    const codexEntrypointPath = path.join(
      executableDir,
      "node_modules",
      "@openai",
      "codex",
      "bin",
      "codex.js",
    );

    try {
      if (statSync(nodePath).isFile() && statSync(codexEntrypointPath).isFile()) {
        return waitForAgentProcessExit(
          agent,
          spawn(nodePath, [codexEntrypointPath, ...args], {
            detached: shouldSpawnAgentInDetachedGroup(),
            env: environment,
            stdio: "inherit",
          }),
        );
      }
    } catch {
      // Fall back to the resolved executable path if this is not an npm-style global Codex install.
    }
  }

  if (process.platform === "win32" && /\.(bat|cmd)$/i.test(executablePath)) {
    return new Promise((resolve, reject) => {
      const commandLine = [`"${executablePath}"`, ...args.map(quoteWindowsCommandArgument)].join(
        " ",
      );
      void waitForAgentProcessExit(
        agent,
        spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", commandLine], {
          detached: shouldSpawnAgentInDetachedGroup(),
          env: environment,
          stdio: "inherit",
          windowsVerbatimArguments: true,
        }),
      ).then(resolve, reject);
    });
  }

  return waitForAgentProcessExit(
    agent,
    spawn(executablePath, [...args], {
      detached: shouldSpawnAgentInDetachedGroup(),
      env: environment,
      stdio: "inherit",
    }),
  );
}

function waitForAgentProcessExit(
  agent: AgentName,
  child: ReturnType<typeof spawn>,
): Promise<number> {
  const cleanup = registerWrapperTerminationHandlers(agent, child);
  void appendAgentShellDebugLog("wrapper.launch.spawned", {
    agent,
    childPid: child.pid,
    detached: shouldSpawnAgentInDetachedGroup(),
    wrapperTty: readWrapperTtySnapshot(),
  });

  return new Promise((resolve, reject) => {
    child.once("error", (error) => {
      cleanup();
      reject(error);
    });
    child.once("exit", (code) => {
      cleanup();
      resolve(code ?? 1);
    });
  });
}

function registerWrapperTerminationHandlers(
  agent: AgentName,
  child: ReturnType<typeof spawn>,
): () => void {
  let forcedKillTimer: NodeJS.Timeout | undefined;
  let isCleaningUp = false;

  const terminateChildTree = (signal: NodeJS.Signals, source: string): void => {
    if (isCleaningUp) {
      return;
    }
    isCleaningUp = true;
    void appendAgentShellDebugLog("wrapper.launch.terminateChildTree", {
      agent,
      childPid: child.pid,
      signal,
      source,
    });
    killChildProcessTree(child.pid, signal);
    forcedKillTimer = setTimeout(() => {
      killChildProcessTree(child.pid, "SIGKILL");
    }, 4_000);
    forcedKillTimer.unref?.();
  };

  const signalHandlers = new Map<NodeJS.Signals, () => void>();
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    const handler = () => {
      if (signal === "SIGINT") {
        /**
         * CDXC:AgentTerminalResize 2026-04-29-08:13
         * Attached agent children share the foreground terminal process group
         * so they receive Ctrl-C directly. The wrapper must not convert that
         * user interrupt into a process-tree kill because Claude/Codex use
         * SIGINT for in-app cancellation.
         */
        void appendAgentShellDebugLog("wrapper.launch.agentOwnedSignal", {
          agent,
          childPid: child.pid,
          signal,
        });
        return;
      }

      terminateChildTree(signal, "wrapper-signal");
    };
    signalHandlers.set(signal, handler);
    process.once(signal, handler);
  }

  const exitHandler = () => {
    terminateChildTree("SIGTERM", "wrapper-exit");
  };
  process.once("exit", exitHandler);

  return () => {
    if (forcedKillTimer) {
      clearTimeout(forcedKillTimer);
      forcedKillTimer = undefined;
    }
    for (const [signal, handler] of signalHandlers) {
      process.removeListener(signal, handler);
    }
    process.removeListener("exit", exitHandler);
  };
}

function readWrapperTtySnapshot(): Record<string, unknown> {
  return {
    columns: process.stdout.isTTY ? process.stdout.columns : undefined,
    pid: process.pid,
    platform: process.platform,
    ppid: process.ppid,
    rows: process.stdout.isTTY ? process.stdout.rows : undefined,
    stderrIsTTY: process.stderr.isTTY === true,
    stdinIsTTY: process.stdin.isTTY === true,
    stdoutIsTTY: process.stdout.isTTY === true,
  };
}

function killChildProcessTree(pid: number | undefined, signal: NodeJS.Signals): void {
  if (!pid || pid <= 0) {
    return;
  }

  try {
    process.kill(getProcessTreeKillTarget(pid), signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // Ignore races where the child already exited.
    }
  }
}

function serializeUnknownError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return {
    error: String(error),
  };
}

function quoteWindowsCommandArgument(value: string): string {
  return `"${value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, "$1$1")}"`;
}

const isMainModule =
  typeof __filename === "string" &&
  process.argv[1] !== undefined &&
  normalizePath(process.argv[1]) === normalizePath(__filename);

if (isMainModule) {
  void main().catch((error) => {
    void appendAgentShellDebugLog("wrapper.launch.failed", serializeUnknownError(error));
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
