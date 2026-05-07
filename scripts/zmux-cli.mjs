#!/usr/bin/env node
import { execFile, spawn } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import WebSocket from "ws";

const execFileAsync = promisify(execFile);
const DEFAULT_PORT = 58743;
const DEV_PORT = 58744;
const ZMUX_HOME = path.join(homedir(), ".zmux");
const LOG_DIR = path.join(ZMUX_HOME, "logs");
const CLI_DIR = path.join(ZMUX_HOME, "cli");
const SESSION_ALIAS_CACHE_PATH = path.join(CLI_DIR, "session-aliases.json");

const COMMANDS = new Map([
  ["sessions", sessionsCommand],
  ["s", sessionsCommand],
  ["list-sessions", sessionsCommand],
  ["ls", sessionsCommand],
  ["attach", attachSessionCommand],
  ["a", attachSessionCommand],
  ["resume", attachSessionCommand],
  ["r", attachSessionCommand],
  ["kill", sessionActionCommand("closeSession", "killed")],
  ["k", sessionActionCommand("closeSession", "killed")],
  ["sleep", sessionActionCommand("sleepSession", "slept", { sleeping: true })],
  ["wake", sessionActionCommand("sleepSession", "woke", { sleeping: false })],
  ["focus", focusSmartSessionCommand],
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
  ["open-browser-pane", bridgeAction("openBrowserPane")],
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
  if (commandName === "-h" || commandName === "--help") {
    helpCommand();
    return;
  }
  const command = COMMANDS.get(commandName);
  if (!command) {
    throw new Error(`Unknown command: ${commandName}\n\n${usage()}`);
  }
  if (args.includes("-h") || args.includes("--help")) {
    helpCommand();
    return;
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
  const port = Number(
    flags.port ??
      process.env.ZMUX_CLI_PORT ??
      (process.env.ZMUX_APP_VARIANT === "dev" ? DEV_PORT : DEFAULT_PORT),
  );
  const requestId = `cli-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const socket = await connectBridge(port);
  try {
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => {
          reject(new Error(`Timed out waiting for zmux sidebar CLI result (${action}).`));
        },
        Number(flags.timeout ?? 15_000),
      );
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
    await execFileAsync("osascript", ["-e", 'tell application "zmux" to activate']).catch(
      () => undefined,
    );
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

async function sessionsCommand(args) {
  const { flags } = parseArgs(args);
  const result = await fetchSessionList(flags, { writeCache: true });
  if (flags.json) {
    printJson(result);
    return;
  }
  printSessionList(result.sessions ?? [], {
    grouped: flags.ungrouped !== true && flags.u !== true,
  });
}

async function attachSessionCommand(args) {
  const { flags, rest } = parseArgs(args);
  const selector = rest.join(" ").trim();
  const result = await fetchSessionList(flags);
  const session = await resolveOneListedSession(selector, result.sessions ?? []);
  const command = session.attachCommand || session.resumeCommand;
  if (!command) {
    throw new Error(
      `Session ${session.alias} has no provider attach command or supported agent resume command.`,
    );
  }
  await runInteractiveShellCommand(command, session.projectPath);
}

function sessionActionCommand(action, pastTense, extraPayload = {}) {
  return async (args) => {
    const { flags, rest } = parseArgs(args);
    const selector = rest.join(" ").trim();
    const result = await fetchSessionList(flags);
    const sessions =
      selector.toLowerCase() === "all"
        ? (result.sessions ?? [])
        : [await resolveOneListedSession(selector, result.sessions ?? [])];
    if (sessions.length === 0) {
      throw new Error("No running terminal sessions matched.");
    }
    const affected = [];
    for (const session of sessions) {
      const actionResult = await sendSidebarCliCommand(
        action,
        {
          ...extraPayload,
          sessionId: session.sessionId,
        },
        flags,
      );
      if (actionResult.ok === false) {
        throw new Error(actionResult.error ?? `Could not ${action} ${session.title}.`);
      }
      affected.push({ ok: actionResult.ok !== false, session });
    }
    if (flags.json) {
      printJson({ ok: affected.every((item) => item.ok), sessions: affected });
      return;
    }
    for (const item of affected) {
      console.log(`${pastTense} ${item.session.alias}: ${item.session.title}`);
    }
  };
}

async function focusSmartSessionCommand(args) {
  const { flags, rest } = parseArgs(args);
  const selector = rest.join(" ").trim();
  const result = await fetchSessionList(flags);
  const session = await resolveOneListedSession(selector, result.sessions ?? []);
  const actionResult = await sendSidebarCliCommand(
    "focusSession",
    { sessionId: session.sessionId },
    flags,
  );
  if (flags.json) {
    printJson(actionResult);
    return;
  }
  console.log(`focused ${session.alias}: ${session.title}`);
}

async function fetchSessionList(flags = {}, options = {}) {
  const result = await sendSidebarCliCommand("listSessions", {}, flags);
  if (result.ok === false) {
    throw new Error(result.error ?? "Could not list zmux sessions.");
  }
  const sessions = Array.isArray(result.sessions) ? result.sessions : [];
  if (options.writeCache === true) {
    await writeSessionAliasCache({
      createdAt: new Date().toISOString(),
      revision: result.revision,
      sessions,
    });
  }
  return { ...result, sessions };
}

async function writeSessionAliasCache(cache) {
  /**
   * CDXC:CliSessions 2026-05-07-21:22
   * The human sessions CLI uses global aliases from the last printed live list
   * so follow-up commands such as `zmux a 2` and `zmux k 4` target the rows the
   * user just saw, independent of grouped or ungrouped table formatting.
   */
  await mkdir(CLI_DIR, { recursive: true });
  await writeFile(SESSION_ALIAS_CACHE_PATH, JSON.stringify(cache, null, 2));
}

async function readSessionAliasCache() {
  const text = await readFile(SESSION_ALIAS_CACHE_PATH, "utf8").catch(() => undefined);
  return text ? parseJson(text) : undefined;
}

async function resolveOneListedSession(selector, sessions) {
  const matches = await resolveListedSessions(selector, sessions);
  if (matches.length === 1) {
    return matches[0];
  }
  if (matches.length === 0) {
    throw new Error(`No matching session found for "${selector}". Run "zmux sessions" to list sessions.`);
  }
  throw new Error(`Multiple sessions matched "${selector}":\n${formatSessionMatches(matches)}`);
}

async function resolveListedSessions(selector, sessions) {
  const normalizedSelector = selector.trim();
  if (!normalizedSelector) {
    throw new Error("Provide a session alias, id, title, or project:title selector.");
  }
  if (/^\d+$/.test(normalizedSelector)) {
    const alias = Number(normalizedSelector);
    const cache = await readSessionAliasCache();
    const cachedSessionId = cache?.sessions?.find?.((session) => session.alias === alias)?.sessionId;
    if (cachedSessionId) {
      const liveSession = sessions.find((session) => session.sessionId === cachedSessionId);
      if (liveSession) {
        return [liveSession];
      }
    }
    const liveAliasMatch = sessions.find((session) => session.alias === alias);
    return liveAliasMatch ? [liveAliasMatch] : [];
  }
  const exactId = sessions.find((session) => session.sessionId === normalizedSelector);
  if (exactId) {
    return [exactId];
  }
  const projectSeparatorIndex = normalizedSelector.indexOf(":");
  if (projectSeparatorIndex > 0) {
    const projectSelector = normalizedSelector.slice(0, projectSeparatorIndex).trim().toLowerCase();
    const titleSelector = normalizedSelector.slice(projectSeparatorIndex + 1).trim().toLowerCase();
    return rankSessionTitleMatches(
      sessions.filter(
        (session) =>
          session.projectName?.toLowerCase() === projectSelector ||
          session.projectPath?.toLowerCase().includes(projectSelector),
      ),
      titleSelector,
    );
  }
  return rankSessionTitleMatches(sessions, normalizedSelector.toLowerCase());
}

function rankSessionTitleMatches(sessions, selector) {
  const exact = sessions.filter((session) => session.title?.toLowerCase() === selector);
  if (exact.length > 0) {
    return exact;
  }
  return sessions.filter((session) => session.title?.toLowerCase().includes(selector));
}

function formatSessionMatches(sessions) {
  return sessions
    .map((session) => `${session.alias}. ${session.projectName} - ${session.title}`)
    .join("\n");
}

function printSessionList(sessions, { grouped }) {
  if (sessions.length === 0) {
    console.log("No running terminal sessions.");
    return;
  }
  if (!grouped) {
    printTable(
      ["#", "Project", "Active", "Title", "Status", "Provider", "Agent"],
      sessions.map((session) => [
        String(session.alias),
        session.projectName || "-",
        formatActiveTime(session.lastInteractionAt),
        session.title || "-",
        session.status || "-",
        session.provider || "-",
        session.agent || "-",
      ]),
    );
    return;
  }
  const groupedSessions = groupSessionsByProject(sessions);
  groupedSessions.forEach((group, index) => {
    if (index > 0) {
      console.log("");
    }
    console.log(group.projectName);
    printTable(
      ["#", "Active", "Title", "Status", "Provider", "Agent"],
      group.sessions.map((session) => [
        String(session.alias),
        formatActiveTime(session.lastInteractionAt),
        session.title || "-",
        session.status || "-",
        session.provider || "-",
        session.agent || "-",
      ]),
    );
  });
}

function groupSessionsByProject(sessions) {
  const groups = [];
  const groupsByProjectId = new Map();
  for (const session of sessions) {
    let group = groupsByProjectId.get(session.projectId);
    if (!group) {
      group = {
        projectName: session.projectName || session.projectPath || "Project",
        sessions: [],
      };
      groupsByProjectId.set(session.projectId, group);
      groups.push(group);
    }
    group.sessions.push(session);
  }
  return groups;
}

function printTable(headers, rows) {
  const widths = headers.map((header, columnIndex) =>
    Math.max(
      header.length,
      ...rows.map((row) => visibleLength(String(row[columnIndex] ?? ""))),
    ),
  );
  console.log(formatTableRow(headers, widths));
  for (const row of rows) {
    console.log(formatTableRow(row, widths));
  }
}

function formatTableRow(row, widths) {
  return row
    .map((value, index) => {
      const text = String(value ?? "");
      const padding = " ".repeat(Math.max(0, widths[index] - visibleLength(text)));
      return index === row.length - 1 ? text : `${text}${padding}`;
    })
    .join("  ");
}

function visibleLength(value) {
  return value.length;
}

function formatActiveTime(value) {
  const timestamp = Date.parse(value ?? "");
  if (!Number.isFinite(timestamp)) {
    return "-";
  }
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

async function runInteractiveShellCommand(command, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn("/bin/zsh", ["-lc", command], {
      cwd,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      process.exitCode = code ?? 0;
      resolve();
    });
  });
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
    if (arg.startsWith("-") && !arg.startsWith("--") && arg.length > 1) {
      for (const shortFlag of arg.slice(1)) {
        flags[shortFlag] = true;
      }
      continue;
    }
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
  bun scripts/zmux-cli.mjs --help | -h

Session commands:
  sessions | s | list-sessions | ls [--ungrouped|-u] [--json]
      List running terminal sessions grouped by project by default.
      Columns are: # Active Title Status Provider Agent.
      --ungrouped/-u adds the Project column and prints one flat table.

  attach | a <alias|id|title|project:title>
  resume | r <alias|id|title|project:title>
      Attach to the stored tmux/zmx/zellij provider session when present.
      If no provider is stored, run the supported agent resume command in the
      session project directory.

  kill | k <alias|id|title|project:title|all>
      Terminate one session or every listed terminal session.

  sleep <alias|id|title|project:title|all>
      Sleep one session or every listed terminal session.

  wake <alias|id|title|project:title|all>
      Wake one session or every listed terminal session.

  focus <alias|id|title|project:title>
      Focus the selected session in the zmux app.

Selector rules:
  Numeric aliases come from the last "zmux sessions" list and stay global
  across grouped and --ungrouped output. Titles match exact first, then
  case-insensitive substring. Use project:title when a title is ambiguous.

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
  open-browser-pane
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
