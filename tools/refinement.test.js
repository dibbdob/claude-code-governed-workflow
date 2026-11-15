// scripts/refinement.sh, the git and GitHub half of /refine in a session (ADR 0010), run for real against a
// throwaway repository with a bare one as its remote, and tools/testing/gh standing in for GitHub.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve('scripts/refinement.sh');
const FAKES = resolve('tools/testing');
const git = (cwd, ...args) =>
  execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', ...args],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

// A checkout of a repository whose main has one approved change, 42-holidays, and a build that passes.
function repository() {
  const root = mkdtempSync(join(tmpdir(), 'refine-'));
  const origin = join(root, 'origin.git');
  const dir = join(root, 'work');
  git(root, 'init', '--quiet', '--bare', '--initial-branch=main', origin);
  git(root, 'clone', '--quiet', origin, dir);
  git(dir, 'switch', '--quiet', '-c', 'main');
  mkdirSync(join(dir, 'openspec/changes/42-holidays'), { recursive: true });
  writeFileSync(join(dir, 'openspec/changes/42-holidays/proposal.md'), '# Proposal\n');
  writeFileSync(join(dir, 'build.sh'), '#!/bin/sh\necho "== build passed"\n', { mode: 0o755 });
  writeFileSync(join(dir, '.gitignore'), '.refine/\n');
  git(dir, 'add', '.');
  git(dir, 'commit', '--quiet', '-m', 'Specifications');
  git(dir, 'push', '--quiet', '-u', 'origin', 'main');
  return { dir, origin, log: join(root, 'gh.log') };
}

const run = (repo, action, issue = '57', env = {}) => spawnSync('bash', [SCRIPT, action, issue], {
  cwd: repo.dir,
  encoding: 'utf8',
  env: {
    ...process.env, PATH: `${FAKES}:${process.env.PATH}`, FAKE_GH_LOG: repo.log,
    GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.invalid',
    GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.invalid', ...env,
  },
});
const ghCalls = (repo) => (existsSync(repo.log) ? readFileSync(repo.log, 'utf8') : '');

// What /refine leaves before it publishes: the change folder and the pull request's description.
function propose(repo, change = '57-bank-holidays', text = '# Proposal\n') {
  mkdirSync(join(repo.dir, 'openspec/changes', change), { recursive: true });
  writeFileSync(join(repo.dir, 'openspec/changes', change, 'proposal.md'), text);
  mkdirSync(join(repo.dir, '.refine'), { recursive: true });
  writeFileSync(join(repo.dir, '.refine/pull-request.md'), 'Refine #57: bank holidays are closed days\n\nRefines #57.\n');
}

test('a new refinement starts from main', () => {
  const repo = repository();
  const r = run(repo, 'start');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(repo.dir, 'branch', '--show-current').trim(), 'main');
  assert.match(r.stdout, /new refinement of issue #57/);
});

test('a refinement refuses to start over uncommitted work', () => {
  const repo = repository();
  writeFileSync(join(repo.dir, 'notes.txt'), 'half-finished');
  const r = run(repo, 'start');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Commit or stash/);
});

test('an issue whose change is already on main is not refined again', () => {
  const r = run(repository(), 'start', '42');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /already refined/);
});

test('publishing a new refinement commits only its change on its own branch, pushes it and opens the spec pull request', () => {
  const repo = repository();
  propose(repo);
  const r = run(repo, 'publish');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(repo.dir, 'branch', '--show-current').trim(), 'refine/57-bank-holidays');
  assert.match(git(repo.dir, 'log', '-1', '--format=%s').trim(), /^57-bank-holidays: Propose$/);
  // --git-dir names the bare remote outright: a runner with safe.bareRepository=explicit refuses to find one.
  assert.match(git(repo.dir, '--git-dir', repo.origin, 'branch', '--list', 'refine/57-bank-holidays'), /refine\/57-bank-holidays/);
  assert.match(r.stdout, /== build passed/);
  assert.match(ghCalls(repo), /^pr create --base main --head refine\/57-bank-holidays --title Refine #57: bank holidays are closed days/m);
  assert.match(ghCalls(repo), /^issue comment 57 --body Spec pull request for this issue: https:\/\/github\.example\.invalid\/pull\/7/m);
});

