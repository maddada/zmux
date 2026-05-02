<!-- sparkle-sign-warning:
IMPORTANT: This file was signed by Sparkle. Any modifications to this file requires updating signatures in appcasts that reference this file! This will involve re-running generate_appcast or sign_update.
-->
# zmux 1.4.1

<!-- CDXC:AutoUpdate 2026-05-02-11:18: Sparkle appcast items reference
versioned release-note files from the raw GitHub main branch, so each release
must commit the note file that `generate_appcast` links from appcast.xml. -->

- Moved split pane resizing into the native AppKit terminal workspace.
- Removed the React workspace resize overlay that no longer applies to native pane sizing.
- Removed whole-cell terminal body stepping so pane chrome and terminal renderer widths stay aligned during native resize.
