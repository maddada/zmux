---
name: zmux-release-to-brew
description: >-
  Use this skill whenever the user asks to release zmux, publish zmux to
  Homebrew, bump a zmux version, create split commits before a release, update
  CHANGELOG/README from recent commits, create a GitHub release, or update
  maddada/homebrew-tap for zmux. This skill captures the full local workflow:
  split file-based commits, push main, update docs, build/sign/notarize the
  macOS app, publish the GitHub release, update the Homebrew cask, and validate
  brew.
---

# zmux Release To Brew

This skill automates the release workflow used for zmux in `/Users/madda/dev/_active/zmux`.
Use it for requests like:

- "commit my changes in multiple commits and publish v1.2.0 to brew"
- "do the same release workflow again"
- "publish the next minor version"
- "update changelog/readme and release zmux"

## Project Defaults

- Repo path: `/Users/madda/dev/_active/zmux`
- GitHub repo: `maddada/zmux`
- Homebrew tap: `maddada/homebrew-tap`
- Cask name: `zmux`
- App bundle: `zmux.app`
- Bundle ID: `com.madda.zmux.host`
- Signing identity: `Developer ID Application: Mohamad Youssef (KTKP595G3B)`
- Notary profile: `notarytool-profile`
- Team ID: `KTKP595G3B`
- DMG asset name: `zmux-<version>.dmg`
- Install command: `brew install --cask maddada/tap/zmux`

## Required Repo Rules

Before making changes, read and follow:

```bash
sed -n '1,220p' ~/.agents/main.md
```

Also follow the repo `AGENTS.md` instructions. Important local rules:

- Do not run install commands such as `pnpm run install`.
- Do not use broad destructive git/file commands.
- Preserve unrelated user work.
- Add or update `CDXC:<Area> yyyy-MM-dd-hh:mm` comments for important user-facing behavior or release metadata changes.
- Exclude `node_modules` from searches.
- If the user already instructed pushing, do not ask again before pushing.

## Workflow

### 1. Inspect Worktree

Run:

```bash
git status --short --branch --untracked-files=all
git diff --name-only
git diff --stat
git log --oneline --decorate -12
```

If there are dirty files, assume they are user-authored unless they are obvious local artifacts.
Do not clean, restore, reset, or delete anything.

### 2. Split Current Changes Into File-Based Commits

Group files by related topic, not by hunk.

Good commit groups for this repo:

- `feat(settings): ...` for shared settings, settings modal, settings tests, common UI controls.
- `feat(native): ...` for AppKit/native host bridge behavior, native sidebar bridge behavior, native sound, diagnostics, Zed/browser overlay changes.
- `fix(native): ...` for terminal layout, process cleanup, search, focus, or Ghostty integration fixes.
- `feat(session): ...` for persisted session metadata, previous sessions, first messages, title generation, or resume behavior.
- `docs: ...` for README/CHANGELOG updates.
- `chore: bump version to <version>` for release metadata only.

Use whole-file staging:

```bash
git add <files for one topic>
git diff --cached --name-only
git commit -m "<type(scope): summary>"
```

If a central file contains multiple related native/sidebar concerns, keep it whole and use a broader but honest commit message. Do not hunk-stage unless the user explicitly asks.

### 3. Verify Before Push

Run:

```bash
bun run typecheck
bun run test
```

Known state: `bun run test` may fail because many tests import `vite-plus/test`, which may not be installed in this workspace. Do not install dependencies. Continue if typecheck passes and the test failure is only the known missing `vite-plus/test`/mock API setup.

### 4. Push Feature Commits

If the user requested push/release, push:

```bash
git push origin main
```

### 5. Update CHANGELOG.md and README.md

After pushing feature commits, generate the release summary from the actual commits since the previous tag:

```bash
git log <previous-tag>..HEAD --oneline --no-merges
```

Update:

- `CHANGELOG.md`: add a new top section for `<version> - <yyyy-MM-dd>`.
- `README.md`: add concise feature bullets under the main feature list.

Include a CDXC release note comment in `CHANGELOG.md`, for example:

```md
<!-- CDXC:Distribution 2026-04-29-09:31: Release notes for 1.2.0 must include
all user-facing commits after v1.1.0 so README, GitHub, and Homebrew release
metadata describe the same shipped behavior. -->
```

Commit and push docs:

```bash
git add CHANGELOG.md README.md
git commit -m "docs: document <version> changes"
git push origin main
```

### 6. Bump Version

Update:

- `package.json` `version`
- `native/macos/zmuxHost/project.yml` `MARKETING_VERSION`
- The adjacent `CDXC:Distribution` comment in `project.yml`

Example:

```yaml
# CDXC:Distribution 2026-04-29-09:31: Homebrew cask release v1.2.0 must
# publish a notarized Developer ID app whose bundle metadata matches the
# GitHub release and brew artifact version.
MARKETING_VERSION: "1.2.0"
```

Do not commit the version bump yet. Build first and verify the app reports the new version.

### 7. Preflight Release Credentials

Run:

```bash
gh auth status
security find-identity -v -p codesigning
xcrun notarytool history --keychain-profile notarytool-profile | head -n 8
```

