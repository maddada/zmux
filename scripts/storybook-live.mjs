import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const STORYBOOK_PORT = 6006;
const LIVE_STORY_ID = "workspace-live-debug-shell--claude-and-gemini";
const LIVE_MANAGER_URL = `http://127.0.0.1:${String(STORYBOOK_PORT)}/?path=/story/${LIVE_STORY_ID}`;
const LIVE_IFRAME_URL = `http://127.0.0.1:${String(STORYBOOK_PORT)}/iframe.html?id=${LIVE_STORY_ID}&viewMode=story`;

const serverProcess = spawn(
  process.execPath,
  [path.join(process.cwd(), "scripts", "storybook-live-server.mjs")],
  {
    detached: true,
    stdio: "ignore",
  },
);
serverProcess.unref();

const storybookProcess = spawn(
  "pnpm",
  ["exec", "storybook", "dev", "--ci", "--no-open", "--exact-port", "-p", String(STORYBOOK_PORT)],
  {
    stdio: "inherit",
  },
);

storybookProcess.on("exit", (code) => {
  process.exit(typeof code === "number" ? code : 0);
});
