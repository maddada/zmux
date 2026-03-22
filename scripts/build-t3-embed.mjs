import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
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
run("bun", ["run", "build"], { cwd: vendorWebRoot });

rmSync(distRoot, { force: true, recursive: true });
mkdirSync(distRoot, { recursive: true });
copyTree(vendorWebDistRoot, distRoot);

function copyTree(source, destination) {
  cpSync(source, destination, {
    force: true,
    recursive: true,
  });
}

function run(command, args, options) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}
