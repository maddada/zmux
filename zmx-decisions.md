# ZMX Decisions

## Goal

Replace the macOS/Linux terminal restore path with `zmx` so hidden/show, reload, and reconnect flows restore real terminal state instead of replaying raw PTY history into a fresh pseudoterminal.

Windows keeps the existing ruspty daemon path for now.

## Key Decisions

### 1. Use backend selection by platform

- `win32` uses the existing ruspty-backed pseudoterminal backend.
- `darwin` and `linux` use a new `zmx` backend.

Reason:

- This isolates the new macOS/Linux behavior without destabilizing the current Windows path.
- It also gives the controller one stable interface instead of mixing two terminal models in a single class.

### 2. Use real VS Code shell terminals for the zmx path

- The zmx backend creates native shell-backed editor terminals with:
  - `shellPath = <downloaded zmx binary>`
  - `shellArgs = ["attach", "<workspace-scoped-session-name>", "<default shell>"]`

Reason:

- This removes the extension’s PTY text replay layer entirely for macOS/Linux.
- The visible VS Code terminal now attaches directly to `zmx`, which owns the durable terminal state.
- This is the main fix for the duplicated prompt/input corruption shown in the original bug report.

### 3. Do not stream live terminal bytes through the extension on macOS/Linux

- The extension no longer proxies terminal output on the zmx path.
- The extension only manages layout, session lifecycle, naming, and sidebar state.

Reason:

- The previous corruption came from rebuilding pseudoterminals and replaying text, plus output race/escape-sequence problems in the extension-owned PTY bridge.
- Removing the extension from the terminal-data path is the most stable fix.

### 4. Download zmx at runtime on first macOS/Linux activation

- `zmx` is installed into extension global storage on demand.
- The version is pinned to `0.4.2`.

Reason:

- This keeps the repo and build lightweight.
- It avoids checking platform binaries into source control.
- It also avoids building a VSIX that only works on the platform it was packaged on.

Tradeoff:

- First use on macOS/Linux requires network access.
- If we later need offline installs, the next step should be packaging the binaries into the VSIX instead of changing the runtime model again.

### 5. Namespace zmx sessions by workspace id

- Backend session names use:
  - `vam-<workspaceId>-<compactSessionId>`
- Compact session ids use:
  - `s<N>` for the standard stored ids like `session-1`
  - a short hash fallback for any non-standard session id

Reason:

- `zmx` sessions are global to the runtime directory.
- The current stored session ids like `session-1` are not globally unique.
- Namespacing prevents collisions across repos/workspaces.
- The names must also stay comfortably below Unix socket path limits on macOS/Linux.

### 5b. Keep the zmx runtime directory path extremely short

- The zmx runtime root uses:
  - `/tmp/vamz-<hash>`

Reason:

- Unix-domain socket limits are small and include both the runtime directory path and the session name.
- VS Code global storage and macOS temp paths can easily consume too much of that budget.
- A short deterministic `/tmp` path leaves enough headroom for stable attach/switch behavior.

### 6. Rebuild visible zmx terminals freely

- The zmx backend rebuilds visible editor terminals on full reconcile operations.
- Only simple focus changes reuse existing projections.

Reason:

- With `zmx`, rebuilding a visible terminal is safe because the backend state lives in `zmx`, not in extension-managed scrollback replay.
- This keeps the controller logic simple and avoids subtle layout bugs when visible count or layout mode changes.

### 7. Poll zmx for running-session state

- The sidebar running/exited state on macOS/Linux is refreshed from `zmx list --short` on a short polling interval.

Reason:

- On the zmx path the extension is not in the terminal output stream, so it needs a backend-native way to know whether a session still exists.
- Polling `zmx list --short` is simple and robust enough for the small session counts in this extension.

### 8. Keep shell-spawn trust gating in the controller

- The same workspace-trust approval flow remains in front of shell creation/attachment.

Reason:

- The security boundary is a product-level concern, not a backend concern.
- `zmx attach` still results in shell access in the workspace.

### 9. Keep terminal title sync when possible

- The zmx backend listens for native terminal title changes via `window.onDidChangeTerminalState`.
- The stored primary title is updated when VS Code reports a new terminal name.

Reason:

- This preserves the existing sidebar title behavior where possible without reintroducing an output parser.

Tradeoff:

- Title updates are now dependent on what native VS Code terminal state events expose.
- This is weaker than the old OSC parser, but far safer than rebuilding from raw replay.

### 10. Accept a small feature reduction on macOS/Linux for now

These Windows-only behaviors are not currently mirrored by the zmx backend:

- agent activity parsing from shell integration OSC markers
- title-flash indicator when activating a session from the sidebar
- hidden-session staged text writes when there is no live attached terminal

Reason:

- These features depended on the extension sitting in the PTY output/input path.
- Reintroducing that path would undermine the stability benefit of switching to `zmx`.

Decision:

- Stability of terminal state restoration is the priority.
- If we need activity/status on macOS/Linux later, it should come from a side-channel, not by reinserting the extension into the terminal byte stream.

## Why This Solves The Reported Bugs

The reported bugs were:

- duplicated text/input UI after hide/show
- raw control-sequence garbage appearing after re-showing a terminal

The old macOS/Linux behavior recreated a fresh pseudoterminal projection and replayed stored history. That is fundamentally incorrect for interactive terminal UIs.

The new macOS/Linux behavior attaches native VS Code terminals directly to persistent `zmx` sessions, so:

- hide/show reconnects to terminal state instead of replaying text
- reload reconnects to terminal state instead of replaying text
- control-sequence parsing/race issues in the extension are no longer part of the UI path

## Follow-Up If We Need More

If we later need stronger production polish, the next improvements should be:

1. Bundle pinned zmx binaries into the VSIX for offline installs.
2. Add a zmx-backed side-channel for agent activity/status instead of parsing visible terminal output.
3. Add integration tests in an Extension Development Host that exercise:
   - hide/show
   - reload/reattach
   - visible count/layout changes
   - rename while visible
