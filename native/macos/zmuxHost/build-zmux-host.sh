#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_PATH="$SCRIPT_DIR/zmux.xcodeproj"
CONFIGURATION="${CONFIGURATION:-Debug}"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
WEB_DIR="$SCRIPT_DIR/Web"
GHOSTTY_ROOT="${GHOSTTY_ROOT:-}"
DERIVED_DATA="${DERIVED_DATA:-$REPO_ROOT/build}"
ZMUX_APP_VARIANT="${ZMUX_APP_VARIANT:-prod}"
if [[ "$ZMUX_APP_VARIANT" == "dev" ]]; then
	# CDXC:DevAppFlavor 2026-04-28-02:01: The dev build must generate a
	# distinct macOS app with its own bundle id and ~/.zmux-dev diagnostics
	# root, while sharing ~/.zmux hooks, workspaces, and sessions.
	ZMUX_APP_NAME="${ZMUX_APP_NAME:-zmux-dev}"
	ZMUX_APP_DISPLAY_NAME="${ZMUX_APP_DISPLAY_NAME:-zmux-dev}"
	ZMUX_BUNDLE_ID="${ZMUX_BUNDLE_ID:-com.madda.zmux-dev.host}"
	ZMUX_HOME_DIRECTORY_NAME="${ZMUX_HOME_DIRECTORY_NAME:-.zmux-dev}"
	ZMUX_SHARED_HOME_DIRECTORY_NAME="${ZMUX_SHARED_HOME_DIRECTORY_NAME:-.zmux}"
	ZMUX_SPARKLE_FEED_URL="${ZMUX_SPARKLE_FEED_URL:-https://raw.githubusercontent.com/maddada/zmux/main/appcast.xml}"
	ZMUX_SPARKLE_PUBLIC_ED_KEY="${ZMUX_SPARKLE_PUBLIC_ED_KEY:-AGWDPeMqfhmbjt8Pbk+VTC9fDfXAYq+cZoLGCYuGn70=}"
else
	ZMUX_APP_NAME="${ZMUX_APP_NAME:-zmux}"
	ZMUX_APP_DISPLAY_NAME="${ZMUX_APP_DISPLAY_NAME:-zmux}"
	ZMUX_BUNDLE_ID="${ZMUX_BUNDLE_ID:-com.madda.zmux.host}"
	ZMUX_HOME_DIRECTORY_NAME="${ZMUX_HOME_DIRECTORY_NAME:-.zmux}"
	ZMUX_SHARED_HOME_DIRECTORY_NAME="${ZMUX_SHARED_HOME_DIRECTORY_NAME:-.zmux}"
	ZMUX_SPARKLE_FEED_URL="${ZMUX_SPARKLE_FEED_URL:-https://raw.githubusercontent.com/maddada/zmux/main/appcast.xml}"
	ZMUX_SPARKLE_PUBLIC_ED_KEY="${ZMUX_SPARKLE_PUBLIC_ED_KEY:-AGWDPeMqfhmbjt8Pbk+VTC9fDfXAYq+cZoLGCYuGn70=}"
fi

# CDXC:AutoUpdate 2026-05-02-06:51: Sparkle update checks need an appcast URL
# and EdDSA public key in Info.plist. The default public key is read from the
# user's Sparkle keychain account, and release automation can still override
# either value if the appcast host or signing account changes.
export ZMUX_SPARKLE_FEED_URL
export ZMUX_SPARKLE_PUBLIC_ED_KEY

if [[ -z "$GHOSTTY_ROOT" ]]; then
	# CDXC:NativeHost 2026-04-27-06:06: Local start/build commands should
	# discover the adjacent Ghostty checkout that already contains the required
	# xcframework so `bun start` launches the native host without per-shell setup.
	for candidate in \
		"$REPO_ROOT/../ghostty" \
		"$REPO_ROOT/../ghostty-zmux-survival" \
		"$REPO_ROOT/../../_forks/ghostty"; do
		if [[ -d "$candidate/macos/GhosttyKit.xcframework" ]]; then
			GHOSTTY_ROOT="$(cd "$candidate" && pwd)"
			break
		fi
	done
fi

