# Native Ghostty Shell Handover

## Decision

Replace the Electrobun/web-terminal shell with a native macOS shell that renders real embedded Ghostty terminals inside the app UI.

The only supported terminal engine going forward is embedded native Ghostty.

Remove support for:

- xterm.js
- wterm
- restty
- ghostty-web/web terminal rendering
- external Ghostty window control as the primary implementation

The sidebar/control UI can remain web-based, but terminal rendering must be native `Ghostty.SurfaceView` instances hosted inside the app window.

## Target Shape

```text
zmux.app
  Swift/AppKit native host
    WKWebView
      React sidebar / dock / controls
    Native workspace container
      Ghostty.SurfaceView(session-1)
      Ghostty.SurfaceView(session-2)
      Ghostty.SurfaceView(session-3)
```

The web UI controls the native workspace. The native workspace owns terminal panes, focus, resizing, keyboard/mouse/IME, and rendering.

## Ghostty Source

Ghostty fork location:

```text
$GHOSTTY_ROOT
```

Important Ghostty files:

```text
$GHOSTTY_ROOT/include/ghostty.h
$GHOSTTY_ROOT/src/apprt/embedded.zig
$GHOSTTY_ROOT/macos/Sources/Ghostty/Ghostty.App.swift
$GHOSTTY_ROOT/macos/Sources/Ghostty/Ghostty.Surface.swift
$GHOSTTY_ROOT/macos/Sources/Ghostty/Surface View/SurfaceView_AppKit.swift
$GHOSTTY_ROOT/macos/Sources/Ghostty/Surface View/SurfaceView.swift
$GHOSTTY_ROOT/macos/Sources/Ghostty/Surface View/OSSurfaceView.swift
```

Ghostty already has an embedded runtime. `src/apprt/embedded.zig` says this mode is for embedding Ghostty inside a parent host application. The macOS Ghostty app already uses this pattern by linking `GhosttyKit` and hosting `Ghostty.SurfaceView` as an AppKit `NSView`.

## Recommended Implementation

Create a native Swift/AppKit host under this repo, for example:

```text
native/macos/zmuxHost
```

Use AppKit as the primary shell. SwiftUI may be used for small auxiliary views, but the main workspace should be AppKit because we need precise child `NSView` layout and focus behavior.

Core native objects:

- `NSWindow`: app window
- `WKWebView`: sidebar/control surface
- `NSView`: native terminal workspace container
- `Ghostty.App`: global Ghostty runtime
- `Ghostty.SurfaceView`: one terminal view per zmux terminal session

## Layout Model

Keep zmux as the source of truth for session/group/sidebar state, but native AppKit should own terminal geometry.

The bridge should send a layout tree to the native host:

```ts
type NativeTerminalLayout =
  | { kind: "leaf"; sessionId: string }
  | {
      kind: "split";
      direction: "horizontal" | "vertical";
      ratio?: number;
      children: NativeTerminalLayout[];
    };
```

The native host renders each leaf as a real `Ghostty.SurfaceView`.

Initial layout support can be simple:

- one pane
- two panes side by side
- grid layouts for 3, 4, 6, 9 visible terminals

Nested split support can come next, using either:

- custom `NSView` layout code, or
- nested `NSSplitView`s

Prefer a small custom layout container if we want layout to exactly match zmux's existing grouping/nesting semantics.

## Bridge Contract

Use a local WebSocket bridge first. It is easier to debug and keeps Swift, React, and Bun loosely coupled.

The native host can either:

1. start the Bun backend as a sidecar process, or
2. connect to a Bun backend started by dev tooling.

### Commands To Native Host

```ts
type HostCommand =
  | {
      type: "createTerminal";
      sessionId: string;
      cwd: string;
      title?: string;
      initialInput?: string;
      env?: Record<string, string>;
    }
  | {
      type: "closeTerminal";
      sessionId: string;
    }
  | {
      type: "focusTerminal";
      sessionId: string;
    }
  | {
      type: "writeTerminalText";
      sessionId: string;
      text: string;
    }
  | {
      type: "setTerminalLayout";
      layout: NativeTerminalLayout;
    }
  | {
      type: "setTerminalVisibility";
      sessionId: string;
      visible: boolean;
    };
```

### Events From Native Host

```ts
type HostEvent =
  | {
      type: "terminalReady";
      sessionId: string;
      ttyName?: string;
      foregroundPid?: number;
    }
  | {
      type: "terminalTitleChanged";
      sessionId: string;
      title: string;
    }
  | {
      type: "terminalCwdChanged";
      sessionId: string;
      cwd: string;
    }
  | {
      type: "terminalExited";
      sessionId: string;
      exitCode?: number;
    }
  | {
      type: "terminalFocused";
      sessionId: string;
    }
  | {
      type: "terminalBell";
      sessionId: string;
    }
  | {
      type: "terminalError";
      sessionId: string;
      message: string;
    };
```

