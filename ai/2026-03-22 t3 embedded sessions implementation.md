# T3 Embedded Sessions Implementation

## Purpose

This document describes the current T3 Code integration in VSmux as implemented on 2026-03-22. It is intended to help maintain, extend, and reapply the T3 frontend patches when upstream T3 changes.

The short version:

- VSmux uses upstream `npx t3` as the backend/runtime.
- VSmux does **not** load T3's hosted web app directly.
- VSmux embeds a locally built, patched T3 frontend from `forks/t3code-embed/dist`.
- T3 sessions are first-class VSmux sessions and can coexist with terminal sessions in the same visible layout.

## High-Level Architecture

There are three moving pieces:

1. `npx t3` backend
   - Launched locally on `127.0.0.1:3773`.
   - Owns projects, threads, orchestration snapshot, and websocket API.

2. VSmux extension integration
   - Creates T3 sessions from the sidebar agent area.
   - Persists T3 session metadata in the same grid/session store as terminal sessions.
   - Reconciles visible T3 sessions into editor-area webviews.

3. Patched embedded T3 frontend
   - Built from a gitignored local vendor clone.
   - Generated locally into `forks/t3code-embed/dist`.
   - Bootstrapped by VSmux with the thread id and backend URLs.

The key split is:

- Backend/runtime: upstream T3
- Frontend/rendering: patched VSmux-owned embed bundle

## Files That Matter

### Extension-side integration

- [extension/t3-runtime-manager.ts](/Users/madda/dev/_active/agent-tiler/extension/t3-runtime-manager.ts)
  - Starts or attaches to the shared local T3 backend.
  - Talks to T3 over websocket.
  - Creates or reuses the T3 project for the current workspace root.
  - Creates new thread ids and dispatches `thread.create`.

- [extension/t3-webview-manager.ts](/Users/madda/dev/_active/agent-tiler/extension/t3-webview-manager.ts)
  - Opens T3 sessions as VS Code `WebviewPanel`s in editor groups.
  - Reads `forks/t3code-embed/dist/index.html`.
  - Injects bootstrap state into `window.__VSMUX_T3_BOOTSTRAP__`.
  - Rewrites asset URLs to webview-safe URIs.

- [extension/native-terminal-workspace.ts](/Users/madda/dev/_active/agent-tiler/extension/native-terminal-workspace.ts)
  - Hooks the `t3` sidebar button into `createT3Session()`.
  - Stores T3 sessions in the session grid store.
  - Reconciles visible terminals and T3 webviews together.

- [extension/native-terminal-workspace-backend.ts](/Users/madda/dev/_active/agent-tiler/extension/native-terminal-workspace-backend.ts)
  - Creates placeholder terminals for T3 sessions so the existing visible-slot/editor-group machinery keeps working.

### Shared session model

- [shared/session-grid-contract.ts](/Users/madda/dev/_active/agent-tiler/shared/session-grid-contract.ts)
  - Adds `SessionKind = "terminal" | "t3"`.
  - Defines `T3SessionMetadata` and `T3SessionRecord`.
  - Keeps T3 sessions in the same slot/grid model as terminals.

- [shared/sidebar-agents.ts](/Users/madda/dev/_active/agent-tiler/shared/sidebar-agents.ts)
  - Registers `T3 Code` as a default agent with command `npx t3`.

### Embedded frontend source + build

- `forks/t3code-embed/overlay/apps/web/src/env.ts`
- `forks/t3code-embed/overlay/apps/web/src/main.tsx`
- `forks/t3code-embed/overlay/apps/web/src/store.ts`
- `forks/t3code-embed/overlay/apps/web/src/wsTransport.ts`
- `forks/t3code-embed/overlay/apps/web/src/hooks/useMediaQuery.ts`
- `forks/t3code-embed/overlay/apps/web/src/vsmuxEmbed.ts`

