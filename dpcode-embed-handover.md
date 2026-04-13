# DP Code Embed Handover

## Purpose

This note captures how the embedded `dpcode-embed` runtime is wired into VSmux today, what broke on Windows, what was changed to fix it, and the safest way to upgrade the sibling `../dpcode-embed` checkout later without breaking macOS or Windows.

Current embedded repo revision:

- `../dpcode-embed` at `0eb29471e3b2ff9b0f64ab1e6a5fab090953be69`

Current upstream engine expectations from `../dpcode-embed/package.json`:

- Bun: `^1.3.9`
- Node: `^24.13.1`

## Current Integration Contract

### Where the extension expects things

- Source repo: `../dpcode-embed`
- Managed server source entrypoint: `../dpcode-embed/apps/server/src/index.ts`
- Windows managed server build output: `../dpcode-embed/apps/server/dist/index.mjs`
- Web build output: `../dpcode-embed/apps/web/dist`
- Packaged web assets copied into extension output: `out/t3-embed`

### Files that matter in VSmux

- `extension/t3-runtime-manager.ts`
- `extension/t3-runtime-supervisor.ts`
- `extension/workspace-asset-server.ts`
- `extension/t3-webview-manager/html.ts`
- `scripts/build-t3-embed.mjs`
- `package.json`

### Runtime behavior by platform

- macOS/Linux: VSmux launches DP Code with Bun from source:
  - `bun ../dpcode-embed/apps/server/src/index.ts --mode desktop --host 127.0.0.1 --port 3774 --no-browser`
- Windows: VSmux launches DP Code with Node from built output:
  - `node ../dpcode-embed/apps/server/dist/index.mjs --mode desktop --host 127.0.0.1 --port 3774 --no-browser`

The Windows split exists because the Bun-driven startup path was unreliable there. If you remove that split, expect Windows regressions.

### Auth and websocket contract

- VSmux now uses `T3CODE_AUTH_TOKEN` for managed runtime auth.
- The old `--bootstrap-json` / fd3 bootstrap path is not used by the current DP Code integration.
- The local asset/proxy server rewrites websocket `?token=` to the current live runtime token so stale iframes do not stay broken after a runtime restart.

### Repo root resolution

Managed runtime repo root is resolved in this order:

1. `VSMUX_T3_REPO_ROOT`
2. VS Code setting `VSmux.t3RepoRoot`
3. Auto-detected repo candidates from workspace folders, a sibling `dpcode-embed` checkout, extension path, and cwd

If the wrong checkout is being used, fix the setting or env var first. Do not work around it by copying random files into the installed extension folder.

## What Broke On Windows

There were two separate failures:

1. Startup timeout on `http://127.0.0.1:3774`
2. Websocket reconnect failures when the embedded UI tried to talk to the runtime

The main startup causes on Windows were:

- wrong repo root selected
- missing `../dpcode-embed/node_modules`
- Bun too old
- missing `apps/server/dist/index.mjs`
- supervisor launch path still carrying old assumptions

The websocket failure was a stale token problem between the embedded iframe and the proxy after runtime restarts.

## Recovery Steps To Repeat Later

Use these steps when Windows breaks again or after pulling a newer `dpcode-embed`.

### 1. Update the embedded repo

From the VSmux repo root:

```powershell
git -C ..\dpcode-embed fetch --all --prune
git -C ..\dpcode-embed status
git -C ..\dpcode-embed pull --ff-only
```

### 2. Confirm tool versions first

```powershell
bun --version
node --version
```

Minimums that matter right now:

- Bun `>= 1.3.9`
- Node should satisfy DP Code's current engine requirement

### 3. Install embedded repo dependencies

```powershell
Set-Location ..\dpcode-embed
bun install
Set-Location ..\agent-tiler
```

### 4. Build the embedded web assets

This copies `../dpcode-embed/apps/web/dist` into `out/t3-embed`, which is what the packaged extension serves.

```powershell
pnpm run t3:embed:build
```

### 5. Build the DP Code server on Windows

This is required on Windows because VSmux launches `apps/server/dist/index.mjs`.

```powershell
Set-Location ..\dpcode-embed\apps\server
bun run build
Set-Location ..\..\..\agent-tiler
```

### 6. Rebuild and reinstall the VSIX

```powershell
pnpm run install
```

### 7. Reload VS Code