if [[ -z "$GHOSTTY_ROOT" ]]; then
	cat >&2 <<EOF
Set GHOSTTY_ROOT to your local Ghostty checkout before building zmuxHost.

Expected to find:
  \$GHOSTTY_ROOT/macos/GhosttyKit.xcframework
EOF
	exit 1
fi

GHOSTTY_KIT="$GHOSTTY_ROOT/macos/GhosttyKit.xcframework"
CEF_ROOT="${CEF_ROOT:-}"

if [[ ! -d "$GHOSTTY_KIT" ]]; then
	cat >&2 <<EOF
GhosttyKit.xcframework is missing:
  $GHOSTTY_KIT

Build it first:
  cd "$GHOSTTY_ROOT"
  env DEVELOPER_DIR=/Library/Developer/CommandLineTools \\
    SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX15.4.sdk \\
    GHOSTTY_METAL_DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \\
    zig build -Demit-xcframework -Dxcframework-target=native -Demit-macos-app=false
EOF
	exit 1
fi

if [[ -z "$CEF_ROOT" ]]; then
	# CDXC:ChromiumBrowserPanes 2026-05-04-16:38
	# Browser panes render through embedded Chromium, so the native host build
	# vendors CEF and its helper binary before Xcode resolves ObjC++ headers and
	# link paths. This is a build dependency, not a package-manager install.
	CEF_ROOT="$("$SCRIPT_DIR/vendor-cef.sh")"
else
	CEF_ROOT="$CEF_ROOT" "$SCRIPT_DIR/vendor-cef.sh" >/dev/null
fi

if ! command -v xcodegen >/dev/null 2>&1; then
	cat >&2 <<EOF
xcodegen is required to generate the zmux project.

Install it, then rerun this script:
  brew install xcodegen
EOF
	exit 1
fi

