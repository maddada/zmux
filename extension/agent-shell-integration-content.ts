import { quoteShellLiteral } from "./agent-shell-integration-utils";

export type AgentWrapperName = "claude" | "codex" | "gemini" | "opencode";

export function getAgentWrapperShellScriptContent(
  agentName: AgentWrapperName,
  options: {
    binDir: string;
    claudeSettingsPath: string;
    debugLogPath: string;
    notifyPath: string;
    opencodeConfigDir: string;
    wrapperRunnerPath: string;
  },
): string {
  return `#!/bin/sh
export ELECTRON_RUN_AS_NODE=1
exec ${quoteShellLiteral(process.execPath)} ${quoteShellLiteral(options.wrapperRunnerPath)} --agent ${quoteShellLiteral(agentName)} --bin-dir ${quoteShellLiteral(options.binDir)} --claude-settings-path ${quoteShellLiteral(options.claudeSettingsPath)} --debug-log-path ${quoteShellLiteral(options.debugLogPath)} --notify-runner-path ${quoteShellLiteral(options.notifyPath)} --opencode-config-dir ${quoteShellLiteral(options.opencodeConfigDir)} -- "$@"
`;
}

export function getAgentWrapperCmdContent(
  agentName: AgentWrapperName,
  options: {
    binDir: string;
    claudeSettingsPath: string;
    debugLogPath: string;
    notifyPath: string;
    opencodeConfigDir: string;
    wrapperRunnerPath: string;
  },
): string {
  return `@echo off
setlocal
set "_zmux_node="
for %%I in (node.exe) do set "_zmux_node=%%~$PATH:I"
if defined _zmux_node (
  "%_zmux_node%" "${options.wrapperRunnerPath}" --agent ${agentName} --bin-dir "${options.binDir}" --claude-settings-path "${options.claudeSettingsPath}" --debug-log-path "${options.debugLogPath}" --notify-runner-path "${options.notifyPath}" --opencode-config-dir "${options.opencodeConfigDir}" -- %*
) else (
  set ELECTRON_RUN_AS_NODE=1
  "${process.execPath}" "${options.wrapperRunnerPath}" --agent ${agentName} --bin-dir "${options.binDir}" --claude-settings-path "${options.claudeSettingsPath}" --debug-log-path "${options.debugLogPath}" --notify-runner-path "${options.notifyPath}" --opencode-config-dir "${options.opencodeConfigDir}" -- %*
)
`;
}

export function getClaudeNotifyCommandContent(notifyPath: string): string {
  if (process.platform === "win32") {
    return `@echo off
setlocal
set zmux_AGENT=claude
set ELECTRON_RUN_AS_NODE=1
"${process.execPath}" "${notifyPath}" %*
`;
  }

  return `#!/bin/sh
export zmux_AGENT=claude
export ELECTRON_RUN_AS_NODE=1
exec ${quoteShellLiteral(process.execPath)} ${quoteShellLiteral(notifyPath)} "$@"
`;
}

