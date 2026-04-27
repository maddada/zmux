#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import WebSocket from "ws";

const execFileAsync = promisify(execFile);
const DEFAULT_PORT = 58743;
const ZMUX_HOME = path.join(homedir(), ".zmux");
const LOG_DIR = path.join(ZMUX_HOME, "logs");
const CLI_DIR = path.join(ZMUX_HOME, "cli");

const COMMANDS = new Map([
  ["state", bridgeAction("state")],
  ["dump-state", bridgeAction("dumpState")],
  ["create-session", bridgeAction("createSession", parseCreateSession)],
  ["create-agent", bridgeAction("createAgentSession", parseAgent)],
  ["run-agent", bridgeAction("runAgent", parseAgent)],
  ["run-command", bridgeAction("runCommand", parseCommandButton)],
  ["click-button", bridgeAction("clickButton", parseClickButton)],
  ["focus-session", bridgeAction("focusSession", parseSessionSelector)],
  ["focus-group", bridgeAction("focusGroup", parseGroup)],
  ["switch-project", bridgeAction("switchProject", parseProject)],
  ["add-project", bridgeAction("addProject", parseProjectPath)],
  ["close-session", bridgeAction("closeSession", parseSessionSelector)],
  ["restart-session", bridgeAction("restartSession", parseSessionSelector)],
  ["fork-session", bridgeAction("forkSession", parseSessionSelector)],
  ["reload-session", bridgeAction("fullReloadSession", parseSessionSelector)],
  ["rename-session", bridgeAction("renameSession", parseRename)],
  ["sleep-session", bridgeAction("sleepSession", parseSessionBoolean("sleeping"))],
  ["favorite-session", bridgeAction("favoriteSession", parseSessionBoolean("favorite"))],
  ["send-text", bridgeAction("sendText", parseSendText)],
  ["send-enter", bridgeAction("sendEnter", parseSessionSelector)],
  ["send-key", bridgeAction("sendKey", parseSendKey)],
  ["rename-command", bridgeAction("renameCommand", parseRename)],
  ["toggle-section", bridgeAction("toggleSection", parseToggleSection)],
  ["set-visible-count", bridgeAction("setVisibleCount", parseVisibleCount)],
  ["set-view-mode", bridgeAction("setViewMode", parseViewMode)],
  ["open-browser", bridgeAction("openBrowser", parseUrl)],
  ["show-browser", bridgeAction("showBrowser")],
  ["move-sidebar", bridgeAction("moveSidebar")],
  ["assert-card", bridgeAction("assertSidebarCard", parseAssertCard, { assertOk: true })],
  ["wait-for", bridgeAction("waitFor", parseWaitFor, { assertOk: true })],
  ["screenshot", screenshotCommand],
  ["logs", logsCommand],
  ["bundle", bundleCommand],
  ["help", helpCommand],
]);

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const [commandName = "help", ...args] = process.argv.slice(2);
  const command = COMMANDS.get(commandName);
  if (!command) {
    throw new Error(`Unknown command: ${commandName}\n\n${usage()}`);
  }
  await command(args);
}

function bridgeAction(action, parser = () => ({}), options = {}) {
  return async (args) => {
    const { flags, rest } = parseArgs(args);
    const result = await sendSidebarCliCommand(action, parser(rest, flags), flags);
    if (options.assertOk && result.ok === false) {
      printJson(result);
      process.exitCode = 1;
      return;
    }
    printJson(result);
  };
}

async function sendSidebarCliCommand(action, payload, flags = {}) {
  const port = Number(flags.port ?? process.env.ZMUX_CLI_PORT ?? DEFAULT_PORT);
  const requestId = `cli-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const socket = await connectBridge(port);
  try {
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timed out waiting for zmux sidebar CLI result (${action}).`));
      }, Number(flags.timeout ?? 15_000));
      socket.on("message", (data) => {
        const event = parseJson(String(data));
        if (event?.type !== "sidebarCliResult" || event.requestId !== requestId) {
          return;
        }
        clearTimeout(timeout);
        const payload = parseJson(event.payloadJson) ?? { rawPayloadJson: event.payloadJson };
        resolve({ ...payload, bridgeOk: event.ok });
      });
      socket.send(
        JSON.stringify({
          action,
          payloadJson: JSON.stringify(payload),
          requestId,
          type: "sidebarCliCommand",
        }),
      );
    });
  } finally {
    socket.close();
  }
}