mkdir -p "$WEB_DIR"
cp "$REPO_ROOT/native/sidebar/index.html" "$WEB_DIR/index.html"
rm -rf "$WEB_DIR/sounds"
mkdir -p "$WEB_DIR/sounds"
# CDXC:NativeSound 2026-04-29-16:30: Bundle completion sound assets beside
# the native Web resources so AVFoundation playback works from installed apps
# without relying on repository-relative media paths.
cp "$REPO_ROOT"/media/sounds/*.mp3 "$WEB_DIR/sounds/"
# CDXC:NativeSidebarBuild 2026-04-27-09:32
# The native sidebar is loaded by WKWebView as a classic script, while
# Storybook imports some sidebar components as ES modules. Force the packaged
# native bundle to IIFE so exported Storybook symbols never leave top-level
# `export` syntax in /Applications/zmux.app and blank the app at startup.
bun build "$REPO_ROOT/native/sidebar/native-sidebar.tsx" \
	--target browser \
	--format iife \
	--asset-naming "[name].[ext]" \
	--outdir "$WEB_DIR"
bun build "$REPO_ROOT/native/sidebar/modal-host.tsx" \
	--target browser \
	--format iife \
	--asset-naming "[name].[ext]" \
	--outdir "$WEB_DIR"

WEB_DIR="$WEB_DIR" node <<'JS'
const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const webDir = process.env.WEB_DIR;
const css = readFileSync(join(webDir, "native-sidebar.css"), "utf8");
const js = readFileSync(join(webDir, "native-sidebar.js"), "utf8");
const modalJs = readFileSync(join(webDir, "modal-host.js"), "utf8");
// Inline script bodies must escape HTML script end tags that appear inside bundle strings.
const escapedJs = js.replace(/<\/script/gi, "<\\/script");
const escapedModalJs = modalJs.replace(/<\/script/gi, "<\\/script");
writeFileSync(join(webDir, "index.html"), `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <style>
${css}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
(() => {
try {
${escapedJs}
} catch (error) {
  window.__zmux_BOOT_ERROR__ = {
    message: error && error.message ? String(error.message) : String(error),
    stack: error && error.stack ? String(error.stack) : ""
  };
  throw error;
}
})();
//# sourceURL=native-sidebar.js
    </script>
  </body>
</html>
`);
writeFileSync(join(webDir, "modal-host.html"), `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <style>
${css}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
(() => {
try {
${escapedModalJs}
} catch (error) {
  window.__zmux_BOOT_ERROR__ = {
    message: error && error.message ? String(error.message) : String(error),
    stack: error && error.stack ? String(error.stack) : ""
  };
  throw error;
}
})();
//# sourceURL=modal-host.js
    </script>
  </body>
</html>
`);
JS

# CDXC:PublicRelease 2026-04-27-05:36: Public builds must not encode a
# maintainer-specific Ghostty checkout path; project.yml reads GHOSTTY_ROOT
# from the caller's environment when XcodeGen resolves native host paths.
export GHOSTTY_ROOT
export ZMUX_APP_NAME
export ZMUX_APP_DISPLAY_NAME
export ZMUX_BUNDLE_ID
export ZMUX_HOME_DIRECTORY_NAME
export ZMUX_SHARED_HOME_DIRECTORY_NAME
export CEF_ROOT
xcodegen generate --spec "$SCRIPT_DIR/project.yml"

STALE_APP_PATH="$DERIVED_DATA/Build/Products/$CONFIGURATION/$ZMUX_APP_NAME.app"
if [[ -d "$STALE_APP_PATH/Contents/Frameworks" ]]; then
	# CDXC:ChromiumBrowserPanes 2026-05-04-17:00
	# CEF is copied after Xcode validation because the Spotify minimal framework
	# layout does not satisfy Xcode's generic framework validator. Incremental
	# builds must remove only the generated CEF payload before xcodebuild, then
	# copy and sign the runtime again after the app bundle is produced.
	rm -rf \
		"$STALE_APP_PATH/Contents/Frameworks/Chromium Embedded Framework.framework" \
		"$STALE_APP_PATH"/Contents/Frameworks/zmux\ Helper*.app
fi

xcodebuild \
	-project "$PROJECT_PATH" \
	-scheme zmux \
	-configuration "$CONFIGURATION" \
	-derivedDataPath "$DERIVED_DATA" \
	build

APP_PATH="$(
	xcodebuild \
		-project "$PROJECT_PATH" \
		-scheme zmux \
		-configuration "$CONFIGURATION" \
		-derivedDataPath "$DERIVED_DATA" \
		-showBuildSettings 2>/dev/null |
		awk -F' = ' '/BUILT_PRODUCTS_DIR/ { print $2; exit }'
)/$ZMUX_APP_NAME.app"

copy_cef_runtime() {
	local app_path="$1"
	local frameworks_dir="$app_path/Contents/Frameworks"
	local helper_source="$SCRIPT_DIR/build/cef/zmux-cef-helper"
	local helper_version="${MARKETING_VERSION:-1}"
	mkdir -p "$frameworks_dir"
	rsync -a --delete "$CEF_ROOT/Release/Chromium Embedded Framework.framework" "$frameworks_dir/"
	local helper_names=(
		"zmux Helper"
		"zmux Helper (Alerts)"
		"zmux Helper (GPU)"
		"zmux Helper (Plugin)"
		"zmux Helper (Renderer)"
	)
	local helper_name
	for helper_name in "${helper_names[@]}"; do
		local helper_app="$frameworks_dir/$helper_name.app"
		local helper_macos="$helper_app/Contents/MacOS"
		mkdir -p "$helper_macos"
		cp "$helper_source" "$helper_macos/$helper_name"
		chmod +x "$helper_macos/$helper_name"
		cat >"$helper_app/Contents/Info.plist" <<EOF_HELPER
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleExecutable</key>
	<string>$helper_name</string>
	<key>CFBundleIdentifier</key>
	<string>$ZMUX_BUNDLE_ID.$(printf '%s' "$helper_name" | tr ' ()' '---')</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$helper_name</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
		<key>CFBundleShortVersionString</key>
	<string>$helper_version</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>LSBackgroundOnly</key>
	<true/>
</dict>
</plist>
EOF_HELPER
	done
}

copy_cef_runtime "$APP_PATH"

"$SCRIPT_DIR/codesign-zmux-host.sh" "$APP_PATH"

cat <<EOF

Built $ZMUX_APP_NAME.

Launch it from Xcode or with:
  open "$APP_PATH"
EOF