export function getClaudeHookSettingsContent(
  notifyPath: string,
  platform: NodeJS.Platform = process.platform,
): string {
  const command = platform === "win32" ? `"${notifyPath}"` : quoteShellLiteral(notifyPath);

  return `${JSON.stringify(
    {
      hooks: {
        UserPromptSubmit: [
          {
            hooks: [
              {
                type: "command",
                command,
              },
            ],
          },
        ],
        Stop: [
          {
            hooks: [
              {
                type: "command",
                command,
              },
            ],
          },
        ],
        StopFailure: [
          {
            hooks: [
              {
                type: "command",
                command,
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
                command,
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

export function getZshEnvShimContent(): string {
  return `if [ -f "$HOME/.zshenv" ]; then
  . "$HOME/.zshenv"
fi
`;
}

export function getZshPassThroughShimContent(
  fileName: ".zprofile" | ".zlogin" | ".zlogout",
): string {
  return `if [ -f "$HOME/${fileName}" ]; then
  . "$HOME/${fileName}"
fi
`;
}

export function getZshRcShimContent(binDir: string): string {
  const quotedBinDir = quoteShellLiteral(binDir);
  const quotedClaudeWrapperPath = quoteShellLiteral(`${binDir}/claude`);

  return `export CLAUDE_BIN=${quotedClaudeWrapperPath}

if [ -f "$HOME/.zshrc" ]; then
  . "$HOME/.zshrc"
fi

export PATH=${quotedBinDir}:$PATH
export CLAUDE_BIN=${quotedClaudeWrapperPath}
rehash 2>/dev/null || true
unalias claude 2>/dev/null || true
unalias codex 2>/dev/null || true
unalias gemini 2>/dev/null || true
unalias opencode 2>/dev/null || true

if [ -z "$__zmux_ZSH_HOOKS_INSTALLED" ]; then
  typeset -g __zmux_ZSH_HOOKS_INSTALLED=1

  __zmux_read_state_value() {
    emulate -L zsh
    local state_file="\${zmux_SESSION_STATE_FILE:-}"
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

  __zmux_emit_session_title() {
    emulate -L zsh
    local title="$1"
    [ -n "$title" ] || return 0
    printf '\\033]0;%s\\007' "$title" > /dev/tty
  }

  __zmux_read_session_title() {
    emulate -L zsh
    __zmux_read_state_value title
  }

  __zmux_restore_session_title() {
    emulate -L zsh
    local title="$(__zmux_read_session_title)"
    [ -n "$title" ] || return 0
    __zmux_emit_session_title "$title"
  }

  __zmux_write_session_title() {
    emulate -L zsh
    local state_file="\${zmux_SESSION_STATE_FILE:-}"
    local title="$1"
    local session_status="idle"
    local session_agent="\${zmux_AGENT:-}"
    local session_last_activity=""

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
          lastActivityAt) session_last_activity="$value" ;;
        esac
      done < "$state_file"
    fi

    mkdir -p -- "\${state_file:h}" >/dev/null 2>&1 || true
    local tmp_file="$state_file.tmp.$$"
    {
      printf 'status=%s\\n' "$session_status"
      printf 'agent=%s\\n' "$session_agent"
      printf 'lastActivityAt=%s\\n' "$session_last_activity"
      printf 'title=%s\\n' "$title"
    } >| "$tmp_file" && mv -f -- "$tmp_file" "$state_file"
  }

  zmux_set_title() {
    emulate -L zsh
    __zmux_write_session_title "$*"
    __zmux_emit_session_title "$*"
  }

  alias vam-title='zmux_set_title'

  autoload -Uz add-zsh-hook 2>/dev/null || true
  if typeset -f add-zsh-hook >/dev/null 2>&1; then
    add-zsh-hook preexec __zmux_restore_session_title
    add-zsh-hook precmd __zmux_restore_session_title
  fi
fi

claude() {
  command ${quotedBinDir}/claude "$@"
}
codex() {
  command ${quotedBinDir}/codex "$@"
}
gemini() {
  command ${quotedBinDir}/gemini "$@"
}
opencode() {
  command ${quotedBinDir}/opencode "$@"
}
`;
}

export function getPowerShellBootstrapContent(): string {
  return `$ErrorActionPreference = "SilentlyContinue"

$profileCandidates = @(
  $PROFILE.CurrentUserAllHosts,
  $PROFILE.CurrentUserCurrentHost,
  $PROFILE.AllUsersAllHosts,
  $PROFILE.AllUsersCurrentHost
) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique

foreach ($profilePath in $profileCandidates) {
  if (Test-Path -LiteralPath $profilePath) {
    . $profilePath
  }
}

if (-not (Get-Variable -Name __zmux_POWERSHELL_INIT -Scope Global -ErrorAction SilentlyContinue)) {
  $global:__zmux_POWERSHELL_INIT = $true

  function global:__zmux_normalize_title([string]$Title) {
    if ([string]::IsNullOrWhiteSpace($Title)) {
      return $null
    }

    return (($Title -replace "[\`r\`n\`t]+", " " -replace "\\s+", " ").Trim())
  }

  function global:__zmux_read_state_value([string]$WantedKey) {
    $stateFile = $env:zmux_SESSION_STATE_FILE
    if ([string]::IsNullOrWhiteSpace($stateFile) -or -not (Test-Path -LiteralPath $stateFile)) {
      return $null
    }

    foreach ($line in [System.IO.File]::ReadAllLines($stateFile)) {
      $separatorIndex = $line.IndexOf("=")
      if ($separatorIndex -lt 0) {
        continue
      }

      $key = $line.Substring(0, $separatorIndex)
      if ($key -ne $WantedKey) {
        continue
      }

      $value = $line.Substring($separatorIndex + 1).Trim()
      if ([string]::IsNullOrWhiteSpace($value)) {
        return $null
      }

      return $value
    }

    return $null
  }

  function global:__zmux_write_session_title([string]$Title) {
    $stateFile = $env:zmux_SESSION_STATE_FILE
    if ([string]::IsNullOrWhiteSpace($stateFile)) {
      return
    }

    $normalizedTitle = __zmux_normalize_title $Title
    $status = __zmux_read_state_value "status"
    if ([string]::IsNullOrWhiteSpace($status)) {
      $status = "idle"
    }

    $agent = __zmux_read_state_value "agent"
    if ($null -eq $agent) {
      $agent = ""
    }

    $lastActivityAt = __zmux_read_state_value "lastActivityAt"
    if ($null -eq $lastActivityAt) {
      $lastActivityAt = ""
    }
    $persistedTitle = ""
    if ($null -ne $normalizedTitle) {
      $persistedTitle = [string]$normalizedTitle
    }

    $directory = [System.IO.Path]::GetDirectoryName($stateFile)
    if (-not [string]::IsNullOrWhiteSpace($directory)) {
      [System.IO.Directory]::CreateDirectory($directory) | Out-Null
    }

    $tmpFile = "$stateFile.tmp.$PID"
    [System.IO.File]::WriteAllLines($tmpFile, @(
      "status=$status"
      "agent=$agent"
      "lastActivityAt=$lastActivityAt"
      "title=$persistedTitle"
      ""
    ))
    Move-Item -LiteralPath $tmpFile -Destination $stateFile -Force
  }

  function global:__zmux_emit_session_title([string]$Title) {
    $normalizedTitle = __zmux_normalize_title $Title
    if ([string]::IsNullOrWhiteSpace($normalizedTitle)) {
      return
    }

    [System.Console]::Out.Write("$([char]27)]0;$normalizedTitle$([char]7)")
  }

  function global:__zmux_get_current_title() {
    $title = $null
    try {
      $title = $Host.UI.RawUI.WindowTitle
    } catch {}

    if ([string]::IsNullOrWhiteSpace($title)) {
      try {
        $title = [Console]::Title
      } catch {}
    }

    return __zmux_normalize_title $title
  }

  function global:__zmux_sync_current_title() {
    $title = __zmux_get_current_title
    if ([string]::IsNullOrWhiteSpace($title)) {
      $title = __zmux_normalize_title (__zmux_read_state_value "title")
    }

    if ([string]::IsNullOrWhiteSpace($title)) {
      return
    }

    try {
      $Host.UI.RawUI.WindowTitle = $title
    } catch {}

    try {
      [Console]::Title = $title
    } catch {}

    __zmux_write_session_title $title
    __zmux_emit_session_title $title
  }

  function global:zmux_set_title {
    param(
      [Parameter(ValueFromRemainingArguments = $true)]
      [string[]]$TitleParts
    )

    $title = __zmux_normalize_title ($TitleParts -join " ")
    if ([string]::IsNullOrWhiteSpace($title)) {
      return
    }

    try {
      $Host.UI.RawUI.WindowTitle = $title
    } catch {}

    try {
      [Console]::Title = $title
    } catch {}

    __zmux_write_session_title $title
    __zmux_emit_session_title $title
  }

  Set-Alias -Name vam-title -Value zmux_set_title -Scope Global

  $global:__zmux_original_prompt = if (Test-Path Function:\\prompt) {
    (Get-Item Function:\\prompt).ScriptBlock
  } else {
    $null
  }

  function global:prompt {
    __zmux_sync_current_title
    if ($global:__zmux_original_prompt) {
      & $global:__zmux_original_prompt
      return
    }

    "PS $($executionContext.SessionState.Path.CurrentLocation)> "
  }
}

__zmux_sync_current_title
`;
}

export function getOpenCodePluginContent(notifyPath: string, nodePath: string): string {
  return `/**
 * zmux notification plugin for OpenCode.
 */
export const zmuxNotifyPlugin = async ({ client }) => {
  if (globalThis.__zmuxNotifyPluginV1) return {};
  globalThis.__zmuxNotifyPluginV1 = true;

  const currentSessionId = process?.env?.zmux_SESSION_ID;
  if (!currentSessionId) return {};

  const notifyPath = ${JSON.stringify(notifyPath)};
  const nodePath = ${JSON.stringify(nodePath)};
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
      const { spawn } = await import("node:child_process");
      await new Promise((resolve) => {
        const child = spawn(nodePath, [notifyPath, payload], {
          env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: "1",
            zmux_AGENT: "opencode",
          },
          stdio: "ignore",
        });
        child.once("error", () => resolve(undefined));
        child.once("exit", () => resolve(undefined));
      });
    } catch {
      // best effort only
    }
  };

  const isChildSession = async (sessionId) => {
    if (!sessionId) {
      return true;
    }
    if (!client?.session?.list) {
      return true;
    }
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

  const isSessionActive = (status) => status?.type && status.type !== "idle";

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
      return;
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

  const syncInitialStatus = async () => {
    if (!client?.session?.status) {
      return;
    }

    if (await isChildSession(currentSessionId)) {
      return;
    }

    try {
      const statuses = await client.session.status();
      const status = statuses.data?.[currentSessionId];
      if (isSessionActive(status)) {
        await handleBusy(currentSessionId);
        return;
      }

      if (status?.type === "idle") {
        await handleStop(currentSessionId);
      }
    } catch {
      // best effort only
    }
  };

  setTimeout(() => {
    void syncInitialStatus();
  }, 0);

  return {
    event: async ({ event }) => {
      const sessionId = event.properties?.sessionID;
      if (await isChildSession(sessionId)) {
        return;
      }

      if (event.type === "session.status") {
        const status = event.properties?.status;
        if (isSessionActive(status)) {
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
