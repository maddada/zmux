#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { releaseProvenanceAssetName, validateReleaseProvenance } from './release-gpui/provenance.mjs';

const [version] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/u.test(version ?? '')) {
  throw new Error(`Version must be MAJOR.MINOR.PATCH, got ${version ?? 'nothing'}`);
}

function run(command, args, options = {}) {
  const output = execFileSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: { ...process.env, HOMEBREW_NO_AUTO_UPDATE: '1', HOMEBREW_NO_INSTALL_FROM_API: '1' },
    stdio: options.capture === false ? 'inherit' : 'pipe',
  });
  return typeof output === 'string' ? output.trim() : '';
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

const release = JSON.parse(
  run('gh', ['release', 'view', `v${version}`, '--repo', 'maddada/Ghostex', '--json', 'isDraft,assets,url'])
);
if (release.isDraft) throw new Error(`v${version} is still a draft`);
const dmgName = `ghostex-${version}-arm64.dmg`;
const dmg = release.assets.find((asset) => asset.name === dmgName);
const dmgSha =
  typeof dmg?.digest === 'string' && dmg.digest.startsWith('sha256:') ? dmg.digest.slice('sha256:'.length) : '';
if (!/^[0-9a-f]{64}$/u.test(dmgSha)) {
  throw new Error(`${release.url} has no SHA256 digest for ${dmgName}`);
}

/*
 * CDXC:Release 2026-08-13:
 * The cask may only advance when macOS is actually part of this release. It does
 * not matter whether the DMG was rebuilt or reused: macOS is version-stamped, so
 * a reused DMG can only come from a same-version recovery whose cask update never
 * happened. What matters is that these exact bytes are the ones the release
 * recorded, so the published sha256 is cross-checked against the provenance
 * record rather than against GitHub's metadata alone.
 */
function releaseProvenanceFor(releaseVersion) {
  const assetName = releaseProvenanceAssetName(releaseVersion);
  const scratch = mkdtempSync(path.join(os.tmpdir(), `ghostex-${releaseVersion}-provenance-`));
  const result = spawnSync(
    'gh',
    [
      'release',
      'download',
      `v${releaseVersion}`,
      '--repo',
      'maddada/Ghostex',
      '--pattern',
      assetName,
      '--dir',
      scratch,
    ],
    { encoding: 'utf8' }
  );
  const file = path.join(scratch, assetName);
  if (result.status !== 0 || !existsSync(file)) return null;
  return validateReleaseProvenance(JSON.parse(readFileSync(file, 'utf8')));
}

const provenance = releaseProvenanceFor(version);
if (!provenance) {
  console.log(
    `v${version} carries no ${releaseProvenanceAssetName(version)} (released before change-aware planning); ` +
      'updating the cask from the live DMG digest only.'
  );
} else {
  const macos = provenance.products['macos-arm64'];
  if (!macos) {
    throw new Error(
      `Refusing to update Homebrew: v${version} published no macOS product, so the cask must not advance`
    );
  }
  const recorded = macos.artifacts.find((artifact) => artifact.name === dmgName);
  if (!recorded) throw new Error(`Refusing to update Homebrew: v${version} provenance records no ${dmgName}`);
  if (recorded.sha256 !== dmgSha) {
    throw new Error(
      `Refusing to update Homebrew: live ${dmgName} digest ${dmgSha} does not match the recorded ${recorded.sha256}`
    );
  }
  console.log(
    `macOS was ${macos.action} for ${version} (${
      macos.action === 'built' ? 'this release' : `from ${macos.reusedFrom.tag ?? `run ${macos.reusedFrom.runId}`}`
    }); cask update authorized.`
  );
}

/*
 * CDXC:HomebrewRelease 2026-09-07 WHY:
 * Homebrew 6.0.22 added the Cask/InstallSteps cop, which demands the declarative
 * preflight_steps/postflight_steps stanzas. Those are a step-plan DSL, not a rename:
 * this cask runs real Ruby to scan PATH and write the gx wrappers, and the stanzas do
 * not exist on the older Homebrew versions users still have installed. Migrating is a
 * deliberate rewrite of a public install path, not something a release may do silently,
 * and Homebrew rejects both a tap .rubocop.yml and an inline disable directive.
 * Tolerate that one cop here and keep failing on every other style offense.
 */