- [scripts/build-t3-embed.mjs](/Users/madda/dev/_active/agent-tiler/scripts/build-t3-embed.mjs)
  - Copies the tracked overlay into the gitignored vendor clone.
  - Builds the T3 web app.
  - Copies the build output into `forks/t3code-embed/dist`.

- `forks/t3code-embed/dist`
  - Committed runtime assets used by the extension webview.

- [ai/t3-embed-patches.md](/Users/madda/dev/_active/agent-tiler/ai/t3-embed-patches.md)
  - Short patch ledger for the overlay/build flow.

## Runtime Flow

### 1. User creates a T3 session

The T3 button in the agents area is defined as a default sidebar agent. In [extension/native-terminal-workspace.ts](/Users/madda/dev/_active/agent-tiler/extension/native-terminal-workspace.ts), `runSidebarAgent()` special-cases `agentId === "t3"` and calls `createT3Session()`.

### 2. VSmux ensures T3 is running

[extension/t3-runtime-manager.ts](/Users/madda/dev/_active/agent-tiler/extension/t3-runtime-manager.ts) does this:

- probes `http://127.0.0.1:3773`
- if unavailable, spawns `npx t3`
- injects:
  - `T3CODE_HOST=127.0.0.1`
  - `T3CODE_PORT=3773`
  - `T3CODE_NO_BROWSER=true`
  - `T3CODE_AUTO_BOOTSTRAP_PROJECT_FROM_CWD=false`

Important defaults:

- host is fixed to `127.0.0.1`
- port is fixed to `3773`
- default startup command is `npx t3`
- thread title passed today is `T3 Code`

### 3. VSmux creates a project/thread in T3

The runtime manager connects to T3's websocket endpoint and uses request envelopes shaped like:

```json
{
  "id": "uuid",
  "body": {
    "_tag": "orchestration.getSnapshot"
  }
}
```

It then:

- fetches the orchestration snapshot
- finds an existing project whose `workspaceRoot` matches the current VS Code workspace root
- creates a project if none exists
- generates a new UUID for `threadId`
- dispatches `thread.create`

The returned VSmux metadata is:

```ts
type T3SessionMetadata = {
  projectId: string;
  serverOrigin: string;
  threadId: string;
  workspaceRoot: string;
};
```

### 4. VSmux persists the T3 session as a real session record

T3 sessions are stored in the normal session grid, not in a side table.

Current shape in [shared/session-grid-contract.ts](/Users/madda/dev/_active/agent-tiler/shared/session-grid-contract.ts):

```ts
type T3SessionRecord = BaseSessionRecord & {
  kind: "t3";
  t3: T3SessionMetadata;
};
```

That means T3 sessions get:

- a normal `sessionId` like `session-4`
- a normal slot position
- a normal alias
- normal visibility/focus/group behavior

### 5. VSmux projects the session into the editor area

The existing backend still expects a projected terminal per visible session. To avoid rewriting all of that logic, T3 sessions currently create a placeholder terminal with a custom PTY in [extension/native-terminal-workspace-backend.ts](/Users/madda/dev/_active/agent-tiler/extension/native-terminal-workspace-backend.ts).

This is an intentional compatibility layer.

It means:

- terminal layout reconciliation still works
- editor group placement still works
- mixed terminal + T3 visible layouts work

Then [extension/t3-webview-manager.ts](/Users/madda/dev/_active/agent-tiler/extension/t3-webview-manager.ts) opens a `WebviewPanel` for each visible T3 session in the corresponding editor column.

## Embedded Frontend Bootstrap

VSmux does not iframe `http://127.0.0.1:3773/<threadId>` directly.

Instead, the webview loads the local built app from `forks/t3code-embed/dist`, and VSmux injects:

```ts
window.__VSMUX_T3_BOOTSTRAP__ = {
  embedMode: "vsmux-mobile",
  httpOrigin: "http://127.0.0.1:3773",
  sessionId: "...",
  threadId: "...",
  workspaceRoot: "...",
  wsUrl: "ws://127.0.0.1:3773",
};
```

