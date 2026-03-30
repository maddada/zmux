import { spawn } from "node:child_process";
import { basename } from "node:path";
import { quoteShellLiteral } from "../agent-shell-integration-utils";
import { getDefaultShell } from "../terminal-workspace-environment";

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

  return new Promise((resolve, reject) => {
    const child = spawn(shellPath, getShellCommandArgs(shellPath, command, options.interactiveShell), {
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
        reject(new Error(`Command timed out: ${command}`));
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

export async function runGitCommand(
  cwd: string,
  args: readonly string[],
  timeoutMs = 60_000,
  env?: NodeJS.ProcessEnv,
): Promise<ShellCommandResult> {
  const result = await runShellCommand(buildCommandLine("git", args), {
    cwd,
    env,
    timeoutMs,
  });

  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || "Git command failed.");
  }

  return result;
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

function getShellCommandArgs(shellPath: string, command: string, interactiveShell = false): string[] {
  const shellName = basename(shellPath).toLowerCase();

  if (process.platform === "win32") {
    if (shellName === "cmd.exe" || shellName === "cmd") {
      return ["/d", "/c", command];
    }

    return ["-NoLogo", "-NoProfile", "-Command", command];
  }

  return interactiveShell ? ["-l", "-i", "-c", command] : ["-l", "-c", command];
}
