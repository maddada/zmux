# Publishing VSmux To Both Stores

This file documents the exact release workflow for publishing VSmux to:

- Visual Studio Marketplace
- Open VSX

It is written for this repo as it exists today.

## Current Release Metadata

- Extension ID: `maddada.VSmux`
- Name: `VSmux`
- Display name: `VSmux - T3code & Agent CLIs Manager`
- Publisher / namespace: `maddada`
- Current minimum editor compatibility: `engines.vscode: ^1.80.0`

## Repo Commands

The repo already has the release helpers we should use.

- Build/package a `.vsix`:

```bash
pnpm run vsix:package
```

- Publish to Visual Studio Marketplace and push the Git tag:

```bash
pnpm run vsix:publish
```

- Compile only:

```bash
pnpm run compile
```

## What The Scripts Actually Do

### `scripts/vsix.mjs`

`pnpm run vsix:package` does this:

1. Runs `pnpm run compile`
2. Runs `vp exec vsce package`
3. Writes the artifact to `installer/<name>-<version>.vsix`

For this repo, `compile` currently runs:

```bash
vp run sidebar:build
vp run debug-panel:build
vp run workspace:build
tsc -p ./tsconfig.extension.json
node ./scripts/vendor-runtime-deps.mjs
```

### `scripts/publish-extension.mjs`

`pnpm run vsix:publish` does this:

1. Verifies the Git worktree is clean
2. Verifies the release tag does not already exist
3. Verifies we are on a branch, not detached HEAD
4. Runs:

```bash
vp exec vsce publish --no-dependencies --skip-license --allow-unused-files-pattern
```

5. Creates `v<version>`
6. Pushes the current branch and the tag to `origin`

Important: this script only publishes to Visual Studio Marketplace. Open VSX must still be published separately.

## Required Credentials

### Visual Studio Marketplace

Use `vsce`.

You need a Marketplace PAT with:

- `Publish`
- `Manage`

Working options:

- `vsce login maddada`
- `VSCE_PAT=... pnpm run vsix:publish`
- `VSCE_PAT=... vp exec vsce publish --packagePath <file>`

Common login command:

```bash
vp exec vsce login maddada
```

### Open VSX

Use `ovsx`.

You need:

- an Open VSX account
- the `maddada` namespace
- an Open VSX access token

Typical publish command:

```bash
npx ovsx publish installer/VSmux-<version>.vsix -p "$OVSX_PAT"
```

Do not print tokens into logs, docs, commits, or shell history on purpose.

## Standard Release Workflow

This is the default path when releasing a new version.

### 1. Prepare The Release

Update these files first:

- `package.json`
- `CHANGELOG.md`
- `README.md` if the latest-release summary changed

The changelog should stay user-facing. Avoid internal-only refactor noise unless it affects behavior.

### 2. Check Repo State

See what is currently changed:

```bash
git status --short
```

See commits since the last release tag:

```bash
git describe --tags --abbrev=0
git log --oneline --reverse <last-tag>..HEAD
```

### 3. Build And Package

Run:

```bash
pnpm run vsix:package
```

Expected output:

- compiled extension
- packaged `.vsix` in `installer/`

### 4. Commit The Release

If the release includes source and metadata changes, commit them before publishing.

Typical pattern:

```bash
git add package.json CHANGELOG.md README.md installer/VSmux-<version>.vsix
git commit -m "feat: release <version>"
```

### 5. Publish To Visual Studio Marketplace

Preferred path:

```bash
pnpm run vsix:publish
```

If you want to publish a specific existing artifact instead:

```bash
VSCE_PAT=... vp exec vsce publish --packagePath installer/VSmux-<version>.vsix
```

### 6. Publish The Same Artifact To Open VSX

Use the packaged `.vsix`:

```bash
npx ovsx publish installer/VSmux-<version>.vsix -p "$OVSX_PAT"
```

### 7. Verify Both Stores

Marketplace:

```bash
vp exec vsce show maddada.VSmux
```

Open VSX:

```bash
curl -Ls 'https://open-vsx.org/api/maddada/VSmux'
```

Also check the public listing pages:

