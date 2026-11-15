// scripts/adopt.sh, run for real against a throwaway project, with stand-ins for `openspec init` and npm so
// that nothing is downloaded.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ADOPT = resolve('scripts/adopt.sh');
const git = (cwd, ...args) =>
  execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', ...args],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

// A folder of pretend commands: `openspec init` writes what it writes with no rules, and npm writes a lock.
function fakes() {
  const bin = mkdtempSync(join(tmpdir(), 'adopt-bin-'));
  writeFileSync(join(bin, 'openspec'), '#!/bin/sh\n[ "$1" = init ] || exit 0\nmkdir -p openspec/specs openspec/changes\nprintf "schema: spec-driven\\n" > openspec/config.yaml\n', { mode: 0o755 });
  writeFileSync(join(bin, 'npm'), '#!/bin/sh\necho "{}" > package-lock.json\n', { mode: 0o755 });
  return bin;
}

// Another project, committed, with a README and nothing of this workflow.
function project(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'adopt-'));
  git(dir, 'init', '--quiet', '--initial-branch=main');
  writeFileSync(join(dir, 'README.md'), '# Another project\n');
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  git(dir, 'add', '.');
  git(dir, 'commit', '--quiet', '-m', 'Start');
  return dir;
}

const BIN = fakes();
const adopt = (dir) => spawnSync('bash', [ADOPT, dir], {
  encoding: 'utf8', env: { ...process.env, PATH: `${BIN}:${process.env.PATH}` },
});
const read = (dir, path) => readFileSync(join(dir, path), 'utf8');

test('a project gets the scripts, checks, workflows, rules, pin, permissions and a starting build', () => {
  const dir = project();
  const r = adopt(dir);
  assert.equal(r.status, 0, r.stderr);
  for (const f of ['scripts/agent.sh', 'scripts/refinement.sh', 'scripts/refine-tools.txt', 'tools/specs.mjs',
    'tools/issue-summary.mjs', '.github/workflows/refine.yml', '.github/workflows/deliver.yml', 'build.sh',
    '.github/workflows/build.yml', '.github/actions/install-actionlint/action.yml', 'package-lock.json']) {
    assert.ok(existsSync(join(dir, f)), `${f} is added`);
  }
  assert.equal(read(dir, 'scripts/refinement.sh'), read(process.cwd(), 'scripts/refinement.sh'));
  assert.match(read(dir, 'openspec/config.yaml'), /^rules:/m);
  assert.equal(JSON.parse(read(dir, 'package.json')).devDependencies['@fission-ai/openspec'], '2.0.0');
  const settings = JSON.parse(read(dir, '.claude/settings.json')).permissions;
  assert.ok(settings.allow.includes('Bash(./scripts/refinement.sh *)'));
  assert.ok(settings.deny.includes('Bash(git push *)'));
  assert.match(read(dir, '.gitignore'), /^\.refine\/$/m);
  assert.match(r.stdout, /Nothing is committed/);
  assert.match(r.stdout, /the risk rule/);
});

test('a file the project already has is kept, and listed', () => {
  const dir = project({ 'tools/links.mjs': '// ours\n', 'build.sh': '#!/bin/sh\nmake\n' });
  const r = adopt(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(read(dir, 'tools/links.mjs'), '// ours\n');
  assert.equal(read(dir, 'build.sh'), '#!/bin/sh\nmake\n');
  assert.match(r.stdout, /Kept as they were, because the project already had them: .*tools\/links\.mjs.*build\.sh/);
});

test('the project\'s own permissions stay, and ours are added once', () => {
  const dir = project({ '.claude/settings.json': JSON.stringify({ permissions: { allow: ['Bash(make)'] }, model: 'x' }) });
  assert.equal(adopt(dir).status, 0);
  const settings = JSON.parse(read(dir, '.claude/settings.json'));
  assert.equal(settings.model, 'x');
  assert.equal(settings.permissions.allow[0], 'Bash(make)');
  assert.equal(settings.permissions.allow.filter((r) => r === 'Bash(./build.sh)').length, 1);
});

test('adopting again changes nothing', () => {
  const dir = project();
  assert.equal(adopt(dir).status, 0);
  git(dir, 'add', '.');
  git(dir, 'commit', '--quiet', '-m', 'Adopt');
  const again = adopt(dir);
  assert.equal(again.status, 0, again.stderr);
  assert.equal(git(dir, 'status', '--porcelain'), '');
  assert.doesNotMatch(again.stdout, /^ {2}added/m);
});

test('a project with uncommitted changes is refused, so git diff shows only what adopting adds', () => {
  const dir = project();
  writeFileSync(join(dir, 'notes.txt'), 'half-finished');
  const r = adopt(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Commit or stash/);
});