const TOLERATED_STYLE_COPS = ['Cask/InstallSteps'];

function brewStyle(args) {
  const result = spawnSync('brew', ['style', ...args], {
    cwd: tapCheckout,
    encoding: 'utf8',
    env: { ...process.env, HOMEBREW_NO_AUTO_UPDATE: '1', HOMEBREW_NO_INSTALL_FROM_API: '1' },
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (result.status === 0) return;
  const offenses = output.split('\n').filter((line) => /^\S+:\d+:\d+: [A-Z]: /u.test(line));
  const unexpected = offenses.filter((line) => !TOLERATED_STYLE_COPS.some((cop) => line.includes(`: ${cop}:`)));
  if (offenses.length === 0 || unexpected.length > 0) {
    process.stderr.write(output);
    throw new Error(`brew style ${args.join(' ')} failed`);
  }
  console.warn(
    `brew style: tolerating ${offenses.length} ${TOLERATED_STYLE_COPS.join(', ')} offence(s); the cask is unchanged.`
  );
}

const tapCheckout = mkdtempSync(path.join(os.tmpdir(), `ghostex-${version}-homebrew-tap-`));
run('git', ['clone', '--depth', '1', 'https://github.com/maddada/homebrew-tap.git', tapCheckout], {
  capture: false,
});
const caskPath = path.join(tapCheckout, 'Casks/ghostex.rb');
const current = readFileSync(caskPath, 'utf8');
const updated = current
  .replace(/^\s*version "[^"]+"/mu, `  version "${version}"`)
  .replace(/^\s*sha256 "[0-9a-f]+"/mu, `  sha256 "${dmgSha}"`);
if (!updated.includes(`version "${version}"`) || !updated.includes(`sha256 "${dmgSha}"`)) {
  throw new Error('Could not update the canonical Ghostex cask version and SHA256');
}
if (updated !== current) writeFileSync(caskPath, updated);

run('ruby', ['-c', 'Casks/ghostex.rb'], { cwd: tapCheckout, capture: false });
brewStyle(['--fix', 'Casks/ghostex.rb']);
brewStyle(['Casks/ghostex.rb']);
run('git', ['diff', '--check'], { cwd: tapCheckout, capture: false });
const tapStatus = run('git', ['status', '--porcelain'], { cwd: tapCheckout });
if (tapStatus) {
  run('git', ['add', 'Casks/ghostex.rb'], { cwd: tapCheckout, capture: false });
  run('git', ['commit', '-m', `chore: update Ghostex cask to ${version}`], {
    cwd: tapCheckout,
    capture: false,
  });
  run('git', ['push', 'origin', 'main'], { cwd: tapCheckout, capture: false });
}

run('brew', ['tap', 'maddada/tap'], { capture: false });
const installedTap = run('brew', ['--repo', 'maddada/tap']);
run('git', ['fetch', 'origin', 'main'], { cwd: installedTap, capture: false });
run('git', ['merge', '--ff-only', 'origin/main'], { cwd: installedTap, capture: false });
run('brew', ['info', '--cask', 'maddada/tap/ghostex'], { capture: false });
let cachePath = run('brew', ['--cache', '--cask', 'maddada/tap/ghostex']);
if (!existsSync(cachePath) || sha256(cachePath) !== dmgSha) {
  run('brew', ['fetch', '--force', '--cask', '--arch=arm', 'maddada/tap/ghostex'], {
    capture: false,
  });
  cachePath = run('brew', ['--cache', '--cask', 'maddada/tap/ghostex']);
}
if (!existsSync(cachePath) || sha256(cachePath) !== dmgSha) {
  throw new Error(`Homebrew cache does not contain the verified ${dmgName}`);
}

console.log(`Homebrew cask ${version} is live with SHA256 ${dmgSha}.`);
console.log(`DMG_PATH=${cachePath}`);
