import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";

type AgentLifecycleEventType = "start" | "stop";

export type AgentLifecycleEvent = {
  agentName?: string;
  eventType: AgentLifecycleEventType;
};

export type ParsedAgentControlChunk = {
  events: AgentLifecycleEvent[];
  output: string;
  pending: string;
};

export type AgentShellIntegration = {
  binDir: string;
  notifyPath: string;
  opencodeConfigDir: string;
};

const AGENT_CONTROL_COMMAND = "9001";
const AGENT_CONTROL_NAMESPACE = "agent-canvas-x";
const AGENT_SHELL_DIR_NAME = "agent-shell-integration";
const NOTIFY_SCRIPT_NAME = "notify.sh";
const OPENCODE_PLUGIN_FILE_NAME = "agent-canvas-x-notify.js";
const CODEX_START_LOG_PATTERNS = [
  [`"type":"event_msg"`, `"payload":{"type":"task_started"`],
  [`"dir":"to_tui"`, `"kind":"codex_event"`, `"msg":{"type":"task_started"`],
  [`"dir":"to_tui"`, `"kind":"codex_event"`, `"msg":{"type":"exec_command_begin"`],
] as const;
const CODEX_STOP_LOG_PATTERNS = [
  [`"type":"event_msg"`, `"payload":{"type":"task_complete"`],
  [`"type":"agent-turn-complete"`],
] as const;

const integrationPromises = new Map<string, Promise<AgentShellIntegration>>();

export async function ensureAgentShellIntegration(
  daemonStateDir: string,
): Promise<AgentShellIntegration> {
  const cached = integrationPromises.get(daemonStateDir);
  if (cached) {
    return cached;
  }

  const pendingIntegration = createAgentShellIntegration(daemonStateDir);
  integrationPromises.set(daemonStateDir, pendingIntegration);

  try {
    return await pendingIntegration;
  } catch (error) {
    integrationPromises.delete(daemonStateDir);
    throw error;
  }
}

export function parseAgentControlChunk(data: string): ParsedAgentControlChunk {
  let index = 0;
  let output = "";
  const events: AgentLifecycleEvent[] = [];

  while (index < data.length) {
    if (data[index] !== "\u001b" || data[index + 1] !== "]") {
      output += data[index];
      index += 1;
      continue;
    }

    const controlStart = index;
    const terminator = findOscTerminator(data, controlStart + 2);
    if (!terminator) {
      return {
        events,
        output,
        pending: data.slice(controlStart),
      };
    }

    const controlBody = data.slice(controlStart + 2, terminator.contentEnd);
    const sequence = data.slice(controlStart, terminator.sequenceEnd);
    const parsedEvent = parseAgentControlEvent(controlBody);

    if (parsedEvent) {
      events.push(parsedEvent);
    } else {
      output += sequence;
    }

    index = terminator.sequenceEnd;
  }

  return {
    events,
    output,
    pending: "",
  };
}

export function detectCodexLifecycleEventFromLogLine(
  line: string,
): AgentLifecycleEventType | undefined {
  if (matchesLogPattern(line, CODEX_START_LOG_PATTERNS)) {
    return "start";
  }

  if (matchesLogPattern(line, CODEX_STOP_LOG_PATTERNS)) {
    return "stop";
  }

  return undefined;
}

async function createAgentShellIntegration(daemonStateDir: string): Promise<AgentShellIntegration> {
  const integrationRoot = path.join(daemonStateDir, AGENT_SHELL_DIR_NAME);
  const binDir = path.join(integrationRoot, "bin");
  const hooksDir = path.join(integrationRoot, "hooks");
  const notifyPath = path.join(hooksDir, NOTIFY_SCRIPT_NAME);
  const opencodeConfigDir = path.join(hooksDir, "opencode");
  const opencodePluginDir = path.join(opencodeConfigDir, "plugin");
  const opencodePluginPath = path.join(opencodePluginDir, OPENCODE_PLUGIN_FILE_NAME);

  await mkdir(binDir, { recursive: true });
  await mkdir(hooksDir, { recursive: true });
  await mkdir(opencodePluginDir, { recursive: true });

  await writeFileIfChanged(notifyPath, getNotifyScriptContent(), 0o755);
  await writeFileIfChanged(
    path.join(binDir, "codex"),
    getCodexWrapperContent(binDir, notifyPath),
    0o755,
  );
  await writeFileIfChanged(
    path.join(binDir, "opencode"),
    getOpenCodeWrapperContent(binDir, opencodeConfigDir),
    0o755,
  );
  await writeFileIfChanged(opencodePluginPath, getOpenCodePluginContent(notifyPath), 0o644);

  return {
    binDir,
    notifyPath,
    opencodeConfigDir,
  };
}

