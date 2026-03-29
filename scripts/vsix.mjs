import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const validModes = new Set(["package", "install"]);

function fail(message) {
  console.error(message);
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

function run(command, args, options = {}) {
  const useCmdShim = process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
  const result = useCmdShim
    ? spawnSync(
        process.env.ComSpec ?? "cmd.exe",
        ["/d", "/s", "/c", [quoteCmdArg(command), ...args.map(quoteCmdArg)].join(" ")],
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

function runCapture(command, args, options = {}) {
  const useCmdShim = process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
  const result = useCmdShim
    ? spawnSync(
        process.env.ComSpec ?? "cmd.exe",
        ["/d", "/s", "/c", [quoteCmdArg(command), ...args.map(quoteCmdArg)].join(" ")],
        {
          cwd: repoRoot,
          encoding: "utf8",
          shell: false,
          stdio: ["ignore", "pipe", "pipe"],
          ...options,
        },
      )
    : spawnSync(command, args, {
        cwd: repoRoot,
        encoding: "utf8",
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        ...options,
      });

  if (result.error) {
    fail(result.error.message);
  }

  return result;
}

function commandExists(command) {
  const which = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(which, [command], {
    cwd: repoRoot,
    stdio: "ignore",
  });

  return result.status === 0;
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
      console.warn(`Existing VSIX is locked, using ${fallbackPath} instead.`);
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
      : [
          "code",
          "code-insiders",
          "cursor",
          "cursor-insiders",
          "codium",
          "windsurf",
        ];

  return candidates.find(commandExists);
}

function listInstalledExtensions(vscodeCli) {
  const result = runCapture(vscodeCli, ["--list-extensions", "--show-versions"]);
  if (result.status !== 0) {
    return [];
  }

  return (result.stdout ?? "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function uninstallIfInstalled(vscodeCli, extensionId) {
  const installedExtensions = listInstalledExtensions(vscodeCli);
  const normalizedExtensionId = extensionId.toLowerCase();
  const isInstalled = installedExtensions.some((line) => {
    const [installedId] = line.split("@", 1);
    return installedId?.trim().toLowerCase() === normalizedExtensionId;
  });

  if (!isInstalled) {
    return;
  }

  console.log(`Uninstalling existing ${extensionId} before reinstalling...`);
  run(vscodeCli, ["--uninstall-extension", extensionId]);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptDir);
const mode = process.argv[2];

if (!validModes.has(mode)) {
  fail("Usage: node ./scripts/vsix.mjs <package|install>");
}

const packageJson = await import(new URL("../package.json", import.meta.url), {
  with: { type: "json" },
});
const extensionName = packageJson.default.name;
const extensionVersion = packageJson.default.version;
const extensionPublisher = packageJson.default.publisher;
const extensionId = `${extensionPublisher}.${extensionName}`;
const installerDir = join(repoRoot, "installer");

if (!existsSync(installerDir)) {
  mkdirSync(installerDir, { recursive: true });
}

const vsixPath = resolveVsixPath(installerDir, extensionName, extensionVersion, mode);

run("pnpm", ["run", "compile"]);

run("vp", [
  "exec",
  "vsce",
  "package",
  "--no-dependencies",
  "--skip-license",
  "--allow-unused-files-pattern",
  "--out",
  vsixPath,
]);

console.log(`Packaged VSIX: ${vsixPath}`);

if (mode === "package") {
  process.exit(0);
}

const vscodeCli = resolveCodeCli();

if (!vscodeCli) {
  fail(
    "Could not find an editor CLI. Install the 'code' or 'cursor' command, or set VSMUX_CODE_CLI.",
  );
}

uninstallIfInstalled(vscodeCli, extensionId);
run(vscodeCli, ["--install-extension", vsixPath, "--force"]);

console.log(`Installed ${extensionId} with ${vscodeCli} from ${vsixPath}`);
