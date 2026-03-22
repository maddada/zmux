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

Behavior changes:

- `main.tsx`
  - Uses hash history in VSmux embed mode.
  - Bootstraps directly to `#/<threadId>`.
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

Rebuild flow:

1. Refresh `forks/t3code-embed/upstream` from your local T3 clone.
2. Run `node ./scripts/build-t3-embed.mjs`.
3. Do not commit the local embed source, overlay, or build output.
4. Commit only the extension code, scripts, and documentation that describe the integration.

Notes:

- `forks/t3code-embed/` is intentionally gitignored.
- The local runtime source of truth for VSmux is `forks/t3code-embed/dist`.
