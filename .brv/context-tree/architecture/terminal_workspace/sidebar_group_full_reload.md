---
title: Sidebar Group Full Reload
tags: []
related: [architecture/terminal_workspace/current_state.md]
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: "2026-04-07T01:47:04.638Z"
updatedAt: "2026-04-07T02:07:20.893Z"
---

## Raw Concept

**Task:**
Document sidebar group Full reload visibility, message dispatch, and controller execution behavior for grouped terminal sessions

**Changes:**

- Expanded Full reload visibility to any non-browser group with sessions
- Moved actual eligibility checks to per-session controller logic
- Added partial-success feedback when some sessions in a group are skipped

**Files:**

- sidebar/session-group-section.tsx
- extension/native-terminal-workspace/controller.ts

**Flow:**
open group context menu -> show Full reload for non-browser groups with sessions -> post fullReloadGroup message -> collect eligible terminal sessions -> restart each eligible session -> write resume command -> afterStateChange -> optionally show skipped-session info message

**Timestamp:** 2026-04-07

**Patterns:**

- `Full reload is only available for Codex and Claude sessions.` - Information message shown when no eligible session supports full reload
- `Reloaded ${String(fullReloadPlans.length)} session${fullReloadPlans.length === 1 ? "" : "s"}. Skipped ${String(skippedCount)} because full reload is only available for Codex and Claude sessions.` - Partial-success information message shown when some sessions were skipped

## Narrative

### Structure

The sidebar group section computes Full reload visibility from group session presence rather than agent-icon presentation. Non-browser groups with a context menu can render Sleep or Wake, Full reload when the group has sessions, Rename, and Close. The webview still emits the same fullReloadGroup message shape with the selected groupId.

### Dependencies

Execution depends on the native terminal workspace controller, the session store, backend restart and writeText operations, and getFullReloadResumeCommand to determine whether a terminal session supports Full reload. Browser groups remain excluded in the UI layer even though the visibility helper itself now only checks session count.

### Highlights

This change decouples action visibility from sidebar icon presentation and makes the group action available whenever a non-browser group contains sessions. The controller now handles mixed-support groups by reloading eligible terminal sessions, skipping unsupported ones, and surfacing a follow-up info message when the result is only partially successful.

### Rules

Full reload is visible for any non-browser group with at least one session. Full reload execution only applies to terminal sessions whose getFullReloadResumeCommand returns a resume command. If no eligible sessions exist, show "Full reload is only available for Codex and Claude sessions." If some sessions are skipped, show the exact partial-success message that reports reloaded and skipped counts.

### Examples

Example sidebar message payload: { groupId: group.groupId, type: "fullReloadGroup" }. Example controller sequence for each eligible session: bumpTerminalPaneRenderNonce(sessionId) -> backend.restartSession(sessionRecord) -> backend.writeText(sessionId, resumeCommand, true).

## Facts

- **group_full_reload_visibility**: Group context menu shows Full reload for any non-browser group that has sessions. [project]
- **group_full_reload_availability_logic**: Full reload group availability in the sidebar is computed as groupSessions.length > 0 and browser groups are excluded separately. [project]
- **full_reload_group_message**: The sidebar posts a fullReloadGroup webview message with groupId when the group Full reload action is triggered. [project]
- **full_reload_group_eligibility**: Controller fullReloadGroup reloads only terminal sessions that return a resume command from getFullReloadResumeCommand. [project]
- **full_reload_group_skip_behavior**: Unsupported sessions are skipped during group full reload instead of hiding the group action entirely. [project]
- **full_reload_group_partial_success_message**: When some sessions are skipped, the controller shows a partial-success message reporting reloaded and skipped counts. [project]
- **full_reload_group_execution_flow**: Group full reload restarts each eligible session, writes its resume command, and calls afterStateChange once after the loop. [project]
