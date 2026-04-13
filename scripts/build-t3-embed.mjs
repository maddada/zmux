import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const embedRoot = process.env.VSMUX_T3_REPO_ROOT?.trim() || resolve(repoRoot, "..", "dpcode-embed");
const vendorWebRoot = resolve(embedRoot, "apps", "web");
const distRoot = resolve(vendorWebRoot, "dist");
const packagedDistRoot = resolve(repoRoot, "out", "t3-embed");

if (!existsSync(vendorWebRoot)) {
  throw new Error(
    `Missing ${vendorWebRoot}. Sync the sibling dpcode-embed checkout or set VSMUX_T3_REPO_ROOT.`,
  );
}

run("bun", ["install"], { cwd: embedRoot });
run("bun", ["run", "build"], {
  cwd: vendorWebRoot,
  env: {
    ...process.env,
    T3CODE_WEB_SOURCEMAP: "false",
  },
});
pruneEmbedArtifacts(distRoot);
syncPackagedEmbedArtifacts(distRoot, packagedDistRoot);

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

    if (entry.endsWith(".map")) {
      rmSync(entryPath, { force: true });
    }
  }
}

function syncPackagedEmbedArtifacts(sourceRoot, destinationRoot) {
  rmSync(destinationRoot, { force: true, recursive: true });
  mkdirSync(destinationRoot, { recursive: true });
  copyTree(sourceRoot, destinationRoot);
}
