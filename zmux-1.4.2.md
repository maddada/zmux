<!-- sparkle-sign-warning:
IMPORTANT: This file was signed by Sparkle. Any modifications to this file requires updating signatures in appcasts that reference this file! This will involve re-running generate_appcast or sign_update.
-->
# zmux 1.4.2

<!-- CDXC:AutoUpdate 2026-05-02-11:35: Sparkle appcast release notes must
ship with the signed appcast item so installed apps can verify release notes
and detect the monotonic CFBundleVersion update. -->

- Fixed Sparkle update detection by publishing the app with `CFBundleVersion` `10402`.
- Includes the native AppKit pane resizing changes from 1.4.1.
