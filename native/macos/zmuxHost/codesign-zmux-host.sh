#!/usr/bin/env bash
set -euo pipefail

APP_PATH="${1:-}"
CODE_SIGN_IDENTITY="${ZMUX_CODE_SIGN_IDENTITY:-}"
# CDXC:Distribution 2026-04-27-08:37: Notarized Homebrew releases need Apple
# Developer ID signatures with a secure timestamp. Dev builds keep the older
# no-timestamp default unless the release command opts into --timestamp.
CODE_SIGN_TIMESTAMP_FLAG="${ZMUX_CODE_SIGN_TIMESTAMP_FLAG:---timestamp=none}"

if [[ -z "$APP_PATH" ]]; then
	echo "Usage: $0 /path/to/zmux.app" >&2
	exit 2
fi

if [[ ! -d "$APP_PATH" ]]; then
	echo "App bundle does not exist: $APP_PATH" >&2
	exit 1
fi

if [[ -z "$CODE_SIGN_IDENTITY" ]]; then
	# CDXC:NativeHost 2026-04-27-05:50: Dev builds must keep a stable Apple
	# code-signing requirement so macOS Accessibility permissions survive each
	# `bun start` rebuild. Auto-select the local Developer ID certificate instead
	# of committing a maintainer-specific identity into the public project file.
	CODE_SIGN_IDENTITY="$(
		security find-identity -v -p codesigning 2>/dev/null |
			awk -F '"' '/Developer ID Application:/ { print $2; exit }'
	)"
fi

if [[ -z "$CODE_SIGN_IDENTITY" ]]; then
	cat >&2 <<'EOF'
No Developer ID Application signing identity was found.

Install an Apple Developer ID Application certificate, or run with:
  ZMUX_CODE_SIGN_IDENTITY="Developer ID Application: Name (TEAMID)" bun start
EOF
	exit 1
fi

echo "Signing $APP_PATH"
echo "Identity: $CODE_SIGN_IDENTITY"

FRAMEWORKS_PATH="$APP_PATH/Contents/Frameworks"
CEF_ENTITLEMENTS="$(mktemp -t zmux-cef-entitlements.XXXXXX.plist)"
trap 'rm -f "$CEF_ENTITLEMENTS"' EXIT
cat >"$CEF_ENTITLEMENTS" <<'EOF_ENTITLEMENTS'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.security.cs.allow-jit</key>
	<true/>
	<key>com.apple.security.cs.allow-unsigned-executable-memory</key>
	<true/>
	<key>com.apple.security.cs.disable-library-validation</key>
	<true/>
</dict>
</plist>
EOF_ENTITLEMENTS

if [[ -d "$FRAMEWORKS_PATH/Chromium Embedded Framework.framework" ]]; then
	# CDXC:ChromiumBrowserPanes 2026-05-04-16:38
	# CEF bundles nested dylibs and helper apps. Sign those concrete code
	# objects before the outer app so Developer ID and notarization validation
	# see a stable Chromium runtime instead of relying only on --deep traversal.
	find "$FRAMEWORKS_PATH/Chromium Embedded Framework.framework/Libraries" \
		-name '*.dylib' \
		-type f \
		-print0 2>/dev/null |
		while IFS= read -r -d '' dylib_path; do
			codesign \
				--force \
				--options runtime \
				"$CODE_SIGN_TIMESTAMP_FLAG" \
				--sign "$CODE_SIGN_IDENTITY" \
				"$dylib_path"
		done
	codesign \
		--force \
		--options runtime \
		"$CODE_SIGN_TIMESTAMP_FLAG" \
		--sign "$CODE_SIGN_IDENTITY" \
		"$FRAMEWORKS_PATH/Chromium Embedded Framework.framework"
fi

if [[ -d "$FRAMEWORKS_PATH" ]]; then
	find "$FRAMEWORKS_PATH" \
		-maxdepth 1 \
		-name 'zmux Helper*.app' \
		-type d \
		-print0 |
		while IFS= read -r -d '' helper_app; do
			helper_name="$(basename "$helper_app" .app)"
			helper_executable="$helper_app/Contents/MacOS/$helper_name"
			if [[ -x "$helper_executable" ]]; then
				# CDXC:ChromiumBrowserPanes 2026-05-04-17:01
				# CEF renderer helpers run V8 JIT under the hardened runtime.
				# Sign helpers with Chromium-safe entitlements, matching the
				# Electrobun reference, so pages and DevTools do not fail with
				# V8 CodeRange reservation errors after Developer ID signing.
				codesign \
					--force \
					--options runtime \
					--entitlements "$CEF_ENTITLEMENTS" \
					"$CODE_SIGN_TIMESTAMP_FLAG" \
					--sign "$CODE_SIGN_IDENTITY" \
					"$helper_executable"
			fi
			codesign \
				--force \
				--options runtime \
				--entitlements "$CEF_ENTITLEMENTS" \
				"$CODE_SIGN_TIMESTAMP_FLAG" \
				--sign "$CODE_SIGN_IDENTITY" \
				"$helper_app"
		done
fi

codesign \
	--force \
	--deep \
	--options runtime \
	--entitlements "$CEF_ENTITLEMENTS" \
	"$CODE_SIGN_TIMESTAMP_FLAG" \
	--sign "$CODE_SIGN_IDENTITY" \
	"$APP_PATH"

codesign --verify --deep --strict --verbose=2 "$APP_PATH"
