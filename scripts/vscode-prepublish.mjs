import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptDir);

if (process.env.VSMUX_SKIP_PREPUBLISH === "1") {
  process.exit(0);
}

const result = spawnSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["run", "build:extension"],
  {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
