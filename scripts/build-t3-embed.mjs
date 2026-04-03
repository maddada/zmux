import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const embedRoot = resolve(repoRoot, "forks", "t3code-embed");
const vendorRoot = resolve(embedRoot, "upstream");
const overlayRoot = resolve(embedRoot, "overlay");
const distRoot = resolve(embedRoot, "dist");
const vendorWebRoot = resolve(vendorRoot, "apps", "web");
const vendorWebDistRoot = resolve(vendorWebRoot, "dist");

if (!existsSync(vendorRoot)) {
  throw new Error("Missing forks/t3code-embed/upstream. Refresh the local T3 vendor clone first.");
}

if (!existsSync(overlayRoot)) {
  throw new Error(
    "Missing forks/t3code-embed/overlay. Copy your local T3 patch overlay there first.",
  );
}

copyTree(overlayRoot, vendorRoot);
run("bun", ["install"], { cwd: vendorRoot });
run("bun", ["run", "build"], {
  cwd: vendorWebRoot,
  env: {
    ...process.env,
    T3CODE_WEB_SOURCEMAP: "false",
  },
});

rmSync(distRoot, { force: true, recursive: true });
mkdirSync(distRoot, { recursive: true });
copyTree(vendorWebDistRoot, distRoot);
pruneEmbedArtifacts(distRoot);

function copyTree(source, destination) {
  cpSync(source, destination, {
    force: true,
    recursive: true,
  });
}

function run(command, args, options) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    ...(options.env ? { env: options.env } : {}),
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function pruneEmbedArtifacts(root) {
  for (const entry of readdirSync(root)) {
    const entryPath = resolve(root, entry);
    const stats = statSync(entryPath);
    if (stats.isDirectory()) {
      pruneEmbedArtifacts(entryPath);
      continue;
    }

    if (entry.endsWith(".map") || entry === "mockServiceWorker.js") {
      rmSync(entryPath, { force: true });
    }
  }
}
