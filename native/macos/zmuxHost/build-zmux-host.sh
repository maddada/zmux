#!/usr/bin/env bash
set -euo pipefail

: "${GHOSTTY_ROOT:?Set GHOSTTY_ROOT to your local Ghostty checkout before building zmuxHost.}"
GHOSTTY_KIT="$GHOSTTY_ROOT/macos/GhosttyKit.xcframework"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_PATH="$SCRIPT_DIR/zmux.xcodeproj"
CONFIGURATION="${CONFIGURATION:-Debug}"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
WEB_DIR="$SCRIPT_DIR/Web"

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
bun build "$REPO_ROOT/native/sidebar/native-sidebar.tsx" \
  --target browser \
  --asset-naming "[name].[ext]" \
  --outdir "$WEB_DIR"
bun build "$REPO_ROOT/native/sidebar/modal-host.tsx" \
  --target browser \
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
xcodegen generate --spec "$SCRIPT_DIR/project.yml"
xcodebuild \
  -project "$PROJECT_PATH" \
  -scheme zmux \
  -configuration "$CONFIGURATION" \
  build

cat <<EOF

Built zmux.

Launch it from Xcode or with:
  open "$(xcodebuild -project "$PROJECT_PATH" -scheme zmux -configuration "$CONFIGURATION" -showBuildSettings 2>/dev/null | awk -F' = ' '/BUILT_PRODUCTS_DIR/ { print $2; exit }')/zmux.app"
EOF
