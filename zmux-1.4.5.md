# zmux 1.4.5

- Added native title-bar split controls for primary Actions and Open In commands while keeping empty title-bar space draggable.
- Added React-rendered title-bar dropdown menus for configured zmux actions and Open In targets, reusing the existing sidebar command and selected-IDE state.
- Improved terminal focus sync so passive layout/status updates no longer steal focus from the terminal or modal the user is actively typing in.
- Improved embedded Ghostty terminal color handling by removing inherited color-disabling environment keys at the native surface boundary.
- Added optional CEF prototype scaffolding for future Chromium browser panes while keeping the default WKWebView build path buildable without the Chromium SDK.
