import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const validModes = new Set(["package", "install"]);
const profileBuildFlag = "--profile-build";

function fail(message) {
  void message;
  process.exit(1);
}

function quoteCmdArg(value) {
  if (value.length === 0) {
    return '""';
  }

  if (!/[\s"]/u.test(value)) {
    return value;
  }

  return `"${value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, "$1$1")}"`;
}

function quotePowerShellArg(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function run(command, args, options = {}) {
  const useCmdShim = process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
  const result = useCmdShim
    ? spawnSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `& ${quotePowerShellArg(command)} ${args.map(quotePowerShellArg).join(" ")}`,
        ],
        {
          cwd: repoRoot,
          stdio: "inherit",
          ...options,
        },
      )
    : spawnSync(command, args, {
        cwd: repoRoot,
        stdio: "inherit",
        shell: false,
        ...options,
      });

  if (result.error) {
    fail(result.error.message);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function getPathEntries() {
  const pathValue = process.env.PATH ?? process.env.Path ?? process.env.path ?? "";
  return pathValue
    .split(delimiter)
    .map((entry) => entry.trim().replace(/^"(.*)"$/u, "$1"))
    .filter(Boolean);
}

function resolveFromPath(command) {
  const candidateNames =
    process.platform === "win32" && !/[.][^\\/.]+$/u.test(command)
      ? [`${command}.cmd`, `${command}.exe`, `${command}.bat`, command]
      : [command];

  for (const entry of getPathEntries()) {
    for (const candidateName of candidateNames) {
      const candidatePath = join(entry, candidateName);
      if (existsSync(candidatePath)) {
        return candidatePath;
      }
    }
  }

  return undefined;
}

function resolveCommand(command) {
  if (command.includes("/") || command.includes("\\")) {
    return existsSync(command) ? command : undefined;
  }

  const localBinDir = join(repoRoot, "node_modules", ".bin");
  const localCandidates =
    process.platform === "win32"
      ? [
          join(localBinDir, `${command}.cmd`),
          join(localBinDir, `${command}.exe`),
          join(localBinDir, `${command}.bat`),
        ]
      : [join(localBinDir, command)];

  for (const candidate of localCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return resolveFromPath(command);
}

function findFirstAvailableCommand(candidates) {
  for (const candidate of candidates) {
    const resolved = resolveCommand(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return undefined;
}

function findPackageBinaryPath(packagePrefix, relativePath) {
  const pnpmDir = join(repoRoot, "node_modules", ".pnpm");
  if (!existsSync(pnpmDir)) {
    return undefined;
  }

  const entries = new Set(readdirSync(pnpmDir));

  const match = [...entries].find((entry) => entry.startsWith(packagePrefix));
  return match ? join(pnpmDir, match, ...relativePath) : undefined;
}

function resolveVsixPath(installerDir, extensionName, extensionVersion, mode) {
  const baseName = `${extensionName}-${extensionVersion}`;
  if (mode === "install") {
    return join(installerDir, `${baseName}-${Date.now()}.vsix`);
  }

  const defaultPath = join(installerDir, `${baseName}.vsix`);

  try {
    rmSync(defaultPath, { force: true });
    return defaultPath;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EPERM") {
      const fallbackPath = join(installerDir, `${baseName}-${Date.now()}.vsix`);
      return fallbackPath;
    }

    throw error;
  }
}

function resolveCodeCli() {
  const override = process.env.VSMUX_CODE_CLI?.trim();
  if (override) {
    return override;
  }

  const pathCandidates =
    process.platform === "darwin"
      ? [
          "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
          "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code",
          "/Applications/Cursor.app/Contents/Resources/app/bin/cursor",
          "/Applications/Cursor.app/Contents/Resources/app/bin/code",
          "/Applications/VSCodium.app/Contents/Resources/app/bin/codium",
          `${process.env.HOME}/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code`,
          `${process.env.HOME}/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code`,
          `${process.env.HOME}/Applications/Cursor.app/Contents/Resources/app/bin/cursor`,
          `${process.env.HOME}/Applications/Cursor.app/Contents/Resources/app/bin/code`,
          `${process.env.HOME}/Applications/VSCodium.app/Contents/Resources/app/bin/codium`,
        ]
      : [];

  const candidates =
    process.platform === "win32"
      ? [
          "code.cmd",
          "code-insiders.cmd",
          "cursor.cmd",
          "cursor-insiders.cmd",
          "codium.cmd",
          "windsurf.cmd",
          "code",
          "code-insiders",
          "cursor",
          "cursor-insiders",
          "codium",
          "windsurf",
        ]
      : ["code", "code-insiders", "cursor", "cursor-insiders", "codium", "windsurf"];

  return findFirstAvailableCommand([...candidates, ...pathCandidates]);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptDir);
const mode = process.argv[2];
const profileBuild = process.argv.includes(profileBuildFlag);

if (!validModes.has(mode)) {
  fail(`Usage: node ./scripts/vsix.mjs <package|install> [${profileBuildFlag}]`);
}

const packageJson = await import(new URL("../package.json", import.meta.url), {
  with: { type: "json" },
});
const extensionName = packageJson.default.name;
const extensionVersion = packageJson.default.version;
const extensionPublisher = packageJson.default.publisher;
const installerDir = join(repoRoot, "installer");
const pnpmCli = resolveCommand("pnpm");
const vsceCli = findPackageBinaryPath("@vscode+vsce@", ["node_modules", "@vscode", "vsce", "vsce"]);

if (!existsSync(installerDir)) {
  mkdirSync(installerDir, { recursive: true });
}

const vsixPath = resolveVsixPath(installerDir, extensionName, extensionVersion, mode);

if (!pnpmCli) {
  fail("Could not find pnpm. Install pnpm and retry.");
}

if (!vsceCli) {
  fail("Could not find the local @vscode/vsce CLI. Run pnpm install and retry.");
}

run(pnpmCli, ["run", "compile"], {
  env: {
    ...process.env,
    ...(profileBuild ? { VSMUX_PROFILE_BUILD: "1" } : {}),
  },
});

run(
  process.execPath,
  [
    vsceCli,
    "package",
    "--no-dependencies",
    "--skip-license",
    "--allow-unused-files-pattern",
    "--out",
    vsixPath,
  ],
  {
    env: {
      ...process.env,
      VSMUX_SKIP_PREPUBLISH: "1",
    },
  },
);

if (mode === "package") {
  process.exit(0);
}

const vscodeCli = resolveCodeCli();

if (!vscodeCli) {
  fail(
    "Could not find an editor CLI. Install the 'code' or 'cursor' command, or set VSMUX_CODE_CLI to the editor binary path.",
  );
}

run(vscodeCli, ["--install-extension", vsixPath, "--force"]);
