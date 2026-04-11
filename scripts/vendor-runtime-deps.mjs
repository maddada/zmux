import { cp, mkdir, readdir, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outNodeModulesDir = path.join(repoRoot, "out", "extension", "node_modules");
const require = createRequire(import.meta.url);

const runtimePackages = ["ws", "@lydell/node-pty", "@xterm/addon-serialize", "@xterm/headless"];

async function main() {
  await rm(outNodeModulesDir, { force: true, recursive: true });
  await mkdir(outNodeModulesDir, { recursive: true });

  for (const packageName of runtimePackages) {
    await copyPackage(packageName);
  }

  await copyInstalledNodePtyPlatformPackages();
}

async function copyPackage(packageName) {
  const sourceDir = await resolvePackageDir(packageName);
  const destinationDir = path.join(outNodeModulesDir, packageName);
  await mkdir(path.dirname(destinationDir), { recursive: true });
  await cp(sourceDir, destinationDir, { dereference: true, recursive: true });
}

async function copyInstalledNodePtyPlatformPackages() {
  const nodePtyDir = await resolvePackageDir("@lydell/node-pty");
  const lydellDir = path.join(nodePtyDir, "..");
  const entries = await readdir(lydellDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) {
      continue;
    }
    if (!entry.name.startsWith("node-pty-")) {
      continue;
    }
    const sourceDir = path.join(lydellDir, entry.name);
    const destinationDir = path.join(outNodeModulesDir, "@lydell", entry.name);
    await mkdir(path.dirname(destinationDir), { recursive: true });
    await cp(sourceDir, destinationDir, { dereference: true, recursive: true });
  }
}

async function resolvePackageDir(packageName) {
  const packageEntryPath = require.resolve(packageName, {
    paths: [repoRoot],
  });
  let currentDir = path.dirname(packageEntryPath);
  const repoRootPath = path.parse(currentDir).root;

  while (currentDir !== repoRootPath) {
    const packageJsonPath = path.join(currentDir, "package.json");
    try {
      const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
      if (packageJson?.name === packageName) {
        return currentDir;
      }
    } catch {
      // Keep walking upward until the package root is found.
    }
    currentDir = path.dirname(currentDir);
  }

  throw new Error(`Unable to resolve package root for ${packageName}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