Run:

- `Developer: Reload Window`

Without a reload, the running extension host may still be using old JS and old iframe code.

## Quick Validation Checklist

Before assuming a code bug, check these paths exist:

- `../dpcode-embed/node_modules`
- `../dpcode-embed/apps/web/dist/index.html`
- `out/t3-embed/index.html`
- `../dpcode-embed/apps/server/dist/index.mjs` on Windows

If the UI loads but sending messages fails, check for websocket errors against:

- `ws://127.0.0.1:11850/ws?...`

That usually means the iframe/proxy/runtime auth state is out of sync. Reload the window first before changing code.

## Runtime State Worth Inspecting

The managed runtime stores state under the extension global storage `t3-runtime` directory.

Useful files:

- `supervisor.json`
- `auth-state.json`
- `leases/*.json`

What they mean:

- `supervisor.json`: what command was launched and when
- `auth-state.json`: current bearer token used by the proxy/runtime
- `leases`: whether VSmux still considers the managed runtime in use

If startup keeps timing out, inspect `supervisor.json` before guessing.

## Upgrade Playbook For The Next DP Code Version

When updating `../dpcode-embed`, follow this order.

### 1. Pull the new upstream revision

- fast-forward or merge in the new DP Code version into `../dpcode-embed`
- record the new commit in this handover doc

### 2. Re-check the server startup contract

Confirm these are still valid:

- `apps/server/src/index.ts` still exists
- `bun <entrypoint> --mode desktop --host 127.0.0.1 --port 3774 --no-browser` still works on macOS/Linux
- `bun run build` still produces `apps/server/dist/index.mjs` for Windows
- `node apps/server/dist/index.mjs --mode desktop --host 127.0.0.1 --port 3774 --no-browser` still works on Windows

If any of those change, update `extension/t3-runtime-manager.ts` first.

### 3. Re-check the auth contract

Confirm DP Code still supports:

- `T3CODE_AUTH_TOKEN`
- websocket auth via `?token=...` and/or bearer token

If upstream changes auth bootstrap, update:

- `extension/t3-runtime-manager.ts`
- `extension/workspace-asset-server.ts`
- `extension/t3-webview-manager/html.ts`

### 4. Re-check the web embed contract

Our iframe bootstrap currently assumes the built HTML still exposes:

- one main script tag with `src`
- one stylesheet link with `href`
- assets that can be served from `out/t3-embed`

If upstream changes the HTML shape heavily, update `extension/t3-webview-manager/html.ts`.

### 5. Re-check HTTP and websocket paths

The local proxy currently forwards:

- `/.well-known/t3/environment`
- `/api/*`
- `/attachments/*`
- `/ws`

If upstream moves those endpoints, update `extension/workspace-asset-server.ts`.

### 6. Re-check engine requirements

If upstream bumps Bun or Node requirements:

- update `MINIMUM_MANAGED_T3_BUN_VERSION` in `extension/t3-runtime-manager.ts`
- make sure the Windows Node launch path still uses a compatible Node runtime

### 7. Rebuild everything and test both platforms

Minimum test matrix:

- macOS: open T3 Code, create/load thread, send a message
- Windows: open T3 Code, create/load thread, send a message
- restart the runtime or reload the window, then verify reconnect still works

Do not sign off after testing only macOS. The two launch paths are intentionally different now.

## Things To Keep In Mind

- Do not fix this by manually copying random files into the installed extension directory. The supported path is to build `out/t3-embed` and reinstall the VSIX.
- If Windows times out on port `3774`, first suspect missing dependencies, old Bun, or missing `apps/server/dist/index.mjs`.
- If the T3 UI loads but cannot send messages, first suspect websocket auth/token mismatch and reload the VS Code window.
- If the runtime points at the wrong checkout, set `VSmux.t3RepoRoot` or `VSMUX_T3_REPO_ROOT`.
- The repo still contains older `t3code-embed` tests/helpers in places. For new DP Code work, prefer the current `dpcode-embed` paths and update stale test names when touching them.

## Recommended Future Cleanup

These are not required for the current setup to work, but they would reduce future breakage:

- rename remaining `t3`/`t3code` test names and helper names to `dpcode`
- add a dedicated regression test for the Windows startup command
- add an integration test that exercises the websocket proxy token rewrite
- document the expected Node version for Windows builds in the main README