Fail fast if GitHub auth, Developer ID signing identity, or notary profile is unavailable.

### 8. Build Signed Release App

Run:

```bash
bun run typecheck
env CONFIGURATION=Release ZMUX_CODE_SIGN_TIMESTAMP_FLAG=--timestamp native/macos/zmuxHost/build-zmux-host.sh
```

Verify:

```bash
plutil -p build/Build/Products/Release/zmux.app/Contents/Info.plist | rg "CFBundleIdentifier|CFBundleShortVersionString|ZMUX"
codesign -dv --verbose=4 build/Build/Products/Release/zmux.app 2>&1 | rg "Authority|TeamIdentifier|Identifier|Timestamp|Runtime|Format"
codesign --verify --deep --strict --verbose=2 build/Build/Products/Release/zmux.app
```

Expected:

- Bundle ID: `com.madda.zmux.host`
- Version: requested release version
- Authority includes `Developer ID Application: Mohamad Youssef (KTKP595G3B)`
- TeamIdentifier: `KTKP595G3B`

### 9. Create, Notarize, Staple, and Validate DMG

Create artifacts in a temp directory, not `release/`:

```bash
VERSION=<version>
FINAL_DIR="$(mktemp -d)"
STAGING_DIR="$(mktemp -d)"
FINAL_DMG="$FINAL_DIR/zmux-$VERSION.dmg"
printf '%s\n' "$FINAL_DMG" > "/tmp/zmux-${VERSION//./}-final-dmg"
cp -R "$PWD/build/Build/Products/Release/zmux.app" "$STAGING_DIR/zmux.app"
ln -s /Applications "$STAGING_DIR/Applications"
hdiutil create -volname "zmux" -srcfolder "$STAGING_DIR" -format UDZO "$FINAL_DMG"
shasum -a 256 "$FINAL_DMG"
xcrun notarytool submit "$FINAL_DMG" --keychain-profile notarytool-profile --wait
```

Record the notary submission ID and status.

Staple and validate:

```bash
xcrun stapler staple "$FINAL_DMG"
xcrun stapler validate "$FINAL_DMG"
shasum -a 256 "$FINAL_DMG"
ATTACH_OUTPUT="$(hdiutil attach -nobrowse -readonly "$FINAL_DMG")"
printf '%s\n' "$ATTACH_OUTPUT"
MOUNT_POINT="$(printf '%s\n' "$ATTACH_OUTPUT" | awk 'END {print $3}')"
spctl --assess --type execute --verbose "$MOUNT_POINT/zmux.app"
codesign --verify --deep --strict --verbose=2 "$MOUNT_POINT/zmux.app"
plutil -p "$MOUNT_POINT/zmux.app/Contents/Info.plist" | rg "CFBundleShortVersionString|CFBundleIdentifier"
hdiutil detach "$MOUNT_POINT"
```

Use the post-staple SHA256 for GitHub release notes and Homebrew.

### 10. Commit Version Bump, Tag, and Push

Only commit source/config version files, not artifacts:

```bash
git add package.json native/macos/zmuxHost/project.yml
git commit -m "chore: bump version to <version>"
git push origin main
git tag v<version>
git push origin v<version>
```

If `native/macos/zmuxHost/AppInfo.plist` changed because of generation, inspect it and include it only if it is an intended source/config change.

### 11. Create GitHub Release

Use the final stapled DMG and post-staple SHA:

```bash
FINAL_DMG="$(cat /tmp/zmux-<version-without-dots>-final-dmg)"
gh release create v<version> "$FINAL_DMG" \
  --repo maddada/zmux \
  --title "zmux <version>" \
  --notes "<release notes with SHA256 and brew install command>"
```

Notes should include:

- Changes since previous tag
- `SHA256: <post-staple-sha>`
- Install command:

```bash
brew install --cask maddada/tap/zmux
```

### 12. Update Homebrew Tap

Clone a fresh temp tap:

```bash
TAP_DIR="$(mktemp -d)"
git clone https://github.com/maddada/homebrew-tap.git "$TAP_DIR"
```

Update `Casks/zmux.rb`:

```ruby
version "<version>"
sha256 "<post-staple-sha>"
```

Validate and push:

```bash
cd "$TAP_DIR"
ruby -c Casks/zmux.rb
brew style Casks/zmux.rb
git diff -- Casks/zmux.rb
git add Casks/zmux.rb
git commit -m "Update zmux cask to <version>"
git push origin main
git rev-parse HEAD
```

Record the tap commit SHA.

### 13. Final Brew Validation

Run:

```bash
brew update --force
brew info --cask maddada/tap/zmux
brew fetch --cask maddada/tap/zmux
```

Expected: `brew info` shows the new version and `brew fetch` succeeds.

### 14. Final Report

Report concisely:

- App repo commit hashes and subjects
- Release URL
- DMG SHA256
- Notary submission ID and status
- Homebrew tap commit SHA
- Validation results
- Any known test limitation, especially `vite-plus/test`
- Exact install command
- Worktree status

If `~/.agents/main.md` requires a final `Summary:` line, obey it.
