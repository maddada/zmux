# T3 Embed Patches

Upstream source:

- Repo: `https://github.com/pingdotgg/t3code`
- Vendor commit: `9e29c9d72895022322da52d8e961b38702bad9cc`
- Local-only working root: `forks/t3code-embed`

Local patch overlay:

- `forks/t3code-embed/overlay/apps/web/src/env.ts`
- `forks/t3code-embed/overlay/apps/web/src/main.tsx`
- `forks/t3code-embed/overlay/apps/web/src/store.ts`
- `forks/t3code-embed/overlay/apps/web/src/wsTransport.ts`
- `forks/t3code-embed/overlay/apps/web/src/hooks/useMediaQuery.ts`
- `forks/t3code-embed/overlay/apps/web/src/vsmuxEmbed.ts`

Patch intent:

- Let VSmux host a patched T3 frontend inside VS Code webviews while continuing to use `npx t3` as the backend.
- Force T3 into its mobile sidebar behavior even at editor-width breakpoints.
- Inject the target `threadId`, `workspaceRoot`, `httpOrigin`, and `wsUrl` from VSmux instead of relying on browser location.
- Allow VSmux to focus the T3 composer when the user activates a T3 session from the VSmux sidebar.

Behavior changes:

- `main.tsx`
  - Uses hash history in VSmux embed mode.
  - Bootstraps directly to `#/<threadId>`.
  - Installs the VSmux embed bridge during app startup.
- `env.ts`
  - Exposes `isVSmuxEmbed()`.
- `hooks/useMediaQuery.ts`
  - Forces `useIsMobile()` to return `true` in embed mode.
- `wsTransport.ts`
  - Prefers the VSmux-provided websocket URL.
- `store.ts`
  - Prefers the VSmux-provided HTTP origin for attachment/resource URLs.
- `vsmuxEmbed.ts`
  - Defines the bootstrap object contract on `window.__VSMUX_T3_BOOTSTRAP__`.
  - Installs a VS Code webview message bridge.
  - Sends a `vsmuxReady` message back to the extension once the embed runtime is ready.
  - Listens for `focusComposer` messages from VSmux.
  - Focuses the composer using T3's stable DOM hooks:
    - preferred selector: `[data-testid="composer-editor"]`
    - fallback selector: `[contenteditable="true"]`
    - final fallback: `textarea, input`
  - When focusing a contenteditable composer, moves the caret to the end so the next keystroke appends to the current prompt.

Extension-side dependency on these patches:

- VSmux expects the embedded T3 frontend to acknowledge readiness with `vsmuxReady`.
- VSmux can then send `focusComposer` without reloading the panel.
- If these message names or DOM hooks change upstream, the local overlay must be updated together with:
  - `extension/t3-webview-manager.ts`
  - `extension/native-terminal-workspace.ts`

Reapply checklist when updating upstream T3:

1. Reapply the embed bootstrap contract in `vsmuxEmbed.ts`.
2. Reapply hash-history boot and bridge installation in `main.tsx`.
3. Reapply forced-mobile behavior in `hooks/useMediaQuery.ts`.
4. Reapply backend origin overrides in `store.ts` and `wsTransport.ts`.
5. Verify the composer selector still exists:
   - first check `[data-testid="composer-editor"]`
   - if upstream changed it, update the fallback selector in `vsmuxEmbed.ts`
6. Rebuild with `node ./scripts/build-t3-embed.mjs`.
7. Manually verify:
   - T3 opens directly into the injected thread
   - the sidebar uses mobile behavior at wide widths
   - clicking a T3 session in VSmux focuses the composer without reloading the panel

Rebuild flow:

1. Refresh `forks/t3code-embed/upstream` from your local T3 clone.
2. Run `node ./scripts/build-t3-embed.mjs`.
3. Do not commit the local embed source, overlay, or build output.
4. Commit only the extension code, scripts, and documentation that describe the integration.

Notes:

- `forks/t3code-embed/` is intentionally gitignored.
- The local runtime source of truth for VSmux is `forks/t3code-embed/dist`.
