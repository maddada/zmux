import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptDir);
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const bunCommand = process.platform === "win32" ? "bun.exe" : "bun";

async function main() {
  await runParallel([
    () => runNodeScript("scripts/build-t3-embed.mjs"),
    () => runNodeScript("scripts/vp.mjs", ["build", "--config", "vite.sidebar.config.ts"]),
    () => runNodeScript("scripts/vp.mjs", ["build", "--config", "vite.debug-panel.config.ts"]),
    () => runNodeScript("scripts/vp.mjs", ["build", "--config", "vite.workspace.config.ts"]),
    async () => {
      await run(pnpmCommand, [
        "exec",
        "tailwindcss",
        "-i",
        "./chat-history/src/webview/index.css",
        "-o",
        "./chat-history/dist/webview.css",
        "--minify",
      ]);
      await run(bunCommand, ["run", "./chat-history/esbuild.webview.ts"]);
    },
  ]);

  await runNodeScript("node_modules/typescript/bin/tsc", ["-p", "./tsconfig.extension.json"]);
  await runNodeScript("scripts/vendor-runtime-deps.mjs");
}

function runNodeScript(relativePath, args = []) {
  return run(process.execPath, [join(repoRoot, relativePath), ...args]);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: ["ignore", "inherit", "inherit"],
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${command} ${args.join(" ")}`));
    });
  });
}

function runParallel(tasks) {
  return Promise.all(tasks.map((task) => task()));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
