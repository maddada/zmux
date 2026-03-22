import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";

type AgentLifecycleEventType = "start" | "stop";
type AgentLifecycleStateStatus = "idle" | "working" | "attention";

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
  claudeSettingsPath: string;
  notifyPath: string;
  opencodeConfigDir: string;
  zshDotDir: string;
};

const AGENT_CONTROL_COMMAND = "9001";
const AGENT_CONTROL_NAMESPACE = "VSmux";
const AGENT_SHELL_DIR_NAME = "agent-shell-integration";
const CLAUDE_SETTINGS_FILE_NAME = "settings.json";
const NOTIFY_SCRIPT_NAME = "notify.sh";
const OPENCODE_PLUGIN_FILE_NAME = "VSmux-notify.js";
const CODEX_START_LOG_PATTERNS = [
  [`"type":"event_msg"`, `"payload":{"type":"task_started"`],
  [`"msg":{"type":"task_started"`],
  [`"msg":{"type":"exec_command_begin"`],
] as const;
const CODEX_STOP_LOG_PATTERNS = [
  [`"type":"event_msg"`, `"payload":{"type":"task_complete"`],
  [`"msg":{"type":"task_complete"`],
  [`"msg":{"type":"turn_aborted"`],
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
  const claudeConfigDir = path.join(hooksDir, "claude");
  const claudeSettingsPath = path.join(claudeConfigDir, CLAUDE_SETTINGS_FILE_NAME);
  const notifyPath = path.join(hooksDir, NOTIFY_SCRIPT_NAME);
  const opencodeConfigDir = path.join(hooksDir, "opencode");
  const opencodePluginDir = path.join(opencodeConfigDir, "plugin");
  const opencodePluginPath = path.join(opencodePluginDir, OPENCODE_PLUGIN_FILE_NAME);
  const zshDotDir = path.join(integrationRoot, "zsh");

  await mkdir(binDir, { recursive: true });
  await mkdir(hooksDir, { recursive: true });
  await mkdir(claudeConfigDir, { recursive: true });
  await mkdir(opencodePluginDir, { recursive: true });
  await mkdir(zshDotDir, { recursive: true });

  await writeFileIfChanged(notifyPath, getNotifyScriptContent(), 0o755);
  await writeFileIfChanged(claudeSettingsPath, getClaudeHookSettingsContent(notifyPath), 0o644);
  await writeFileIfChanged(
    path.join(binDir, "claude"),
    getClaudeWrapperContent(binDir, claudeSettingsPath),
    0o755,
  );
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
  await writeFileIfChanged(path.join(zshDotDir, ".zshenv"), getZshEnvShimContent(), 0o644);
  await writeFileIfChanged(
    path.join(zshDotDir, ".zprofile"),
    getZshPassThroughShimContent(".zprofile"),
    0o644,
  );
  await writeFileIfChanged(path.join(zshDotDir, ".zshrc"), getZshRcShimContent(binDir), 0o644);
  await writeFileIfChanged(
    path.join(zshDotDir, ".zlogin"),
    getZshPassThroughShimContent(".zlogin"),
    0o644,
  );
  await writeFileIfChanged(
    path.join(zshDotDir, ".zlogout"),
    getZshPassThroughShimContent(".zlogout"),
    0o644,
  );

  return {
    binDir,
    claudeSettingsPath,
    notifyPath,
    opencodeConfigDir,
    zshDotDir,
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

function toLifecycleStateStatus(eventType: AgentLifecycleEventType): AgentLifecycleStateStatus {
  switch (eventType) {
    case "start":
      return "working";
    case "stop":
      return "attention";
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

function createShellLogMatchExpression(
  lineVariableName: string,
  patterns: readonly (readonly string[])[],
): string {
  return patterns
    .map((pattern) =>
      pattern
        .map(
          (fragment) =>
            `printf '%s\\n' "$${lineVariableName}" | grep -F -- ${quoteShellLiteral(fragment)} >/dev/null`,
        )
        .join(" && "),
    )
    .map((patternExpression) => `( ${patternExpression} )`)
    .join(" || ");
}

function getNotifyScriptContent(): string {
  const workingState = toLifecycleStateStatus("start");
  const attentionState = toLifecycleStateStatus("stop");

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
  AGENT_NAME="\${VSMUX_AGENT:-unknown}"
fi

STATE_FILE="\${VSMUX_SESSION_STATE_FILE:-}"
if [ -n "$STATE_FILE" ]; then
  STATE_DIR=$(dirname "$STATE_FILE")
  mkdir -p "$STATE_DIR" >/dev/null 2>&1 || true
  STATE_TMP="$STATE_FILE.tmp.$$"
  STATE_STATUS="${workingState}"
  STATE_TITLE=""
  if [ "$NORMALIZED_EVENT" = "stop" ]; then
    STATE_STATUS="${attentionState}"
  fi
  if [ -r "$STATE_FILE" ]; then
    STATE_TITLE=$(grep -E '^title=' "$STATE_FILE" | head -n 1 | cut -d= -f2-)
  fi
  printf 'status=%s\nagent=%s\ntitle=%s\n' "$STATE_STATUS" "$AGENT_NAME" "$STATE_TITLE" >"$STATE_TMP"
  mv "$STATE_TMP" "$STATE_FILE" >/dev/null 2>&1 || true
fi

printf '\\033]${AGENT_CONTROL_COMMAND};${AGENT_CONTROL_NAMESPACE};%s;%s\\007' "$NORMALIZED_EVENT" "$AGENT_NAME"
`;
}

function getZshEnvShimContent(): string {
  return `if [ -f "$HOME/.zshenv" ]; then
  . "$HOME/.zshenv"
fi
`;
}

function getZshPassThroughShimContent(fileName: ".zprofile" | ".zlogin" | ".zlogout"): string {
  return `if [ -f "$HOME/${fileName}" ]; then
  . "$HOME/${fileName}"
fi
`;
}

function getZshRcShimContent(binDir: string): string {
  const quotedBinDir = quoteShellLiteral(binDir);

  return `if [ -f "$HOME/.zshrc" ]; then
  . "$HOME/.zshrc"
fi

export PATH=${quotedBinDir}:$PATH
rehash 2>/dev/null || true
unalias claude 2>/dev/null || true
unalias codex 2>/dev/null || true
unalias opencode 2>/dev/null || true

if [ -z "$__VSMUX_ZSH_HOOKS_INSTALLED" ]; then
  typeset -g __VSMUX_ZSH_HOOKS_INSTALLED=1

  __vsmux_read_state_value() {
    emulate -L zsh
    local state_file="\${VSMUX_SESSION_STATE_FILE:-}"
    local wanted_key="$1"

    [ -n "$state_file" ] || return 1
    [ -r "$state_file" ] || return 1

    local key value
    while IFS='=' read -r key value; do
      if [ "$key" = "$wanted_key" ]; then
        value=\${value//$'\\r'/ }
        value=\${value//$'\\n'/ }
        value=\${value//$'\\t'/ }
        if [ -n "$value" ]; then
          printf '%s' "$value"
          return 0
        fi

        return 1
      fi
    done < "$state_file"

    return 1
  }

  __vsmux_emit_session_title() {
    emulate -L zsh
    local title="$1"
    [ -n "$title" ] || return 0
    printf '\\033]0;%s\\007' "$title" > /dev/tty
  }

  __vsmux_read_session_title() {
    emulate -L zsh
    __vsmux_read_state_value title
  }

  __vsmux_write_session_title() {
    emulate -L zsh
    local state_file="\${VSMUX_SESSION_STATE_FILE:-}"
    local title="$1"
    local session_status="idle"
    local session_agent="\${VSMUX_AGENT:-}"

    [ -n "$state_file" ] || return 0

    title=\${title//$'\\r'/ }
    title=\${title//$'\\n'/ }
    title=\${title//$'\\t'/ }

    if [ -r "$state_file" ]; then
      local key value
      while IFS='=' read -r key value; do
        case "$key" in
          status) session_status="$value" ;;
          agent) session_agent="$value" ;;
        esac
      done < "$state_file"
    fi

    mkdir -p -- "\${state_file:h}" >/dev/null 2>&1 || true
    local tmp_file="$state_file.tmp.$$"
    {
      printf 'status=%s\\n' "$session_status"
      printf 'agent=%s\\n' "$session_agent"
      printf 'title=%s\\n' "$title"
    } >| "$tmp_file" && mv -f -- "$tmp_file" "$state_file"
  }

  vsmux_set_title() {
    emulate -L zsh
    __vsmux_write_session_title "$*"
    __vsmux_emit_session_title "$*"
  }

  alias vam-title='vsmux_set_title'
fi

claude() {
  command ${quotedBinDir}/claude "$@"
}
codex() {
  command ${quotedBinDir}/codex "$@"
}
opencode() {
  command ${quotedBinDir}/opencode "$@"
}
`;
}

export function getClaudeHookSettingsContent(notifyPath: string): string {
  const quotedNotifyPath = quoteShellLiteral(notifyPath);

  return `${JSON.stringify(
    {
      hooks: {
        UserPromptSubmit: [
          {
            hooks: [
              {
                type: "command",
                command: `VSMUX_AGENT=claude sh ${quotedNotifyPath}`,
              },
            ],
          },
        ],
        Stop: [
          {
            hooks: [
              {
                type: "command",
                command: `VSMUX_AGENT=claude sh ${quotedNotifyPath}`,
              },
            ],
          },
        ],
        StopFailure: [
          {
            hooks: [
              {
                type: "command",
                command: `VSMUX_AGENT=claude sh ${quotedNotifyPath}`,
              },
            ],
          },
        ],
        Notification: [
          {
            matcher: "permission_prompt|idle_prompt",
            hooks: [
              {
                type: "command",
                command: `VSMUX_AGENT=claude sh ${quotedNotifyPath}`,
              },
            ],
          },
        ],
      },
    },
    null,
    2,
  )}\n`;
}

function getClaudeWrapperContent(binDir: string, claudeSettingsPath: string): string {
  const quotedBinDir = quoteShellLiteral(binDir);
  const quotedSettingsPath = quoteShellLiteral(claudeSettingsPath);

  return `#!/bin/bash
# VSmux claude wrapper

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

REAL_BIN="$(find_real_binary "claude")"
if [ -z "$REAL_BIN" ]; then
  echo "VSmux: claude not found in PATH." >&2
  exit 127
fi

export VSMUX_AGENT="claude"

if [ -n "$VSMUX_SESSION_STATE_FILE" ]; then
  _vsmux_tmp_file="$VSMUX_SESSION_STATE_FILE.tmp.$$"
  printf 'status=idle\\nagent=%s\\ntitle=%s\\n' "$VSMUX_AGENT" "Claude Code" >"$_vsmux_tmp_file"
  mv "$_vsmux_tmp_file" "$VSMUX_SESSION_STATE_FILE" >/dev/null 2>&1 || true
fi

exec "$REAL_BIN" --settings ${quotedSettingsPath} "$@"
`;
}

function getCodexWrapperContent(binDir: string, notifyPath: string): string {
  const quotedBinDir = quoteShellLiteral(binDir);
  const quotedNotifyPath = quoteShellLiteral(notifyPath);
  const notifyConfigValue = JSON.stringify(["sh", notifyPath]);
  const codexTaskStartedCheck = createShellLogMatchExpression(
    "_vsmux_line",
    CODEX_START_LOG_PATTERNS,
  );
  const codexTaskCompleteCheck = createShellLogMatchExpression(
    "_vsmux_line",
    CODEX_STOP_LOG_PATTERNS,
  );

  return `#!/bin/bash
# VSmux codex wrapper

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
  echo "VSmux: codex not found in PATH." >&2
  exit 127
fi

export VSMUX_AGENT="codex"
export CODEX_TUI_RECORD_SESSION=1

if [ -z "$CODEX_TUI_SESSION_LOG_PATH" ]; then
  _vsmux_ts="$(date +%s 2>/dev/null || echo "$$")"
  export CODEX_TUI_SESSION_LOG_PATH="\${TMPDIR:-/tmp}/VSmux-codex-$$_\${_vsmux_ts}.jsonl"
fi

_vsmux_write_title() {
  _vsmux_state_file="\${VSMUX_SESSION_STATE_FILE:-}"
  _vsmux_title="$1"
  _vsmux_status="idle"
  _vsmux_agent="\${VSMUX_AGENT:-}"

  [ -n "$_vsmux_state_file" ] || return 0

  if [ -r "$_vsmux_state_file" ]; then
    while IFS='=' read -r _vsmux_key _vsmux_value; do
      case "$_vsmux_key" in
        status) _vsmux_status="$_vsmux_value" ;;
        agent) _vsmux_agent="$_vsmux_value" ;;
      esac
    done < "$_vsmux_state_file"
  fi

  _vsmux_tmp_file="$_vsmux_state_file.tmp.$$"
  printf 'status=%s\nagent=%s\ntitle=%s\n' "$_vsmux_status" "$_vsmux_agent" "$_vsmux_title" >"$_vsmux_tmp_file"
  mv "$_vsmux_tmp_file" "$_vsmux_state_file" >/dev/null 2>&1 || true
}

_vsmux_write_title "Codex"

if [ -f ${quotedNotifyPath} ]; then
  (
    _vsmux_log="$CODEX_TUI_SESSION_LOG_PATH"
    _vsmux_notify=${quotedNotifyPath}
    _vsmux_last_turn_id=""
    _vsmux_last_completed_turn_id=""

    _vsmux_emit_event() {
      _vsmux_event="$1"
      _vsmux_payload=$(printf '{"hook_event_name":"%s","agent":"codex"}' "$_vsmux_event")
      sh "$_vsmux_notify" "$_vsmux_payload" || true
    }

    _vsmux_i=0
    while [ ! -f "$_vsmux_log" ] && [ "$_vsmux_i" -lt 200 ]; do
      _vsmux_i=$((_vsmux_i + 1))
      sleep 0.05
    done

    if [ ! -f "$_vsmux_log" ]; then
      exit 0
    fi

    tail -n +1 -F "$_vsmux_log" 2>/dev/null | while IFS= read -r _vsmux_line; do
      if ${codexTaskStartedCheck}; then
        _vsmux_turn_id=$(printf '%s\\n' "$_vsmux_line" | awk -F'"turn_id":"' 'NF > 1 { sub(/".*/, "", $2); print $2; exit }')
        [ -n "$_vsmux_turn_id" ] || _vsmux_turn_id="task_started"
        if [ "$_vsmux_turn_id" != "$_vsmux_last_turn_id" ]; then
          _vsmux_last_turn_id="$_vsmux_turn_id"
          _vsmux_emit_event "Start"
        fi
        continue
      fi

      if ${codexTaskCompleteCheck}; then
        _vsmux_completed_turn_id=$(printf '%s\\n' "$_vsmux_line" | awk -F'"turn_id":"' 'NF > 1 { sub(/".*/, "", $2); print $2; exit }')
        [ -n "$_vsmux_completed_turn_id" ] || _vsmux_completed_turn_id="task_complete"
        if [ "$_vsmux_completed_turn_id" != "$_vsmux_last_completed_turn_id" ]; then
          _vsmux_last_completed_turn_id="$_vsmux_completed_turn_id"
          _vsmux_emit_event "Stop"
        fi
      fi
    done
  ) &
  VSMUX_CODEX_WATCHER_PID=$!
fi

"$REAL_BIN" -c 'notify=${notifyConfigValue}' "$@"
VSMUX_CODEX_STATUS=$?

if [ -n "$VSMUX_CODEX_WATCHER_PID" ]; then
  kill "$VSMUX_CODEX_WATCHER_PID" >/dev/null 2>&1 || true
  wait "$VSMUX_CODEX_WATCHER_PID" 2>/dev/null || true
fi

exit "$VSMUX_CODEX_STATUS"
`;
}

function getOpenCodeWrapperContent(binDir: string, opencodeConfigDir: string): string {
  const quotedBinDir = quoteShellLiteral(binDir);
  const quotedConfigDir = quoteShellLiteral(opencodeConfigDir);

  return `#!/bin/bash
# VSmux opencode wrapper

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
  echo "VSmux: opencode not found in PATH." >&2
  exit 127
fi

export VSMUX_AGENT="opencode"
export OPENCODE_CONFIG_DIR=${quotedConfigDir}

if [ -n "$VSMUX_SESSION_STATE_FILE" ]; then
  _vsmux_tmp_file="$VSMUX_SESSION_STATE_FILE.tmp.$$"
  printf 'status=idle\nagent=%s\ntitle=%s\n' "$VSMUX_AGENT" "OpenCode" >"$_vsmux_tmp_file"
  mv "$_vsmux_tmp_file" "$VSMUX_SESSION_STATE_FILE" >/dev/null 2>&1 || true
fi

exec "$REAL_BIN" "$@"
`;
}

function getOpenCodePluginContent(notifyPath: string): string {
  return `/**
 * VSmux notification plugin for OpenCode.
 */
export const VSmuxNotifyPlugin = async ({ $, client }) => {
  if (globalThis.__vsmuxNotifyPluginV1) return {};
  globalThis.__vsmuxNotifyPluginV1 = true;

  if (!process?.env?.VSMUX_SESSION_ID) return {};

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