That bootstrap is inserted in [extension/t3-webview-manager.ts](/Users/madda/dev/_active/agent-tiler/extension/t3-webview-manager.ts) before the embed bundle runs.

The webview CSP currently allows:

- local webview scripts/styles/fonts/images
- websocket/http connections to the injected T3 origin only

## Frontend Patches We Carry

The tracked patch overlay is intentionally small. Current patches:

### 1. Embed detection

`forks/t3code-embed/overlay/apps/web/src/vsmuxEmbed.ts`

Adds the VSmux bootstrap type and `isVSmuxEmbed()`.

This is the central contract between the extension and the embedded T3 frontend.

### 2. Route bootstrapping via hash history

`forks/t3code-embed/overlay/apps/web/src/main.tsx`

Changes:

- uses hash history in VSmux embed mode
- rewrites the initial hash to `#/<threadId>`

Why:

- VS Code webviews are static asset hosts, so browser path routing is awkward
- the embed must be able to jump directly to the target thread without depending on a real browser pathname

### 3. Force mobile sidebar mode

`forks/t3code-embed/overlay/apps/web/src/hooks/useMediaQuery.ts`

Changes:

- `useIsMobile()` returns `true` whenever `isVSmuxEmbed()` is true

Why:

- we want T3 to always behave like the mobile layout inside VSmux
- the mobile/sidebar pattern keeps the T3 settings/sidebar reachable even in wider editor areas

This is currently the main layout patch.

### 4. Prefer VSmux-provided websocket URL

`forks/t3code-embed/overlay/apps/web/src/wsTransport.ts`

Changes:

- websocket URL resolution now prefers `window.__VSMUX_T3_BOOTSTRAP__.wsUrl`

Why:

- the embed should connect to the shared `npx t3` backend selected by VSmux
- it should not infer connection details from the webview URL

### 5. Prefer VSmux-provided HTTP origin

`forks/t3code-embed/overlay/apps/web/src/store.ts`

Changes:

- attachment/resource HTTP origin resolution prefers `bootstrap.httpOrigin`

Why:

- the frontend must fetch T3 resources from the same backend origin VSmux launched or attached to

### 6. Export embed detection through env

`forks/t3code-embed/overlay/apps/web/src/env.ts`

Changes:

- re-exports `isVSmuxEmbed()`

Why:

- keeps embed checks aligned with the rest of T3's environment helpers

## Build and Update Workflow

### Source of truth

These are the intended sources of truth:

- upstream T3 source: local gitignored clone in `forks/t3code-embed/upstream`
- our maintained patch delta: local overlay in `forks/t3code-embed/overlay`
- runtime assets loaded by VSmux: local build in `forks/t3code-embed/dist`

The upstream clone, overlay, and build output all live under the same local-only root.

### Why the vendor clone is gitignored

The repo ignores `forks/t3code-embed/` in [.gitignore](/Users/madda/dev/_active/agent-tiler/.gitignore).

That keeps the main repo from ballooning with upstream T3 source and generated assets while still letting a fork rebuild the embed locally.

### Rebuild steps

Current rebuild command:

```bash
node ./scripts/build-t3-embed.mjs
```

That script does:

1. verify `forks/t3code-embed/upstream` exists
2. copy `forks/t3code-embed/overlay` over the vendor source tree
3. run `bun install` at the vendor root
4. run `bun run build` in `apps/web`
5. replace `forks/t3code-embed/dist` with the new build output

### Updating to a newer upstream T3 revision

Recommended update flow:

