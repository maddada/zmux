# Browser Session Integrated Browser Reuse Issue

The current browser-action implementation is in [extension/browser-session-manager.ts](/Users/madda/dev/_active/agent-tiler/extension/browser-session-manager.ts) and is wired from [extension/native-terminal-workspace.ts](/Users/madda/dev/_active/agent-tiler/extension/native-terminal-workspace.ts).

The intended behavior is:

- one VSmux browser session maps to one VS Code integrated-browser tab
- focusing that session from the sidebar should reuse the existing tab
- it should not open a duplicate browser tab if that browser session is already visible or already exists

That is not happening. Clicking the session card often opens a new browser tab instead of selecting the existing one.

## Why This Is Hard

We are opening browser sessions with the built-in command `simpleBrowser.api.open`.

In current VS Code, when `simpleBrowser.useIntegratedBrowser` is enabled, `simpleBrowser.api.open` delegates to `workbench.action.browser.open`.

I verified this by reading VS Code’s bundled simple-browser extension at:

- `/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/simple-browser/dist/extension.js`

That delegation drops the `viewColumn` and `preserveFocus` options. So once integrated browser mode is on, we do not really control placement or reveal through the simple-browser API anymore.

## The Main Technical Problem

The core problem is tab identity.

What we tried:

- First version tried to rediscover the browser tab by matching URL in `findMatchingTab(...)`.
- That failed because integrated-browser tabs do not reliably appear as `TabInputText` or `TabInputCustom` with a usable URL.
- Some integrated-browser tabs appear as `TabInputWebview`, and `TabInputWebview` only exposes `viewType`, not the URL.
- After that, I changed `openBrowserTab(...)` to do a before/after tab diff and store the newly opened `vscode.Tab` object directly.
- I also changed the focus path so if we already have a live tab object, we try to select it with `workbench.action.openEditorAtIndexN` instead of reopening the URL.

## Why It Still Duplicates

If our stored `vscode.Tab` reference becomes stale, or the integrated browser internally recreates or rebinds the tab, we lose stable identity.

Once that happens, we cannot reliably rediscover "the browser tab for URL X" because integrated-browser tabs do not expose URL identity through the public tab API.

The fallback path then calls `simpleBrowser.api.open` again, which creates another integrated-browser tab.

So the current implementation has no guaranteed stable way to map:

- `sessionId -> existing integrated browser tab`

## What Is Already Fixed

- Browser session cards no longer show as dead immediately after creation.
- Browser sidebar running state now uses visibility or live-tab state instead of being hardcoded `false`.

## What Is Not Fixed

- Reusing the exact same integrated-browser tab for a given VSmux browser session.
- Renaming the integrated-browser editor tab to the browser action name. VS Code does not expose a clean supported API for setting that tab label.

## Important Code Locations

- [extension/browser-session-manager.ts](/Users/madda/dev/_active/agent-tiler/extension/browser-session-manager.ts)
  - `revealSession(...)`
  - `openBrowserTab(...)`
  - `focusExistingTab(...)`
  - `findMatchingTab(...)`
  - `hasLiveTab(...)`
- [extension/native-terminal-workspace.ts](/Users/madda/dev/_active/agent-tiler/extension/native-terminal-workspace.ts)
  - browser-session creation
  - browser sidebar item running state

## Likely Conclusion For The Next Agent

If we must keep using the integrated browser, the next agent needs to find a stronger identity hook than the public `Tab` URL or input surface.

If that does not exist, the current approach is fundamentally unreliable.

The robust fallback would be:

- stop using the integrated browser for managed VSmux browser sessions
- instead use a custom VSmux webview/editor where we fully own tab identity, reveal behavior, restore behavior, and title

## Summary

The duplication bug exists because integrated-browser tabs do not provide a stable public URL-based identity through VS Code’s tab API, and `simpleBrowser.api.open` in integrated mode delegates to `workbench.action.browser.open`, which removes the controlled-reveal semantics we were depending on.