async function writeFileIfChanged(filePath: string, content: string, mode: number): Promise<void> {
  let existingContent: string | undefined;

  try {
    existingContent = await readFile(filePath, "utf8");
  } catch {
    existingContent = undefined;
  }

  if (existingContent === content) {
    return;
  }

  await writeFile(filePath, content, { mode });
}

function parseAgentControlEvent(controlBody: string): AgentLifecycleEvent | undefined {
  const controlParts = controlBody.split(";");
  if (
    controlParts[0] !== AGENT_CONTROL_COMMAND ||
    controlParts[1] !== AGENT_CONTROL_NAMESPACE ||
    controlParts.length < 3
  ) {
    return undefined;
  }

  const normalizedEventType = normalizeLifecycleEventType(controlParts[2]);
  if (!normalizedEventType) {
    return undefined;
  }

  const agentName = controlParts[3]?.trim() || undefined;

  return {
    agentName,
    eventType: normalizedEventType,
  };
}

function normalizeLifecycleEventType(
  value: string | undefined,
): AgentLifecycleEventType | undefined {
  switch (value?.trim().toLowerCase()) {
    case "start":
      return "start";
    case "stop":
      return "stop";
    default:
      return undefined;
  }
}

function findOscTerminator(
  data: string,
  startIndex: number,
): { contentEnd: number; sequenceEnd: number } | undefined {
  for (let index = startIndex; index < data.length; index += 1) {
    const currentCharacter = data[index];
    if (currentCharacter === "\u0007") {
      return {
        contentEnd: index,
        sequenceEnd: index + 1,
      };
    }

    if (currentCharacter === "\u001b" && data[index + 1] === "\\") {
      return {
        contentEnd: index,
        sequenceEnd: index + 2,
      };
    }
  }

  return undefined;
}

