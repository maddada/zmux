#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const statePath = join(repoRoot, ".vsmux", "t3code-build-state.json");
const ignoredDirectoryNames = new Set([
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "dist-electron",
  "node_modules",
  "storybook-static",
]);

/**
 * CDXC:T3Code 2026-05-02-01:05
 * `bun run start` launches the native app against the local t3code-embed fork,
 * so the fork's server and web assets must be current before zmux opens a T3
 * pane. Fingerprint source files outside generated output and rebuild only
 * when that fingerprint changes, preserving fast no-op starts while preventing
 * stale web/server contract mismatches.
 */
async function main() {
  const t3Root = resolveT3CodeRoot();
  if (!t3Root || !existsSync(join(t3Root, "package.json"))) {
    console.warn("[t3code] Skipping build check; t3code-embed checkout was not found.");
    return;
  }

  const digest = await fingerprintTree(t3Root);
  const previous = await readPreviousState();
  const missingBuildOutput = hasMissingBuildOutput(t3Root);
  if (previous?.root === t3Root && previous?.digest === digest && !missingBuildOutput) {
    console.log("[t3code] Build is current; skipping.");
    return;
  }

  const reason = missingBuildOutput ? "missing build output" : "source changes detected";
  console.log(`[t3code] Running build (${reason})...`);
  const result = spawnSync("bun", ["run", "build"], {
    cwd: t3Root,
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(
    statePath,
    `${JSON.stringify({ digest, root: t3Root, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
  console.log("[t3code] Build finished.");
}

function resolveT3CodeRoot() {
  const override =
    process.env.VSMUX_T3CODE_REPO_ROOT?.trim() || process.env.zmux_T3CODE_REPO_ROOT?.trim();
  if (override) {
    return override;
  }
  return join(homedir(), "dev", "_active", "t3code-embed");
}

async function readPreviousState() {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    return undefined;
  }
}

function hasMissingBuildOutput(t3Root) {
  return (
    !existsSync(join(t3Root, "apps", "web", "dist", "index.html")) ||
    !existsSync(join(t3Root, "apps", "server", "dist", "client", "index.html"))
  );
}

async function fingerprintTree(root) {
  const files = [];
  await collectSourceFiles(root, root, files);
  files.sort();

  const treeHash = createHash("sha256");
  for (const file of files) {
    const contents = await readFile(join(root, file));
    treeHash.update(file);
    treeHash.update("\0");
    treeHash.update(createHash("sha256").update(contents).digest("hex"));
    treeHash.update("\0");
  }
  return treeHash.digest("hex");
}

async function collectSourceFiles(root, current, files) {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".DS_Store") {
      continue;
    }
    const absolutePath = join(current, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectoryNames.has(entry.name)) {
        continue;
      }
      await collectSourceFiles(root, absolutePath, files);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const info = await stat(absolutePath);
    if (info.size > 20 * 1024 * 1024) {
      continue;
    }
    files.push(relative(root, absolutePath));
  }
}

main().catch((error) => {
  console.error("[t3code] Build check failed:", error);
  process.exit(1);
});
