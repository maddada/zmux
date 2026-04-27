import { spawn } from "node:child_process";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename } from "node:path";

const POLL_INTERVAL_MS = 10_000;
const SHUTDOWN_GRACE_MS = 5_000;

type SupervisorOptions = {
  bootstrapJson?: string;
  command: string;
  cwd: string;
  graceMs: number;
  host: string;
  leaseDir: string;
  port: number;
  shellPath: string;
  stateFile: string;
};

type LeaseRecord = {
  updatedAt?: number;
};

type ManagedChild = ReturnType<typeof spawn>;

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const child = spawn(options.shellPath, getShellCommandArgs(options.shellPath, options.command), {
    cwd: options.cwd,
    env: {
      ...process.env,
      T3CODE_AUTO_BOOTSTRAP_PROJECT_FROM_CWD: "false",
      T3CODE_HOST: options.host,
      T3CODE_NO_BROWSER: "true",
      T3CODE_PORT: String(options.port),
    },
    // On Windows, ignoring stdio causes PowerShell-launched `npx --yes t3`
    // to exit immediately. Keep stdout/stderr piped and drain them instead.
    stdio: options.bootstrapJson ? ["ignore", "pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
  });
  child.stdout?.resume();
  child.stderr?.resume();
  const bootstrapStream = options.bootstrapJson ? child.stdio[3] : undefined;
  if (options.bootstrapJson) {
    if (!bootstrapStream || !("write" in bootstrapStream)) {
      throw new Error("Managed T3 runtime is missing bootstrap fd 3.");
    }

    bootstrapStream.write(`${options.bootstrapJson}\n`);
    bootstrapStream.end();
  }
  child.unref();

  await writeSupervisorState(options, child);

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    clearInterval(timer);
    await shutdownChild(child);
    await rm(options.stateFile, { force: true });
    process.exit(0);
  };

  child.once("exit", () => {
    void shutdown();
  });

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });

  const timer = setInterval(() => {
    void monitorLeases(options, child, shutdown);
  }, POLL_INTERVAL_MS);
  timer.unref();

  await monitorLeases(options, child, shutdown);
}

async function monitorLeases(
  options: SupervisorOptions,
  child: ManagedChild,
  shutdown: () => Promise<void>,
): Promise<void> {
  if (child.exitCode !== null) {
    await shutdown();
    return;
  }

  const hasActiveLeases = await hasAnyActiveLease(options.leaseDir, options.graceMs);
  if (!hasActiveLeases) {
    await shutdown();
  }
}

async function hasAnyActiveLease(leaseDir: string, graceMs: number): Promise<boolean> {
  let leaseFileNames: string[];
  try {
    leaseFileNames = await readdir(leaseDir);
  } catch {
    return false;
  }

  const now = Date.now();
  let hasActiveLease = false;
  for (const fileName of leaseFileNames) {
    const filePath = `${leaseDir}/${fileName}`;
    let lease: LeaseRecord | undefined;
    try {
      lease = JSON.parse(await readFile(filePath, "utf8")) as LeaseRecord;
    } catch {
      await rm(filePath, { force: true }).catch(() => undefined);
      continue;
    }

    if (!lease.updatedAt || now - lease.updatedAt > graceMs) {
      await rm(filePath, { force: true }).catch(() => undefined);
      continue;
    }

    hasActiveLease = true;
  }

  return hasActiveLease;
}

async function shutdownChild(child: ManagedChild): Promise<void> {
  if (child.exitCode !== null) {
    return;
  }

  child.kill();
  const deadline = Date.now() + SHUTDOWN_GRACE_MS;
  while (child.exitCode === null && Date.now() < deadline) {
    await delay(100);
  }

  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }
}

async function writeSupervisorState(
  options: SupervisorOptions,
  child: ManagedChild,
): Promise<void> {
  await writeFile(
    options.stateFile,
    JSON.stringify(
      {
        childPid: child.pid,
        command: options.command,
        cwd: options.cwd,
        host: options.host,
        pid: process.pid,
        port: options.port,
        startedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
}

function parseArgs(argv: readonly string[]): SupervisorOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument list: ${argv.join(" ")}`);
    }

    values.set(key.slice(2), value);
  }

  return {
    bootstrapJson: values.get("bootstrap-json"),
    command: getRequiredArg(values, "command"),
    cwd: getRequiredArg(values, "cwd"),
    graceMs: Number(getRequiredArg(values, "grace-ms")),
    host: getRequiredArg(values, "host"),
    leaseDir: getRequiredArg(values, "lease-dir"),
    port: Number(getRequiredArg(values, "port")),
    shellPath: getRequiredArg(values, "shell-path"),
    stateFile: getRequiredArg(values, "state-file"),
  };
}

function getRequiredArg(values: ReadonlyMap<string, string>, key: string): string {
  const value = values.get(key);
  if (!value) {
    throw new Error(`Missing required argument: --${key}`);
  }

  return value;
}

function getShellCommandArgs(shellPath: string, command: string): string[] {
  const shellName = basename(shellPath).toLowerCase();

  if (process.platform === "win32") {
    if (shellName === "cmd.exe" || shellName === "cmd") {
      return ["/d", "/c", command];
    }

    return ["-NoLogo", "-NoProfile", "-Command", command];
  }

  return ["-l", "-c", `exec ${command}`];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

void main().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const stateFileFlagIndex = process.argv.indexOf("--state-file");
  if (stateFileFlagIndex >= 0) {
    const stateFile = process.argv[stateFileFlagIndex + 1];
    if (stateFile) {
      await writeFile(
        stateFile,
        JSON.stringify(
          {
            error: message,
            failedAt: new Date().toISOString(),
            pid: process.pid,
          },
          null,
          2,
        ),
        "utf8",
      ).catch(() => undefined);
      await rm(stateFile, { force: true }).catch(() => undefined);
    }
  }
  process.exit(1);
});