1. Refresh `forks/t3code-embed/upstream` from the desired upstream T3 commit.
2. Compare upstream files against the overlay paths in `forks/t3code-embed/overlay`.
3. Reapply or adapt each overlay file deliberately.
4. Run `node ./scripts/build-t3-embed.mjs`.
5. Smoke test:
   - create a new T3 session
   - reopen an existing T3 session
   - verify forced mobile behavior
   - verify settings remain reachable through the sidebar UI
   - verify mixed terminal + T3 layouts still reconcile correctly
6. Commit:
   - updated extension integration code
   - updated build/docs instructions
   - updated patch docs

Do not treat the built assets as the authoring surface. The authoring surface is the local overlay.

## Current Design Choices Worth Preserving

### 1. T3 stays a separate session kind

This is the right model. T3 sessions are part of the same grid, but they are not terminal sessions.

Do not collapse T3 metadata into terminal-only types.

### 2. The frontend is locally embedded, not cross-origin injected

This avoids trying to mutate a localhost page from a parent webview. The current approach is much more maintainable.

### 3. Force-mobile is implemented in T3 source, not with runtime DOM hacks

This patch is small, easy to reason about, and far less brittle than CSS/JS injection into a loaded page.

### 4. One shared backend process

Today there is one shared T3 backend on `127.0.0.1:3773`.

That keeps session creation simple and lets multiple VSmux T3 sessions talk to the same orchestration store.

## Known Sharp Edges

### Placeholder terminals are a compatibility hack

The current mixed-layout implementation depends on placeholder terminals for T3 sessions. That is workable, but it is still a hack.

If the editor/terminal reconciliation layer changes later, revisit whether T3 web sessions can become first-class projections without a terminal placeholder.

### Host and port are fixed today

Current constants in [extension/t3-runtime-manager.ts](/Users/madda/dev/_active/agent-tiler/extension/t3-runtime-manager.ts):

- host: `127.0.0.1`
- port: `3773`

If we later need per-window backends or configurable ports, the bootstrap contract and runtime manager will both need changes.

### Runtime creation coverage is light

There is explicit test coverage around sidebar defaults and placeholder-terminal behavior, but not much direct automated coverage for the full T3 runtime + webview path yet.

If this area keeps growing, add tests around:

- `createT3Session()`
- bootstrap payload generation
- project reuse by `workspaceRoot`
- rehydration of stored T3 sessions

## Good Next Extension Points

If we extend this later, these are the safest places:

### Better session titles

Right now new T3 sessions are created with title `T3 Code`. We can later derive a better title from:

- thread metadata from T3
- the workspace folder name
- the first user prompt

### Configurable backend command

The default is `npx t3`, but the architecture already accepts a startup command path from the sidebar agent configuration.

### Richer embed contract

If we need tighter control later, add fields to `VSmuxEmbedBootstrap` instead of adding DOM hacks.

Good examples:

- theme override
- initial sidebar open state
- read-only mode
- diagnostics logging flag

### Better patch ledger

[ai/t3-embed-patches.md](/Users/madda/dev/_active/agent-tiler/ai/t3-embed-patches.md) is currently short. If the overlay grows, expand that file into a stricter checklist per upstream file.

## Maintenance Rule of Thumb

When something breaks, debug it in this order:

1. Is `npx t3` actually running and responding on `127.0.0.1:3773`?
2. Did the websocket/bootstrap contract change?
3. Did upstream T3 rename or move one of the overlayed frontend files?
4. Did the VSmux session/grid reconciliation fail before the webview was shown?
5. Did the embed build in `forks/t3code-embed/dist` get out of sync with the overlay?

Most likely failure classes are:

- upstream frontend refactors invalidating an overlay file
- backend websocket contract drift
- routing changes in the T3 web app
- VSmux layout reconciliation changes affecting placeholder projections

## Related Docs

- [ai/t3-embed-patches.md](/Users/madda/dev/_active/agent-tiler/ai/t3-embed-patches.md)
- [scripts/build-t3-embed.mjs](/Users/madda/dev/_active/agent-tiler/scripts/build-t3-embed.mjs)
