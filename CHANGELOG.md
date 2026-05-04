# Changelog

## 1.4.4 - 2026-05-04

<!-- CDXC:Distribution 2026-05-04-16:01: Release notes for 1.4.4 must include
all commits after v1.4.3 so README, GitHub, Sparkle, and Homebrew release
metadata describe the same shipped behavior. -->

- Added Combined sidebar mode so native zmux can show one project group per project across all projects, while preserving Separated mode for the previous per-project layout.
- Added a Recent Projects drawer with fuzzy project/path search and startup cleanup for empty combined-mode projects.
- Added project context actions for opening project config, setting project theme, copying the project path, opening the folder in Finder, opening it in the selected IDE, and closing projects into Recent Projects.
- Improved native T3 Code runtime handling so fresh supervised runtimes are retained during startup/auth races, with explicit stop still available for recovery.
- Improved T3 thread changes by creating and syncing sidebar cards when the native host receives thread-change events.
- Fixed sidebar resize drags to use stable window coordinates so the sidebar does not jump while dragging.
- Added color-environment diagnostics for agent launches so monochrome CLI sessions can be traced to inherited terminal environment values.
- Added long-paste rename handling that summarizes pasted session text before syncing the rename into the agent CLI.

## 1.4.3 - 2026-05-03

<!-- CDXC:Distribution 2026-05-03-08:14: Release notes for 1.4.3 must include
all commits after v1.4.2 so README, GitHub, Sparkle, and Homebrew release
metadata describe the same shipped behavior. -->

- Added an opt-in Browser Panes mode that opens browser actions as first-class workspace panes instead of Chrome Canary windows.
- Added native browser pane controls for address navigation, reload, DevTools, React Grab, profile selection, and browser-data import messaging.
- Persisted browser pane URLs, favicons, and browser-auto titles so sidebar cards and app restarts reflect the current page.
- Added native pane header drag-to-reorder support across terminal, T3, and browser panes without surfacing hidden sessions.

## 1.4.2 - 2026-05-02

<!-- CDXC:Distribution 2026-05-02-11:33: Release notes for 1.4.2 must call
out the Sparkle build-number fix because installed apps compare
CFBundleVersion when deciding whether a feed item is newer. -->

- Fixed Sparkle update detection by publishing releases with a monotonic `CFBundleVersion` build number.
- Kept the native AppKit pane resizing changes from 1.4.1 available in the update feed.

## 1.4.1 - 2026-05-02

<!-- CDXC:Distribution 2026-05-02-11:16: Release notes for 1.4.1 must include
all commits after v1.4.0 so README, GitHub, Sparkle, and Homebrew release
metadata describe the same shipped behavior. -->

- Moved split pane resizing into the native AppKit terminal workspace so Ghostty and WKWebView panes resize from the same layout owner.
- Removed the React workspace resize overlay and tests that no longer apply to native pane sizing.
- Removed whole-cell terminal body stepping so pane chrome and terminal renderer widths stay aligned during native resize.

## 1.4.0 - 2026-05-02

<!-- CDXC:Distribution 2026-05-02-08:37: Release notes for 1.4.0 must include
all commits after v1.3.0 so README, GitHub, Sparkle, and Homebrew release
metadata describe the same shipped behavior. -->

- Added Sparkle appcast update support with signed appcast metadata for native macOS updates.
- Added native T3 Code panes with managed runtime bootstrap, authentication, thread routing, and runtime diagnostics.
- Added T3 remote/browser access links for native panes, including local-network and Tailscale-friendly pairing URLs.
- Added draggable workspace pane resizing with double-click equalize behavior for pane rows and columns.
- Added a standard native macOS app menu with About, Check for Updates, Settings, Services, Hide, and Quit.
- Added a setting to hide the native IDE title-bar attach button without disabling IDE attachment.
- Improved IDE attachment behavior so the floating Show IDE button raises or launches the configured IDE for the current workspace.
- Improved T3 runtime startup by rebuilding the local t3code-embed checkout only when source fingerprints or build output require it.
- Improved workspace dock clarity by dimming inactive project icons.
- Kept the local release workflow skill available on this machine while removing it from the public repository tree.

## 1.3.0 - 2026-04-30

<!-- CDXC:Distribution 2026-04-30-03:37: Release notes for 1.3.0 must include
all commits after v1.2.0 so README, GitHub, and Homebrew release metadata
describe the same shipped behavior. -->

