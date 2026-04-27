import { spawn } from "node:child_process";
import { basename } from "node:path";
import { quoteShellLiteral } from "../agent-shell-integration-utils";
import { getDefaultShell } from "../terminal-workspace-environment";
import { logzmuxDebug } from "../zmux-debug-log";

export type ShellCommandResult = {
  exitCode: number;
  stderr: string;
  stdout: string;
};

type RunShellCommandOptions = {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  interactiveShell?: boolean;
  stdin?: string;
  timeoutMs?: number;
};

export async function runShellCommand(
  command: string,
  options: RunShellCommandOptions,
): Promise<ShellCommandResult> {
  const shellPath = getDefaultShell();

  return runChildProcess(
    shellPath,
    getShellCommandArgs(shellPath, command, options.interactiveShell),
    command,
    options,
  );
}

export async function runGitCommand(
  cwd: string,
  args: readonly string[],
  timeoutMs = 60_000,
  env?: NodeJS.ProcessEnv,
): Promise<ShellCommandResult> {
  logzmuxDebug("git.process.runGitCommand", {
    args,
    clearedGitEnvKeys: GIT_ENV_KEYS_TO_CLEAR,
    cwd,
    overrideGitEnvKeys: Object.keys(env ?? {}).filter((key) => key.startsWith("GIT_")),
  });
  const result = await runGitCommandResult(cwd, args, timeoutMs, env);

  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || "Git command failed.");
  }

  return result;
}

export async function runGitCommandResult(
  cwd: string,
  args: readonly string[],
  timeoutMs = 60_000,
  env?: NodeJS.ProcessEnv,
): Promise<ShellCommandResult> {
  return runChildProcess("git", args, buildCommandLine("git", args), {
    cwd,
    env: createGitCommandEnv(env),
    timeoutMs,
  });
}

async function runChildProcess(
  command: string,
  args: readonly string[],
  displayCommand: string,
  options: RunShellCommandOptions,
): Promise<ShellCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let didTimeOut = false;
    const timer = setTimeout(() => {
      didTimeOut = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        child.kill("SIGKILL");
      }, 1_000).unref();
    }, options.timeoutMs ?? 60_000);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(Buffer.from(chunk));
    });
    child.stderr.on("data", (chunk) => {
      stderrChunks.push(Buffer.from(chunk));
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      if (didTimeOut) {
        reject(new Error(`Command timed out: ${displayCommand}`));
        return;
      }

      resolve({
        exitCode: exitCode ?? 0,
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
      });
    });

    if (options.stdin) {
      child.stdin.write(options.stdin);
    }
    child.stdin.end();
  });
}

const GIT_ENV_KEYS_TO_CLEAR = [
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_COMMON_DIR",
  "GIT_DIR",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_PREFIX",
  "GIT_WORK_TREE",
] as const;

function createGitCommandEnv(overrides?: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const nextEnv: NodeJS.ProcessEnv = {
    ...process.env,
  };

  for (const key of GIT_ENV_KEYS_TO_CLEAR) {
    delete nextEnv[key];
  }

  if (!overrides) {
    return nextEnv;
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete nextEnv[key];
      continue;
    }

    nextEnv[key] = value;
  }

  return nextEnv;
}

export async function runGitStdout(
  cwd: string,
  args: readonly string[],
  timeoutMs = 60_000,
  env?: NodeJS.ProcessEnv,
): Promise<string> {
  const result = await runGitCommand(cwd, args, timeoutMs, env);
  return result.stdout;
}

export function buildCommandLine(command: string, args: readonly string[]): string {
  return buildShellInvocation(command, args, true);
}

export function buildShellCommand(command: string, args: readonly string[]): string {
  return buildShellInvocation(command, args, false);
}

function buildShellInvocation(
  command: string,
  args: readonly string[],
  replaceShell: boolean,
): string {
  if (args.length === 0) {
    return replaceShell ? `exec ${command}` : command;
  }

  const commandLine = `${command} ${args.map((argument) => quoteShellLiteral(argument)).join(" ")}`;
  return replaceShell ? `exec ${commandLine}` : commandLine;
}

function getShellCommandArgs(
  shellPath: string,
  command: string,
  interactiveShell = false,
): string[] {
  const shellName = basename(shellPath).toLowerCase();

  if (process.platform === "win32") {
    if (shellName === "cmd.exe" || shellName === "cmd") {
      return ["/d", "/c", command];
    }

    return ["-NoLogo", "-NoProfile", "-Command", command];
  }

  return interactiveShell ? ["-l", "-i", "-c", command] : ["-l", "-c", command];
}
