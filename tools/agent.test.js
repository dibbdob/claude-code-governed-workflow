// scripts/agent.sh, the headless delivery on this machine (ADR 0008), run for real against a throwaway
// repository on disk, with tools/testing/claude standing in for a model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const AGENT = resolve('scripts/agent.sh');
const FAKE_CLAUDE = resolve('tools/testing');
const git = (cwd, ...args) =>
  execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', ...args],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

// A repository whose main holds one approved change, 42-holidays, and a build that passes.
function repository() {
  const dir = mkdtempSync(join(tmpdir(), 'agent-'));
  git(dir, 'init', '--quiet', '--initial-branch=main');
  mkdirSync(join(dir, 'openspec/changes/42-holidays'), { recursive: true });
  writeFileSync(join(dir, 'openspec/changes/42-holidays/proposal.md'), '# Proposal\n');
  writeFileSync(join(dir, 'build.sh'), '#!/bin/sh\necho "== build passed"\n', { mode: 0o755 });
  writeFileSync(join(dir, '.gitignore'), '.delivery/\n');
  git(dir, 'add', '.');
  git(dir, 'commit', '--quiet', '-m', 'Specifications');
  return dir;
}

const agent = (dir, wanted = '42', env = {}) => spawnSync('bash', [AGENT, wanted], {
  cwd: dir,
  encoding: 'utf8',
  env: { ...process.env, PATH: `${FAKE_CLAUDE}:${process.env.PATH}`, RUNS_DIR: `${dir}-runs`, ...env },
});

test('a headless run delivers on its own branch, archived, and the build passes', () => {
  const dir = repository();
  const r = agent(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(dir, 'branch', '--show-current').trim(), 'deliver/42-holidays');
  assert.match(git(dir, 'log', '--oneline'), /Archive 42-holidays/);
  assert.match(r.stdout, /== build passed/);
});

test('a run that says it succeeded is not believed until the change is archived', () => {
  const r = agent(repository(), '42', { FAKE_CLAUDE_SKIP_ARCHIVE: '1' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not archived/);
});

test('a run refuses a change that is not approved onto main', () => {
  const r = agent(repository(), '44');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not an approved change/);
});

test('a run refuses to start over uncommitted changes', () => {
  const dir = repository();
  writeFileSync(join(dir, 'notes.txt'), 'half-finished');
  const r = agent(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Commit or stash/);
});

test('a run that fails before delivering anything leaves nothing behind, so it can simply be run again', () => {
  // An expired login, say: what a failed run left behind must not stop the next one.
  const dir = repository();
  const failed = agent(dir, '42', { FAKE_CLAUDE_FAIL: '1' });
  assert.equal(failed.status, 1);
  assert.equal(git(dir, 'branch', '--show-current').trim(), 'main');
  assert.equal(git(dir, 'branch', '--list', 'deliver/42-holidays').trim(), '', `the empty branch is removed: ${failed.stderr}`);
  assert.equal(agent(dir).status, 0);
});

test('a run that fails after committing keeps its branch', () => {
  const dir = repository();
  const r = agent(dir, '42', { FAKE_CLAUDE_FAIL_AFTER_COMMIT: '1' });
  assert.equal(r.status, 1);
  assert.match(git(dir, 'log', '--oneline', 'deliver/42-holidays'), /Deliver it/);
});
