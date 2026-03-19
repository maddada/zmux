import { spawn } from "node:child_process";

const STORYBOOK_PORT = 6006;
const STORYBOOK_URL = `http://127.0.0.1:${STORYBOOK_PORT}`;

let storybookProcess;

try {
  storybookProcess = spawn(
    "vp",
    ["exec", "storybook", "dev", "--ci", "--no-open", "--exact-port", "-p", String(STORYBOOK_PORT)],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    },
  );

  await waitForStorybook(`${STORYBOOK_URL}/iframe.html`);

  const exitCode = await runProcess("vp", ["exec", "test-storybook", "--url", STORYBOOK_URL]);

  process.exitCode = exitCode;
} finally {
  if (
    storybookProcess &&
    storybookProcess.exitCode === null &&
    storybookProcess.signalCode === null
  ) {
    storybookProcess.kill("SIGTERM");
    await onceExit(storybookProcess);
  }
}

function onceExit(childProcess) {
  return new Promise((resolve) => {
    if (childProcess.exitCode !== null || childProcess.signalCode !== null) {
      resolve();
      return;
    }

    childProcess.once("exit", () => {
      resolve();
    });
  });
}

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });

    childProcess.once("error", reject);
    childProcess.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Process exited with signal ${signal}`));
        return;
      }

      resolve(code ?? 1);
    });
  });
}

async function waitForStorybook(url) {
  const timeoutAt = Date.now() + 60_000;

  while (Date.now() < timeoutAt) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {}

    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  }

  throw new Error(`Timed out waiting for Storybook at ${url}`);
}