test('a refinement changes nothing but its change folder', () => {
  const repo = repository();
  propose(repo);
  writeFileSync(join(repo.dir, 'build.sh'), '#!/bin/sh\nexit 0\n');
  const r = run(repo, 'publish');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /changes only its change folder[\s\S]*build\.sh/);
  assert.equal(ghCalls(repo), '');
});

test('a new spec pull request needs its description', () => {
  const repo = repository();
  propose(repo);
  rmSync(join(repo.dir, '.refine'), { recursive: true });
  const r = run(repo, 'publish');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /description to \.refine\/pull-request\.md/);
  assert.equal(git(repo.dir, '--git-dir', repo.origin, 'branch', '--list', 'refine/*'), '', 'nothing was pushed');
  assert.equal(git(repo.dir, 'branch', '--show-current').trim(), 'main');
});

test('a refinement is not published over commits on main that the remote does not have', () => {
  const repo = repository();
  writeFileSync(join(repo.dir, 'notes.txt'), 'not a specification');
  git(repo.dir, 'add', 'notes.txt');
  git(repo.dir, 'commit', '--quiet', '-m', 'Unpushed work');
  propose(repo);
  const r = run(repo, 'publish');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /main has 1 commit\(s\) that origin\/main does not/);
  assert.equal(git(repo.dir, '--git-dir', repo.origin, 'branch', '--list', 'refine/*'), '', 'nothing was pushed');
  assert.equal(ghCalls(repo).includes('pr create'), false);
});

test('a later run picks up the published branch, and its revision updates the open pull request', () => {
  const repo = repository();
  propose(repo);
  assert.equal(run(repo, 'publish').status, 0);
  // Another day, another clone: only the remote knows the branch.
  git(repo.dir, 'switch', '--quiet', 'main');
  git(repo.dir, 'branch', '--quiet', '-D', 'refine/57-bank-holidays');
  const pr = 'https://github.example.invalid/pull/7';
  const started = run(repo, 'start', '57', { FAKE_GH_PR: pr });
  assert.equal(started.status, 0, started.stderr);
  assert.equal(git(repo.dir, 'branch', '--show-current').trim(), 'refine/57-bank-holidays');
  assert.match(started.stdout, /Revising .* Its spec pull request: https:\/\/github\.example\.invalid\/pull\/7/);

  propose(repo, '57-bank-holidays', '# Proposal\n\nWeekends too.\n');
  const r = run(repo, 'publish', '57', { FAKE_GH_PR: pr });
  assert.equal(r.status, 0, r.stderr);
  assert.match(git(repo.dir, 'log', '-1', '--format=%s').trim(), /^57-bank-holidays: Revise$/);
  assert.match(ghCalls(repo), /^pr comment https:\/\/github\.example\.invalid\/pull\/7 --body Revised: 57-bank-holidays: Revise\.$/m);
});

test('a refinement started on GitHub can be carried on in a session', () => {
  const repo = repository();
  // The refine workflow's branch, named by the Claude Code action.
  git(repo.dir, 'switch', '--quiet', '-c', 'refine/issue-57-20261115-1353');
  propose(repo);
  git(repo.dir, 'add', 'openspec');
  git(repo.dir, 'commit', '--quiet', '-m', '57-bank-holidays: Propose');
  git(repo.dir, 'push', '--quiet', 'origin', 'refine/issue-57-20261115-1353');
  git(repo.dir, 'switch', '--quiet', 'main');
  git(repo.dir, 'branch', '--quiet', '-D', 'refine/issue-57-20261115-1353');
  const r = run(repo, 'start');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(repo.dir, 'branch', '--show-current').trim(), 'refine/issue-57-20261115-1353');
});
