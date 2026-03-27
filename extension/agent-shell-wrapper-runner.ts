import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { detectCodexLifecycleEventFromLogLine } from "./agent-shell-integration";
import { writePersistedSessionStateToFile } from "./session-state-file";

type AgentName = "claude" | "codex" | "gemini" | "opencode";

type WrapperRunnerOptions = {
  agent: AgentName;
  binDir: string;
  claudeSettingsPath: string;
  forwardedArgs: string[];
  notifyRunnerPath: string;
  opencodeConfigDir: string;
};

type CodexWatcherHandle = {
  stop: () => void;
};

const CODEX_LOG_POLL_INTERVAL_MS = 200;
const CLAUDE_CODE_DISABLE_TERMINAL_TITLE_ENV_KEY = "CLAUDE_CODE_DISABLE_TERMINAL_TITLE";

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const executablePath = resolveExecutablePath(options.agent, options.binDir);
  if (!executablePath) {
    throw new Error(`VSmux: ${options.agent} not found in PATH.`);
  }

  const environment = createAgentEnvironment(options.agent, process.env);
  const args = [...options.forwardedArgs];

  switch (options.agent) {
    case "claude":
      delete environment.ELECTRON_RUN_AS_NODE;
      await writeInitialSessionState("claude", "Claude Code");
      args.unshift("--settings", options.claudeSettingsPath);
      break;
    case "codex": {
      delete environment.ELECTRON_RUN_AS_NODE;
      await writeInitialSessionState("codex", "Codex");
      environment.CODEX_TUI_RECORD_SESSION = "1";
      if (!environment.CODEX_TUI_SESSION_LOG_PATH) {
        environment.CODEX_TUI_SESSION_LOG_PATH = path.join(
          os.tmpdir(),
          `VSmux-codex-${process.pid}-${Date.now()}.jsonl`,
        );
      }
      args.unshift("-c", `notify=${JSON.stringify([process.execPath, options.notifyRunnerPath])}`);
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
      ? startCodexWatcher(environment.CODEX_TUI_SESSION_LOG_PATH, options.notifyRunnerPath)
      : undefined;

  const exitCode = await spawnAgentProcess(options.agent, executablePath, args, environment);
  watcher?.stop();
  process.exit(exitCode);
}

export function createAgentEnvironment(
  agent: AgentName,
  baseEnvironment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...baseEnvironment, VSMUX_AGENT: agent };

  if (agent === "claude") {
    environment[CLAUDE_CODE_DISABLE_TERMINAL_TITLE_ENV_KEY] = "1";
  }

  return environment;
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
  const stateFilePath = process.env.VSMUX_SESSION_STATE_FILE?.trim();
  if (!stateFilePath) {
    return;
  }

  await writePersistedSessionStateToFile(stateFilePath, {
    agentName: agent,
    agentStatus: "idle",
    title,
  }).catch(() => undefined);
}

function startCodexWatcher(logFilePath: string, notifyRunnerPath: string): CodexWatcherHandle {
  let disposed = false;
  let pendingLine = "";
  let lastContentLength = 0;
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
            emitNotifyEvent("Start", notifyRunnerPath);
            continue;
          }

          if (turnId === lastStoppedTurnId) {
            continue;
          }

          lastStoppedTurnId = turnId;
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

function emitNotifyEvent(eventName: "Start" | "Stop", notifyRunnerPath: string): void {
  const payload = JSON.stringify({
    agent: "codex",
    hook_event_name: eventName,
  });

  const child = spawn(process.execPath, [notifyRunnerPath, payload], {
    detached: true,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      VSMUX_AGENT: "codex",
    },
    stdio: "ignore",
  });
  child.unref();
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
        return new Promise((resolve, reject) => {
          const child = spawn(nodePath, [codexEntrypointPath, ...args], {
            env: environment,
            stdio: "inherit",
          });

          child.once("error", reject);
          child.once("exit", (code) => {
            resolve(code ?? 1);
          });
        });
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
      const child = spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", commandLine], {
        env: environment,
        stdio: "inherit",
        windowsVerbatimArguments: true,
      });

      child.once("error", reject);
      child.once("exit", (code) => {
        resolve(code ?? 1);
      });
    });
  }

  return new Promise((resolve, reject) => {
    const child = spawn(executablePath, [...args], {
      env: environment,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      resolve(code ?? 1);
    });
  });
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
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