function quoteShellLiteral(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function matchesLogPattern(line: string, patterns: readonly (readonly string[])[]): boolean {
  return patterns.some((pattern) => pattern.every((fragment) => line.includes(fragment)));
}

function createShellCasePattern(pattern: readonly string[]): string {
  return pattern.map((fragment) => `*${quoteShellCaseFragment(fragment)}`).join("");
}

function quoteShellCaseFragment(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("*", "\\*");
}

function getNotifyScriptContent(): string {
  return `#!/bin/sh
INPUT=""
if [ -n "$1" ]; then
  INPUT="$1"
else
  INPUT=$(cat)
fi

EVENT_TYPE=$(printf '%s' "$INPUT" | grep -oE '"hook_event_name"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -oE '"[^"]*"$' | tr -d '"')
if [ -z "$EVENT_TYPE" ]; then
  RAW_TYPE=$(printf '%s' "$INPUT" | grep -oE '"type"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -oE '"[^"]*"$' | tr -d '"')
  if [ "$RAW_TYPE" = "agent-turn-complete" ] || [ "$RAW_TYPE" = "task_complete" ]; then
    EVENT_TYPE="Stop"
  fi
fi

case "$EVENT_TYPE" in
  Start|start)
    NORMALIZED_EVENT="start"
    ;;
  Stop|stop)
    NORMALIZED_EVENT="stop"
    ;;
  *)
    exit 0
    ;;
esac

AGENT_NAME=$(printf '%s' "$INPUT" | grep -oE '"agent"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -oE '"[^"]*"$' | tr -d '"')
if [ -z "$AGENT_NAME" ]; then
  AGENT_NAME="\${AGENT_CANVAS_AGENT:-unknown}"
fi

printf '\\033]${AGENT_CONTROL_COMMAND};${AGENT_CONTROL_NAMESPACE};%s;%s\\007' "$NORMALIZED_EVENT" "$AGENT_NAME"
`;
}

function getCodexWrapperContent(binDir: string, notifyPath: string): string {
  const quotedBinDir = quoteShellLiteral(binDir);
  const quotedNotifyPath = quoteShellLiteral(notifyPath);
  const notifyConfigValue = JSON.stringify(["sh", notifyPath]);
  const codexTaskStartedPattern = createShellCasePattern(CODEX_START_LOG_PATTERNS[0]);
  const codexLegacyTaskStartedPattern = createShellCasePattern(CODEX_START_LOG_PATTERNS[1]);
  const codexLegacyExecCommandPattern = createShellCasePattern(CODEX_START_LOG_PATTERNS[2]);
  const codexTaskCompletePattern = createShellCasePattern(CODEX_STOP_LOG_PATTERNS[0]);
  const codexNotifyStopPattern = createShellCasePattern(CODEX_STOP_LOG_PATTERNS[1]);

  return `#!/bin/bash
# Agent Canvas X codex wrapper

find_real_binary() {
  local name="$1"
  local IFS=:
  for dir in $PATH; do
    [ -z "$dir" ] && continue
    dir="\${dir%/}"
    case "$dir" in
      ${quotedBinDir}) continue ;;
    esac
    if [ -x "$dir/$name" ] && [ ! -d "$dir/$name" ]; then
      printf "%s\\n" "$dir/$name"
      return 0
    fi
  done
  return 1
}

REAL_BIN="$(find_real_binary "codex")"
if [ -z "$REAL_BIN" ]; then
  echo "Agent Canvas X: codex not found in PATH." >&2
  exit 127
fi

export AGENT_CANVAS_AGENT="codex"
export CODEX_TUI_RECORD_SESSION=1

if [ -z "$CODEX_TUI_SESSION_LOG_PATH" ]; then
  _agent_canvas_ts="$(date +%s 2>/dev/null || echo "$$")"
  export CODEX_TUI_SESSION_LOG_PATH="\${TMPDIR:-/tmp}/agent-canvas-x-codex-$$_\${_agent_canvas_ts}.jsonl"
fi

if [ -f ${quotedNotifyPath} ]; then
  (
    _agent_canvas_log="$CODEX_TUI_SESSION_LOG_PATH"
    _agent_canvas_notify=${quotedNotifyPath}
    _agent_canvas_last_turn_id=""
    _agent_canvas_last_completed_turn_id=""
    _agent_canvas_last_exec_call_id=""

    _agent_canvas_emit_event() {
      _agent_canvas_event="$1"
      _agent_canvas_payload=$(printf '{"hook_event_name":"%s","agent":"codex"}' "$_agent_canvas_event")
      sh "$_agent_canvas_notify" "$_agent_canvas_payload" || true
    }

    _agent_canvas_i=0
    while [ ! -f "$_agent_canvas_log" ] && [ "$_agent_canvas_i" -lt 200 ]; do
      _agent_canvas_i=$((_agent_canvas_i + 1))
      sleep 0.05
    done

    if [ ! -f "$_agent_canvas_log" ]; then
      exit 0
    fi

    tail -n 0 -F "$_agent_canvas_log" 2>/dev/null | while IFS= read -r _agent_canvas_line; do
      case "$_agent_canvas_line" in
        ${codexTaskStartedPattern}|${codexLegacyTaskStartedPattern})
          _agent_canvas_turn_id=$(printf '%s\\n' "$_agent_canvas_line" | awk -F'"turn_id":"' 'NF > 1 { sub(/".*/, "", $2); print $2; exit }')
          [ -n "$_agent_canvas_turn_id" ] || _agent_canvas_turn_id="task_started"
          if [ "$_agent_canvas_turn_id" != "$_agent_canvas_last_turn_id" ]; then
            _agent_canvas_last_turn_id="$_agent_canvas_turn_id"
            _agent_canvas_emit_event "Start"
          fi
          ;;
        ${codexLegacyExecCommandPattern})
          _agent_canvas_exec_call_id=$(printf '%s\\n' "$_agent_canvas_line" | awk -F'"call_id":"' 'NF > 1 { sub(/".*/, "", $2); print $2; exit }')
          if [ -n "$_agent_canvas_exec_call_id" ]; then
            if [ "$_agent_canvas_exec_call_id" != "$_agent_canvas_last_exec_call_id" ]; then
              _agent_canvas_last_exec_call_id="$_agent_canvas_exec_call_id"
              _agent_canvas_emit_event "Start"
            fi
          else
            _agent_canvas_emit_event "Start"
          fi
          ;;
        ${codexTaskCompletePattern}|${codexNotifyStopPattern})
          _agent_canvas_completed_turn_id=$(printf '%s\\n' "$_agent_canvas_line" | awk -F'"turn_id":"' 'NF > 1 { sub(/".*/, "", $2); print $2; exit }')
          [ -n "$_agent_canvas_completed_turn_id" ] || _agent_canvas_completed_turn_id="task_complete"
          if [ "$_agent_canvas_completed_turn_id" != "$_agent_canvas_last_completed_turn_id" ]; then
            _agent_canvas_last_completed_turn_id="$_agent_canvas_completed_turn_id"
            _agent_canvas_emit_event "Stop"
          fi
          ;;
      esac
    done
  ) &
  AGENT_CANVAS_CODEX_WATCHER_PID=$!
fi

"$REAL_BIN" -c 'notify=${notifyConfigValue}' "$@"
AGENT_CANVAS_CODEX_STATUS=$?

if [ -n "$AGENT_CANVAS_CODEX_WATCHER_PID" ]; then
  kill "$AGENT_CANVAS_CODEX_WATCHER_PID" >/dev/null 2>&1 || true
  wait "$AGENT_CANVAS_CODEX_WATCHER_PID" 2>/dev/null || true
fi

exit "$AGENT_CANVAS_CODEX_STATUS"
`;
}

function getOpenCodeWrapperContent(binDir: string, opencodeConfigDir: string): string {
  const quotedBinDir = quoteShellLiteral(binDir);
  const quotedConfigDir = quoteShellLiteral(opencodeConfigDir);

  return `#!/bin/bash
# Agent Canvas X opencode wrapper

find_real_binary() {
  local name="$1"
  local IFS=:
  for dir in $PATH; do
    [ -z "$dir" ] && continue
    dir="\${dir%/}"
    case "$dir" in
      ${quotedBinDir}) continue ;;
    esac
    if [ -x "$dir/$name" ] && [ ! -d "$dir/$name" ]; then
      printf "%s\\n" "$dir/$name"
      return 0
    fi
  done
  return 1
}

REAL_BIN="$(find_real_binary "opencode")"
if [ -z "$REAL_BIN" ]; then
  echo "Agent Canvas X: opencode not found in PATH." >&2
  exit 127
fi

export AGENT_CANVAS_AGENT="opencode"
export OPENCODE_CONFIG_DIR=${quotedConfigDir}

exec "$REAL_BIN" "$@"
`;
}

function getOpenCodePluginContent(notifyPath: string): string {
  return `/**
 * Agent Canvas X notification plugin for OpenCode.
 */
export const AgentCanvasXNotifyPlugin = async ({ $, client }) => {
  if (globalThis.__agentCanvasXNotifyPluginV1) return {};
  globalThis.__agentCanvasXNotifyPluginV1 = true;

  if (!process?.env?.AGENT_CANVAS_SESSION_ID) return {};

  const notifyPath = ${JSON.stringify(notifyPath)};
  let currentState = "idle";
  let rootSessionId = null;
  let stopSent = false;
  const childSessionCache = new Map();

  const notify = async (eventName) => {
    const payload = JSON.stringify({
      agent: "opencode",
      hook_event_name: eventName,
    });

    try {
      await $\`sh \${notifyPath} \${payload}\`;
    } catch {
      // best effort only
    }
  };

  const isChildSession = async (sessionId) => {
    if (!sessionId) return true;
    if (!client?.session?.list) return true;
    if (childSessionCache.has(sessionId)) {
      return childSessionCache.get(sessionId);
    }

    try {
      const sessions = await client.session.list();
      const session = sessions.data?.find((candidate) => candidate.id === sessionId);
      const isChild = !!session?.parentID;
      childSessionCache.set(sessionId, isChild);
      return isChild;
    } catch {
      return true;
    }
  };

  const handleBusy = async (sessionId) => {
    if (!rootSessionId) {
      rootSessionId = sessionId;
    }

    if (sessionId !== rootSessionId) {
      return;
    }

    if (currentState === "idle") {
      currentState = "busy";
      stopSent = false;
      await notify("Start");
    }
  };

  const handleStop = async (sessionId) => {
    if (rootSessionId && sessionId !== rootSessionId) {
      return;
    }

    if (currentState === "busy" && !stopSent) {
      currentState = "idle";
      stopSent = true;
      rootSessionId = null;
      await notify("Stop");
    }
  };

  return {
    event: async ({ event }) => {
      const sessionId = event.properties?.sessionID;
      if (await isChildSession(sessionId)) {
        return;
      }

      if (event.type === "session.status") {
        const status = event.properties?.status;
        if (status?.type === "busy") {
          await handleBusy(sessionId);
        } else if (status?.type === "idle") {
          await handleStop(sessionId);
        }
      }

      if (event.type === "session.busy") {
        await handleBusy(sessionId);
      }

      if (event.type === "session.idle" || event.type === "session.error") {
        await handleStop(sessionId);
      }
    },
  };
};
`;
}