function connectBridge(port) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    socket.once("open", () => resolve(socket));
    socket.once("error", () => {
      reject(new Error(`Could not connect to zmux bridge on port ${port}. Is zmux running?`));
    });
  });
}

async function screenshotCommand(args) {
  const { flags, rest } = parseArgs(args);
  const output = path.resolve(rest[0] ?? path.join(CLI_DIR, `screenshot-${timestampSlug()}.png`));
  await captureScreenshot(output, flags);
  printJson({ ok: true, output });
}

async function logsCommand(args) {
  const { flags } = parseArgs(args);
  const file = String(flags.file ?? "agent-detection-debug.log");
  const lines = Number(flags.lines ?? 200);
  const logPath = path.join(LOG_DIR, file);
  const text = await readFile(logPath, "utf8").catch((error) => {
    throw new Error(`Could not read ${logPath}: ${error.message}`);
  });
  const filtered = filterLogLines(text, flags).slice(-lines);
  if (flags.json) {
    printJson({ file: logPath, lines: filtered, ok: true });
    return;
  }
  console.log(filtered.join("\n"));
}

async function bundleCommand(args) {
  const { flags, rest } = parseArgs(args);
  const outputDir = path.resolve(rest[0] ?? path.join(CLI_DIR, `bundle-${timestampSlug()}`));
  await mkdir(outputDir, { recursive: true });
  const state = await sendSidebarCliCommand("state", {}, flags);
  const screenshot = path.join(outputDir, "screenshot.png");
  await captureScreenshot(screenshot, flags);
  const logs = await collectLogs(Number(flags.lines ?? 500));
  await writeFile(path.join(outputDir, "state.json"), JSON.stringify(state, null, 2));
  await writeFile(path.join(outputDir, "logs.json"), JSON.stringify(logs, null, 2));
  printJson({ logs: path.join(outputDir, "logs.json"), ok: true, outputDir, screenshot });
}

async function captureScreenshot(output, flags = {}) {
  await mkdir(path.dirname(output), { recursive: true });
  if (flags.activate !== "false") {
    await execFileAsync("osascript", ["-e", 'tell application "zmux" to activate']).catch(() => undefined);
  }
  await execFileAsync("screencapture", ["-x", output]);
}

async function collectLogs(lines) {
  const entries = await readdir(LOG_DIR).catch(() => []);
  const result = {};
  for (const file of entries.filter((entry) => entry.endsWith(".log"))) {
    const text = await readFile(path.join(LOG_DIR, file), "utf8").catch(() => "");
    result[file] = text.split(/\r?\n/).filter(Boolean).slice(-lines);
  }
  return result;
}

function parseCreateSession(rest, flags) {
  return {
    groupId: flags.groupId,
    input: flags.input ?? rest.slice(1).join(" "),
    title: flags.title ?? rest[0],
  };
}

function parseAgent(rest, flags) {
  return {
    agentId: flags.agentId ?? rest[0],
    groupId: flags.groupId,
  };
}

function parseCommandButton(rest, flags) {
  return { commandId: flags.commandId ?? rest[0] };
}

function parseClickButton(rest, flags) {
  return {
    id: flags.id ?? rest[1],
    kind: flags.kind ?? rest[0],
  };
}

function parseGroup(rest, flags) {
  return { groupId: flags.groupId ?? rest[0] };
}

function parseProject(rest, flags) {
  return {
    name: flags.name,
    path: flags.path ?? rest[0],
    projectId: flags.projectId,
  };
}

function parseProjectPath(rest, flags) {
  return {
    name: flags.name,
    path: flags.path ?? rest[0],
  };
}

function parseSessionSelector(rest, flags) {
  return {
    index: flags.index === undefined ? undefined : Number(flags.index),
    sessionId: flags.sessionId ?? rest[0],
    sessionNumber: flags.sessionNumber === undefined ? undefined : Number(flags.sessionNumber),
  };
}

