import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptDir);

const packageJson = await import(new URL("../package.json", import.meta.url), {
  with: { type: "json" },
});
const extensionVersion = packageJson.default.version;
const tagName = `v${extensionVersion}`;

function fail(message) {
  if (message) {
    console.error(message);
  }

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

  return result;
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    fail(result.error.message);
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    fail(stderr || `Command failed: ${command} ${args.join(" ")}`);
  }

  return result.stdout.trim();
}

function ensureCleanGitWorktree() {
  const status = capture("git", ["status", "--short"]);
  if (status.length > 0) {
    fail("Refusing to publish with uncommitted changes. Commit or stash your work first.");
  }
}

function ensureTagDoesNotExist() {
  const existingTag = capture("git", ["tag", "--list", tagName]);
  if (existingTag.length > 0) {
    fail(`Git tag ${tagName} already exists.`);
  }
}

function getCurrentBranch() {
  return capture("git", ["branch", "--show-current"]);
}

ensureCleanGitWorktree();
ensureTagDoesNotExist();

const branchName = getCurrentBranch();
if (!branchName) {
  fail("Refusing to publish from a detached HEAD. Check out a branch first.");
}

run("vp", [
  "exec",
  "vsce",
  "publish",
  "--no-dependencies",
  "--skip-license",
  "--allow-unused-files-pattern",
]);

run("git", ["tag", "-a", tagName, "-m", `Release ${tagName}`]);
run("git", ["push", "origin", branchName, "--follow-tags"]);
