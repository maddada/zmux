#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_PATH="$SCRIPT_DIR/zmux.xcodeproj"
CONFIGURATION="${CONFIGURATION:-Debug}"
APP_NAME="zmux"
BUNDLE_ID="com.madda.zmux.host"
INSTALL_DIR="${INSTALL_DIR:-/Applications}"
INSTALLED_APP="$INSTALL_DIR/$APP_NAME.app"
HELPER_APP_NAME="zmuxGhosttySessionHost"
INSTALLED_HELPER_APP="$INSTALL_DIR/$HELPER_APP_NAME.app"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DERIVED_DATA="${DERIVED_DATA:-$REPO_ROOT/build}"

"$SCRIPT_DIR/build-zmux-host.sh"

APP_PATH="$(
	xcodebuild \
		-project "$PROJECT_PATH" \
		-scheme zmux \
		-configuration "$CONFIGURATION" \
		-derivedDataPath "$DERIVED_DATA" \
		-showBuildSettings 2>/dev/null |
		awk -F' = ' '/BUILT_PRODUCTS_DIR/ { print $2; exit }'
)/$APP_NAME.app"
HELPER_APP_PATH="$(dirname "$APP_PATH")/$HELPER_APP_NAME.app"

osascript -e "tell application id \"$BUNDLE_ID\" to quit" >/dev/null 2>&1 || true
pkill -x "$APP_NAME" 2>/dev/null || true
pkill -x "$HELPER_APP_NAME" 2>/dev/null || true
sleep 0.3

# CDXC:ZedOverlay 2026-04-26-04:16: Install dev builds to a stable
# /Applications app path before launching so macOS Accessibility permission
# stays attached to the same signed app identity across rebuilds.
rm -rf "$INSTALLED_APP"
rm -rf "$INSTALLED_HELPER_APP"
cp -R "$APP_PATH" "$INSTALL_DIR/"
cp -R "$HELPER_APP_PATH" "$INSTALL_DIR/"
"$SCRIPT_DIR/codesign-zmux-host.sh" "$INSTALLED_APP"
"$SCRIPT_DIR/codesign-zmux-host.sh" "$INSTALLED_HELPER_APP"
open "$INSTALLED_APP"
