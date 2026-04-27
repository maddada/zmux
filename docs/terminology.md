# zmux terminology

<!-- CDXC:Terminology 2026-04-27-06:58: Keep the core session vocabulary
stable for sidebar, native host, and future agent-manager-x integration. -->

This document defines the main terms used across zmux. Use these names in code,
logs, UI labels, and integration payloads unless an external API already owns a
different term.

## Session state terms

- `activity`: Short-lived agent/session presentation state shown on session cards. Valid values are `idle`, `working`, and `attention`.
- `idle`: The session is live or present, but no agent work is currently indicated.
- `working`: The session is actively doing agent work. This is the orange session-card indicator and the orange workspace rail count.
- `attention`: The session finished work and needs user attention. This is a  session-card activity state, not the workspace rail green count.
- `lifecycleState`: Runtime lifecycle for a sidebar session. Valid values are `running`, `done`, `sleeping`, and `error`.
- `running`: The session has live runtime. In the workspace rail this means live but not `working`, shown as the gray bottom-left count.
- `done`: The session has completed without being live. In the workspace rail this is the green top-right count.
- `sleeping`: The session is intentionally suspended and should not count as `running` or `done` in workspace rail indicators.
- `error`: The session failed or exited with an error and should not count as a successful `done` session.

## Workspace rail counts

Workspace rail counts live under `project.sessionCounts`:

- `project.sessionCounts.running`: Gray bottom-left count for live idle sessions.
- `project.sessionCounts.working`: Orange top-right count for live sessions whose session-card `activity` is `working`.
- `project.sessionCounts.done`: Green top-right count for completed sessions.

Do not use `active` for the orange count. In zmux, `active` means the selectedr current object, such as `activeProjectId`, an active group, an active modal,r an active editor/window.

## Selection and focus terms

- `activeProjectId`: The selected workspace/project in the native sidebar.
- `activeGroupId`: The selected session group inside a workspace.
- `focusedSessionId`: The session currently targeted for keyboard focus or terminal focus.
- `visibleSessionIds`: Sessions currently visible in the terminal layout.

## Project and workspace terms

- `project`: A saved workspace entry in the native sidebar. It contains a path, display name, project id, and grouped session workspace state.
- `workspace`: The grouped session state inside a project.
- `group`: A named section of sessions inside a workspace, such as Main or Misc.
- `session`: A terminal, browser, or T3 item shown in a group.

## Adapter terms

Some integrations use their own status words at API boundaries:

- Daemon session `status` may use `starting`, `running`, `exited`, `error`, or `disconnected`. Map `exited` to sidebar `done` when projecting into session lifecycle.
- Command run state uses `idle`, `running`, `success`, or `error`. `success` is command-specific and should not replace session `done`.
- Persisted session-state files store `status=idle|working|attention`, which maps to sidebar `activity`, not `lifecycleState`.