- Added Ghostty config actions and a recommended Ghostty config that includes zmux-managed color, cursor, font, scroll, and split-opacity settings.
- Added a cyan Ghostty palette default to improve terminal color readability with the recommended zmux-managed config.
- Added a local agent release skill for repeatable split commits, release notes, GitHub releases, and Homebrew cask publishing.
- Added Generate Name diagnostics across the sidebar, bridge, and controller paths so silent session-name failures are easier to trace.
- Fixed terminal title bars so long titles are measured from raw text and use available pane width before truncating.
- Improved attached IDE refocus timing so zmux resurfaces faster when the IDE is already active or when activation retries succeed quickly.
- Hid bare agent status words such as `Working`, `Done`, `Idle`, `Thinking`, and `Error` from visible terminal titles.

## 1.2.0 - 2026-04-29

<!-- CDXC:Distribution 2026-04-29-09:31: Release notes for 1.2.0 must include
all user-facing commits after v1.1.0 so README, GitHub, and Homebrew release
metadata describe the same shipped behavior. -->

- Added terminal scroll multiplier settings for precision devices and discrete mouse wheels.
- Synced Ghostty mouse-scroll-multiplier values into the shared Ghostty config and reloads scroll-only changes immediately.
- Added native AVFoundation sound playback for completion/action sounds and settings previews, with sound assets bundled in the app.
- Gated non-error native/sidebar diagnostics behind Debugging Mode and reduced high-frequency focus/title logging.
- Improved terminal close cleanup by terminating processes still attached to the closed terminal tty.
- Improved embedded terminal search behavior so Escape closes search before reaching terminal programs.
- Changed embedded terminal cursor rects to use the default pointer cursor instead of always showing the I-beam.

## 1.1.0 - 2026-04-29

<!-- CDXC:Distribution 2026-04-29-08:42: Release notes for 1.1.0 must include
all user-facing commits after v1.0.4 so README, GitHub, and Homebrew release
metadata describe the same shipped behavior. -->

- Added full-window native modals for Find Previous Session and T3 Thread ID entry.
- Improved previous-session search launching by routing modal input through the sidebar/native command bridge.
- Improved T3 session thread binding controls in the native sidebar workflow.
- Fixed agent wrapper process launch so interactive CLIs stay attached to the foreground terminal TTY and receive resize signals.
- Added agent wrapper debug logging for TTY/process details used to diagnose resize and child-process issues.
- Fixed native embedded terminal layout to step pane sizes to whole Ghostty character cells, including configured terminal padding.
- Expanded native terminal resize diagnostics with core Ghostty grid, padding, backing-pixel, and pane geometry metrics.

## 1.0.4 - 2026-04-28

<!-- CDXC:Distribution 2026-04-28-06:27: Release notes for 1.0.4 must be
derived from the commits after v1.0.3 so README, GitHub, and Homebrew users see
the same user-facing feature set. -->

- Added configurable app hotkeys, including native AppKit handling while terminal panes have focus.
- Added saved first-message metadata for agent sessions and a copyable "View 1st Message" modal in active and previous session flows.
- Added terminal workspace background color settings and native pane-gap/background rendering.
- Added automatic Zed workspace syncing after zmux workspace switches, controlled by a setting.
- Added native main-window size persistence between launches.
- Added native terminal search bar rendering and focus preservation improvements for modal workflows.
- Improved sidebar sessions to default to last-activity ordering and keep agent-icon mode blank for iconless sessions until hover.
- Expanded command/workspace icon choices and kept the icon picker search fixed while the icon list scrolls.
- Removed T3 Code from default sidebar agents while preserving existing T3 session recognition.
- Improved Previous Sessions by using the search field for "Find Session" prompts and keeping the native full-window modal compact.
- Added Scratch Pad focus diagnostics to help trace terminal-first-responder focus steals without logging note text.

## 1.0.3 - 2026-04-28

<!-- CDXC:Distribution 2026-04-28-16:00: Release notes must summarize the
user-facing changes added after v1.0.2 so GitHub, README, and Homebrew release
metadata describe the same shipped behavior. -->

- Added native terminal title bars with rename, fork, reload, sleep, and close actions.
- Added visible native Ghostty scrollbars and disabled middle-click paste in embedded terminals.
- Added workspace configuration for dock name, theme, Tabler icon, and uploaded image.
- Added `zmux-dev` build/run flavor with separate diagnostics storage and shared workspace/session state.
- Added shared sidebar storage files for projects, previous sessions, and settings outside WKWebView localStorage.
- Added managed native sidebar action sessions with command run indicators and close-on-exit behavior.
- Improved first-prompt auto-title logic so meaningful existing titles are not overwritten.
- Improved session rename modal Enter-key submission.
- Improved IDE attachment settings so Zed and Zed Preview are distinguishable.
- Removed the browser section tab-count badge.
- Removed persistent helper terminal mode in favor of the embedded Ghostty SurfaceView backend.