function parseRename(rest, flags) {
  return {
    ...parseSessionSelector(rest, flags),
    title: flags.title ?? rest.slice(1).join(" "),
  };
}

function parseSessionBoolean(name) {
  return (rest, flags) => ({
    ...parseSessionSelector(rest, flags),
    [name]: parseBoolean(flags[name] ?? flags.value ?? rest[1] ?? "true"),
  });
}

function parseSendText(rest, flags) {
  return {
    ...parseSessionSelector(rest, flags),
    text: flags.text ?? rest.slice(1).join(" "),
  };
}

function parseSendKey(rest, flags) {
  return {
    ...parseSessionSelector(rest, flags),
    key: flags.key ?? rest[1],
  };
}

function parseToggleSection(rest, flags) {
  return {
    collapsed: flags.collapsed === undefined ? undefined : parseBoolean(flags.collapsed),
    section: flags.section ?? rest[0],
  };
}

function parseVisibleCount(rest, flags) {
  return { count: Number(flags.count ?? rest[0]) };
}

function parseViewMode(rest, flags) {
  return { mode: flags.mode ?? rest[0] };
}

function parseUrl(rest, flags) {
  return { url: flags.url ?? rest[0] };
}

function parseAssertCard(rest, flags) {
  return {
    ...parseSessionSelector(rest, flags),
    agentIcon: flags.agentIcon,
    agentName: flags.agentName,
    visible: flags.visible === undefined ? undefined : parseBoolean(flags.visible),
  };
}

function parseWaitFor(rest, flags) {
  return {
    ...parseAssertCard(rest, flags),
    intervalMs: flags.intervalMs === undefined ? undefined : Number(flags.intervalMs),
    timeoutMs: flags.timeoutMs === undefined ? undefined : Number(flags.timeoutMs),
  };
}

function parseArgs(args) {
  const flags = {};
  const rest = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      rest.push(arg);
      continue;
    }
    const body = arg.slice(2);
    const equalsIndex = body.indexOf("=");
    if (equalsIndex >= 0) {
      flags[toCamelCase(body.slice(0, equalsIndex))] = body.slice(equalsIndex + 1);
      continue;
    }
    const key = toCamelCase(body);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    index += 1;
  }
  return { flags, rest };
}

function filterLogLines(text, flags) {
  let lines = text.split(/\r?\n/).filter(Boolean);
  if (flags.since) {
    lines = lines.filter((line) => line.includes(String(flags.since)) || line > `[${flags.since}`);
  }
  if (flags.grep) {
    lines = lines.filter((line) => line.includes(String(flags.grep)));
  }
  return lines;
}

function parseBoolean(value) {
  return value === true || value === "true" || value === "1" || value === "yes";
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function helpCommand() {
  console.log(usage());
}

function usage() {
  return `zmux CLI

Usage:
  bun scripts/zmux-cli.mjs <command> [args] [--flags]

Core commands:
  state | dump-state
  create-session [title] [--input text] [--group-id id]
  create-agent <agentId> [--group-id id]
  run-agent <agentId>
  run-command <commandId>
  click-button <agent|command|section> <id>
  focus-session <sessionId> | --index n | --session-number n
  focus-group <groupId>
  switch-project --project-id id | --path path | --name name
  add-project <path> [--name name]
  send-text <sessionId> <text>
  send-enter <sessionId>
  send-key <sessionId> <ctrl-c|escape|tab|arrow-up|arrow-down|arrow-left|arrow-right>
  rename-command <sessionId> <title>
  rename-session <sessionId> <title>
  close-session|restart-session|fork-session|reload-session <sessionId>
  sleep-session|favorite-session <sessionId> [true|false]
  toggle-section <actions|agents> [--collapsed true|false]
  set-visible-count <1|2|3|4|6|9>
  set-view-mode <grid|horizontal|vertical>
  open-browser [url]
  show-browser
  move-sidebar

Evidence commands:
  screenshot [output.png]
  logs [--file agent-detection-debug.log] [--lines 200] [--grep text] [--json]
  bundle [output-dir] [--lines 500]
  assert-card <sessionId> [--agent-icon codex] [--agent-name codex] [--visible true]
  wait-for <sessionId> [--agent-icon codex] [--timeout-ms 5000]
`;
}