- `https://marketplace.visualstudio.com/items?itemName=maddada.VSmux`
- `https://open-vsx.org/extension/maddada/VSmux`

## Publishing When The Working Tree Is Dirty

If there are uncommitted local changes that should not ship, do not publish from the main working tree.

Use a temporary worktree at the exact commit or tag you want to release:

```bash
git worktree add /tmp/vsmux-release-<version> v<version>
cd /tmp/vsmux-release-<version>
pnpm install --frozen-lockfile
pnpm run vsix:package
```

Then publish that exact `.vsix`:

```bash
VSCE_PAT=... vp exec vsce publish --packagePath installer/VSmux-<version>-<timestamp>.vsix
npx ovsx publish installer/VSmux-<version>-<timestamp>.vsix -p "$OVSX_PAT"
```

Afterward:

```bash
git worktree remove /tmp/vsmux-release-<version> --force
```

Use this path when:

- the release commit/tag already exists
- local work is in progress and must not be included
- store publishing must happen after the Git tag already landed

## Browser-Assisted Token Flow

CLI-first is the default.

If token creation or a manual store action is needed, use the authenticated browser as a fallback. In this environment the practical options have been:

- `dev-browser --connect`
- Chrome DevTools MCP tools when healthy

Use the browser only for the browser-only part:

- creating a PAT
- confirming existing login state
- generating an Open VSX token
- manual upload if the CLI path is blocked

Then return to CLI publishing immediately.

## Known Good Commands

### Marketplace PAT Login

```bash
vp exec vsce login maddada
```

### Marketplace Direct Publish With Artifact

```bash
read -s VSCE_PAT
export VSCE_PAT
vp exec vsce publish --packagePath installer/VSmux-<version>.vsix
```

### Open VSX Direct Publish With Artifact

```bash
read -s OVSX_PAT
export OVSX_PAT
npx ovsx publish installer/VSmux-<version>.vsix -p "$OVSX_PAT"
```

## Common Problems

### `TF400813`

Meaning:

- Marketplace PAT is invalid, expired, or belongs to the wrong publisher context

Fix:

- create a new PAT
- re-run `vsce login maddada`
- or publish with a fresh `VSCE_PAT`

### `already exists`

Marketplace:

```text
maddada.VSmux vX.Y.Z already exists
```

Open VSX:

```text
Extension maddada.VSmux X.Y.Z is already published
```

Meaning:

- that version is already accepted by the backend

Fix:

- do not try to republish the same version
- verify the public listing and wait for propagation if the UI is stale

### Public Listing Still Shows An Older Version

This has happened repeatedly on both stores.

Meaning:

- the publish command succeeded
- the public listing, API, or cache has not caught up yet

Fix:

- verify with the store CLI or API
- wait for propagation
- do not bump again just because the page is stale

### `Refusing to publish with uncommitted changes`

This comes from `scripts/publish-extension.mjs`.

Fix:

- commit the release changes
- or publish from a temporary worktree if the main tree is intentionally dirty

### Missing Dependencies In A Temporary Worktree

Symptom:

- Vite config import errors like `Cannot find module '@vitejs/plugin-react'`

Fix:

```bash
pnpm install --frozen-lockfile
```

inside the temporary worktree before packaging.

## Release Checklist

- version bumped in `package.json`
- changelog updated
- README latest-release section updated if needed
- package builds successfully
- `.vsix` created in `installer/`
- release committed
- Marketplace published
- Open VSX published
- Git tag exists and is pushed
- both public listings verified

## Current Reality Notes

- Marketplace often propagates slower than the publish command result
- Open VSX API can lag after a successful publish
- this repo currently relies on `vp exec vsce ...` for Marketplace commands
- this repo currently publishes Open VSX by calling `npx ovsx publish ...` manually
- `pnpm run vsix:publish` does not publish Open VSX by itself

## Recommendation

For normal releases:

1. update metadata
2. package with `pnpm run vsix:package`
3. commit release changes
4. run `pnpm run vsix:publish`
5. publish the same `.vsix` to Open VSX
6. verify both stores

For delayed store publishing after a tag already exists:

1. create a temporary worktree at the tagged commit
2. install deps there
3. package there
4. publish the exact `.vsix` directly to both stores
