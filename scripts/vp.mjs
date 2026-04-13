import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptDir);

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

  return resolveFromPath(command);
}

function resolveVpCli() {
  const override = process.env.VSMUX_VP_CLI?.trim();
  if (override) {
    return resolveCommand(override);
  }

  const home = process.env.HOME ?? process.env.USERPROFILE;
  const candidates =
    process.platform === "win32"
      ? [
          home && join(home, ".vite-plus", "current", "bin", "vp.exe"),
          home && join(home, ".vite-plus", "bin", "vp.exe"),
          home && join(home, ".vite-plus", "current", "node_modules", ".bin", "vp.CMD"),
          join(repoRoot, "node_modules", ".bin", "vp.cmd"),
          join(repoRoot, "node_modules", ".bin", "vp.CMD"),
          "vp",
        ]
      : [
          home && join(home, ".vite-plus", "current", "bin", "vp"),
          home && join(home, ".vite-plus", "bin", "vp"),
          join(repoRoot, "node_modules", ".bin", "vp"),
          "vp",
        ];

  for (const candidate of candidates.filter(Boolean)) {
    const resolved = resolveCommand(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return undefined;
}

const vpCli = resolveVpCli();

if (!vpCli) {
  fail(
    "Could not find the vite-plus CLI. Install vite-plus globally or set VSMUX_VP_CLI to the executable path.",
  );
}

const useCmdShim = process.platform === "win32" && /\.(cmd|bat)$/i.test(vpCli);
const result = useCmdShim
  ? spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `& ${quotePowerShellArg(vpCli)} ${process.argv.slice(2).map(quotePowerShellArg).join(" ")}`,
      ],
      {
        cwd: repoRoot,
        stdio: "inherit",
        env: process.env,
      },
    )
  : spawnSync(vpCli, process.argv.slice(2), {
      cwd: repoRoot,
      stdio: "inherit",
      env: process.env,
    });

if (result.error) {
  fail(result.error.message);
}

process.exit(result.status ?? 1);