## Native Host Responsibilities

The Swift/AppKit host should:

- initialize `Ghostty.App`
- create one `Ghostty.SurfaceView` per session
- add/remove/move those views in the workspace container
- call Ghostty APIs for text input, focus, resize, close, and config changes
- surface terminal title/cwd/exit/bell/focus events back to Bun/React
- keep keyboard, mouse, IME, selection, clipboard, drag/drop, and Metal rendering native
- own app-window layout and native pane geometry

The host should not render terminals in web content.

## Bun/React Responsibilities

Bun/React should:

- own workspace/session/sidebar state
- render sidebar, dock, actions, agents, session groups, and settings in `WKWebView`
- send terminal commands/layout to the native host
- receive native terminal lifecycle events and hydrate the sidebar
- stop creating xterm/wterm/restty panes

React should not mount terminal renderers. The workspace web area should either be removed or reduced to non-terminal chrome/control overlays.

## Migration Steps

1. Create `native/macos/zmuxHost`.
2. Link the host against Ghostty from `$GHOSTTY_ROOT`.
3. Prove one embedded `Ghostty.SurfaceView` renders in a zmux-owned `NSWindow`.
4. Add a `WKWebView` sidebar next to the terminal workspace.
5. Load the existing sidebar/control React bundle in the `WKWebView`.
6. Add a local bridge between the web UI/Bun backend and Swift host.
7. Implement `createTerminal`, `closeTerminal`, `focusTerminal`, and `writeTerminalText`.
8. Implement native workspace layout for one/two/grid panes.
9. Wire sidebar session cards/actions/agents to native terminal sessions.
10. Delete web terminal engines and dependencies.
11. Package `zmux.app` with Ghostty libraries/frameworks/resources.

## Code To Remove Or Stop Using

Eventually remove these dependency families from `package.json`:

- `@xterm/*`
- `@wterm/dom`
- `restty`
- `ghostty-web`
- `node-pty`, if Ghostty owns all PTY creation through `Ghostty.SurfaceView`
- terminal web transport code that only exists for xterm/wterm/restty

Likely removable repo areas after the native host is working:

```text
workspace/xterm-terminal-pane.tsx
workspace/wterm-terminal-pane.tsx
workspace/wterm-session-transport.ts
workspace/terminal-runtime-cache.ts
workspace/restty-terminal-config.ts
workspace/xterm-font-metrics.ts
workspace/terminal-appearance.ts
src/node/terminal-host-node.cjs
```

<!-- CDXC:NativeWorkspaceChrome 2026-04-27-04:40: The old Electrobun
     src/mainview rail and src/bun runtime were removed after the native macOS
     workspace rail became the only supported launch path for `bun start`.
     Future workspace-rail changes belong in native/sidebar and the native
     host workspaceBarHTML, not in a second Electrobun shell. -->

Do not delete these until the native host owns equivalent session lifecycle/control behavior.

## First Milestone

Build the smallest proof:

- native app launches
- web sidebar is visible
- one embedded native Ghostty terminal is visible beside it
- clicking a sidebar agent creates/focuses a Ghostty terminal and writes the command
- closing the sidebar session closes the native Ghostty surface

No xterm/wterm/restty fallback.

## Risks

- Ghostty's macOS Swift files may assume they are running inside Ghostty.app. Refactor only what is necessary to make `Ghostty.App` and `Ghostty.SurfaceView` reusable from zmux.
- Linking/bundling `GhosttyKit` cleanly may take time.
- React/native geometry sync can get messy if React tries to own the terminal workspace. Prefer native host ownership for terminal pane geometry.
- AppKit focus and `WKWebView` focus need careful handling so sidebar shortcuts do not steal terminal input.
- Codesigning and library validation may need entitlements, especially when bundling Ghostty frameworks/libraries.

## Non-Goals

- No external Ghostty windows as the final UX.
- No web terminal fallback.
- No xterm.js.
- No wterm.
- No restty.
- No terminal pixels rendered through React/canvas/WebGL.

## Desired End State

zmux is a native macOS app where the sidebar and controls are web UI, but every terminal pane is a real embedded Ghostty terminal.

The user should be able to tile many Ghostty terminals side by side, control them from the sidebar, launch agents/actions into them, resize/reorder/focus them, and never touch a web terminal renderer.
