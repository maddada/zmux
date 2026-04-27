#!/usr/bin/env bash
set -euo pipefail

APP_PATH="${1:-}"
CODE_SIGN_IDENTITY="${ZMUX_CODE_SIGN_IDENTITY:-}"

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
    security find-identity -v -p codesigning 2>/dev/null \
      | awk -F '"' '/Developer ID Application:/ { print $2; exit }'
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

codesign \
  --force \
  --deep \
  --options runtime \
  --timestamp=none \
  --sign "$CODE_SIGN_IDENTITY" \
  "$APP_PATH"

codesign --verify --deep --strict --verbose=2 "$APP_PATH"
