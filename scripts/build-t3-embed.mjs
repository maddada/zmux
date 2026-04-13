import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const repoRoot = process.cwd();
const embedRoot = process.env.VSMUX_T3_REPO_ROOT?.trim() || resolve(repoRoot, "..", "dpcode-embed");
const vendorWebRoot = resolve(embedRoot, "apps", "web");
const serverRoot = resolve(embedRoot, "apps", "server");
const webDistRoot = resolve(vendorWebRoot, "dist");
const serverDistRoot = resolve(serverRoot, "dist");
const packagedWebDistRoot = resolve(repoRoot, "out", "t3-embed");
const packagedServerRoot = resolve(repoRoot, "out", "dpcode-server");
const packagedServerDistRoot = resolve(packagedServerRoot, "dist");
const packagedServerNodeModulesRoot = resolve(packagedServerRoot, "node_modules");
const embedNodeModulesRoot = resolve(embedRoot, "node_modules");
const embedPackageJsonPath = resolve(embedRoot, "package.json");
const serverPackageJsonPath = resolve(serverRoot, "package.json");
const embedLockfilePaths = [resolve(embedRoot, "bun.lock"), resolve(embedRoot, "bun.lockb")];
const embedInstallStampPath = resolve(embedNodeModulesRoot, ".vsmux-install-stamp");
const requireFromServer = createRequire(join(serverRoot, "package.json"));

if (!existsSync(vendorWebRoot)) {
  throw new Error(
    `Missing ${vendorWebRoot}. Sync the sibling dpcode-embed checkout or set VSMUX_T3_REPO_ROOT.`,
  );
}

if (!existsSync(serverRoot)) {
  throw new Error(
    `Missing ${serverRoot}. Sync the sibling dpcode-embed checkout or set VSMUX_T3_REPO_ROOT.`,
  );
}

ensureEmbedDependencies();
run("bun", ["run", "build"], {
  cwd: vendorWebRoot,
  env: {
    ...process.env,
    T3CODE_WEB_SOURCEMAP: "false",
  },
});
run("bun", ["run", "build"], { cwd: serverRoot });
pruneMaps(webDistRoot);
pruneMaps(serverDistRoot);
syncPackagedArtifacts(webDistRoot, packagedWebDistRoot);
bundleServerRuntime();

function copyTree(source, destination) {
  cpSync(source, destination, {
    dereference: true,
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

function ensureEmbedDependencies() {
  if (!shouldInstallEmbedDependencies()) {
    return;
  }

  run("bun", ["install"], { cwd: embedRoot });
  writeInstallStamp();
}

function shouldInstallEmbedDependencies() {
  if (!existsSync(embedNodeModulesRoot)) {
    return true;
  }

  if (!existsSync(embedInstallStampPath)) {
    return true;
  }

  return readFileSync(embedInstallStampPath, "utf8") !== getDependencyFingerprint();
}

function writeInstallStamp() {
  writeFileSync(embedInstallStampPath, getDependencyFingerprint(), "utf8");
}

function getDependencyFingerprint() {
  const dependencyInputs = [
    embedPackageJsonPath,
    ...embedLockfilePaths.filter((filePath) => existsSync(filePath)),
  ];

  return JSON.stringify(
    dependencyInputs.map((filePath) => ({
      filePath,
      mtimeMs: statSync(filePath).mtimeMs,
      size: statSync(filePath).size,
    })),
  );
}

function pruneMaps(root) {
  for (const entry of readdirSync(root)) {
    const entryPath = resolve(root, entry);
    const stats = statSync(entryPath);
    if (stats.isDirectory()) {
      pruneMaps(entryPath);
      continue;
    }

    if (entry.endsWith(".map")) {
      rmSync(entryPath, { force: true });
    }
  }
}

function syncPackagedArtifacts(sourceRoot, destinationRoot) {
  rmSync(destinationRoot, { force: true, recursive: true });
  mkdirSync(destinationRoot, { recursive: true });
  copyTree(sourceRoot, destinationRoot);
}

function bundleServerRuntime() {
  syncPackagedArtifacts(serverDistRoot, packagedServerDistRoot);
  rmSync(packagedServerNodeModulesRoot, { force: true, recursive: true });
  mkdirSync(packagedServerNodeModulesRoot, { recursive: true });

  const serverPackageJson = JSON.parse(readFileSync(serverPackageJsonPath, "utf8"));
  const copiedPackageNames = new Set();
  for (const dependencyName of Object.keys(serverPackageJson.dependencies ?? {})) {
    copyInstalledDependencyClosure(dependencyName, copiedPackageNames);
  }

  writeFileSync(
    resolve(packagedServerRoot, "package.json"),
    JSON.stringify(
      {
        name: "vsmux-dpcode-server",
        private: true,
        type: "module",
      },
      null,
      2,
    ),
    "utf8",
  );
}

function copyInstalledDependencyClosure(packageName, copiedPackageNames, parentPackageDir) {
  if (copiedPackageNames.has(packageName)) {
    return;
  }

  const sourceDir = resolveInstalledPackageDir(packageName, parentPackageDir);
  if (!sourceDir) {
    return;
  }

  copiedPackageNames.add(packageName);
  const destinationDir = resolve(packagedServerNodeModulesRoot, packageName);
  mkdirSync(dirname(destinationDir), { recursive: true });
  copyTree(sourceDir, destinationDir);

  const packageJsonPath = resolve(sourceDir, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const dependencyNames = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
  ]);

  for (const dependencyName of dependencyNames) {
    copyInstalledDependencyClosure(dependencyName, copiedPackageNames, sourceDir);
  }
}

function resolveInstalledPackageDir(packageName, parentPackageDir) {
  const packageEntryPath = resolveInstalledPackageEntryPath(packageName, parentPackageDir);
  if (!packageEntryPath) {
    return undefined;
  }

  let currentDir = dirname(packageEntryPath);
  const filesystemRoot = parse(currentDir).root;

  while (currentDir !== filesystemRoot) {
    const packageJsonPath = resolve(currentDir, "package.json");
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
        if (packageJson?.name === packageName) {
          return currentDir;
        }
      } catch {
        // Keep walking upward until we find the package root.
      }
    }

    const nextDir = dirname(currentDir);
    if (nextDir === currentDir) {
      break;
    }
    currentDir = nextDir;
  }

  return undefined;
}

function resolveInstalledPackageEntryPath(packageName, parentPackageDir) {
  const candidateSpecifiers = [`${packageName}/package.json`, packageName];

  const requireFn = parentPackageDir
    ? createRequire(join(parentPackageDir, "package.json"))
    : requireFromServer;

  for (const specifier of candidateSpecifiers) {
    try {
      return requireFn.resolve(specifier);
    } catch {
      // Try the next resolution strategy.
    }
  }

  return undefined;
}
