// scripts/approved-issues.sh, which the refined workflow uses to find the issues whose changes were just
// approved onto main, run against a real repository.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve('scripts/approved-issues.sh');

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'approved-'));
  const git = (...args) => execFileSync('git', ['-c', 'user.name=T', '-c', 'user.email=t@example.invalid', ...args], { cwd: dir, encoding: 'utf8' }).trim();
  const proposal = (change) => {
    mkdirSync(join(dir, 'openspec/changes', change), { recursive: true });
    writeFileSync(join(dir, 'openspec/changes', change, 'proposal.md'), `# ${change}\n`);
  };
  git('init', '--quiet');
  return { dir, git, proposal, commit: (m) => { git('add', '-A'); git('commit', '--quiet', '-m', m); return git('rev-parse', 'HEAD'); } };
}
const approved = (r, before, after) => execFileSync('bash', [SCRIPT, before, after], { cwd: r.dir, encoding: 'utf8' }).split('\n').filter(Boolean);

test('a change added under its issue number is approved', () => {
  const r = repo();
  r.proposal('7-old');
  const before = r.commit('first');
  r.proposal('57-bank-holidays');
  assert.deepEqual(approved(r, before, r.commit('approve 57')), ['57']);
});

test('a change renamed to its issue number is approved', () => {
  const r = repo();
  r.proposal('public-holidays');
  const before = r.commit('first');
  r.git('mv', 'openspec/changes/public-holidays', 'openspec/changes/1-public-holidays');
  assert.deepEqual(approved(r, before, r.commit('name it after issue 1')), ['1']);
});

test("on a branch's first push, every change named after an issue is approved", () => {
  const r = repo();
  r.proposal('3-a');
  r.proposal('unnamed');
  assert.deepEqual(approved(r, '0'.repeat(40), r.commit('first push')), ['3']);
});

test('an archived change is not approved again', () => {
  const r = repo();
  r.proposal('9-done');
  const before = r.commit('first');
  mkdirSync(join(r.dir, 'openspec/changes/archive'), { recursive: true });
  r.git('mv', 'openspec/changes/9-done', 'openspec/changes/archive/2026-11-13-9-done');
  assert.deepEqual(approved(r, before, r.commit('archive 9')), []);
});
