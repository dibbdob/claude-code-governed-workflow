// scripts/agent.sh, the headless delivery on this machine (ADR 0008), run for real against a throwaway
// repository on disk, with tools/testing/claude standing in for a model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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

const agent = (dir, wanted = '42', env = {}, extra = []) => spawnSync('bash', [AGENT, wanted, ...extra], {
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

// The model Claude Code was started with, from the arguments the stand-in recorded.
const modelGiven = (file) => {
  const args = readFileSync(file, 'utf8').split('\n');
  return args[args.indexOf('--model') + 1];
};
const DEFAULT_MODEL = readFileSync('scripts/delivery-model.txt', 'utf8').trim();

test('a run uses the model the deliver workflow uses, and says so in the pull request', () => {
  const dir = repository();
  const r = agent(dir, '42', { FAKE_CLAUDE_ARGS: `${dir}-args` });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(modelGiven(`${dir}-args`), DEFAULT_MODEL);
  const description = readFileSync(join(dir, '.delivery/pull-request.md'), 'utf8').split('\n');
  assert.match(description[0], /^Merge deliver\/42-holidays: /, 'the title line stays first');
  assert.equal(description[2], `Delivered by \`scripts/agent.sh\` on ${DEFAULT_MODEL}, the default in \`scripts/delivery-model.txt\`.`);
});

test('--model runs one delivery on another model, and the pull request says it was chosen', () => {
  const dir = repository();
  const r = agent(dir, '42', { FAKE_CLAUDE_ARGS: `${dir}-args` }, ['--model', 'claude-opus-5-5']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(modelGiven(`${dir}-args`), 'claude-opus-5-5');
  assert.match(readFileSync(join(dir, '.delivery/pull-request.md'), 'utf8'),
    new RegExp(`on claude-opus-5-5, chosen for this run in place of the default, ${DEFAULT_MODEL}\\.`));
});

test('a model that is not a plain name, or a flag it does not know, is refused before anything starts', () => {
  for (const extra of [['--model', 'opus; rm -rf .'], ['--model', ''], ['--model'], ['--modle', 'claude-opus-5-5']]) {
    const dir = repository();
    const r = agent(dir, '42', {}, extra);
    assert.equal(r.status, 1, `${extra.join(' ')}: ${r.stderr}`);
    assert.equal(git(dir, 'branch', '--show-current').trim(), 'main', `${extra.join(' ')} made no branch`);
  }
});

test('the deliver workflow reads the same default model and tool list as agent.sh', () => {
  const workflow = readFileSync('.github/workflows/deliver.yml', 'utf8');
  assert.match(workflow, /scripts\/delivery-model\.txt/);
  assert.match(workflow, /--model \$\{\{ steps\.find\.outputs\.model \}\}/);
  assert.match(workflow, /scripts\/headless-tools\.txt/);
  assert.doesNotMatch(workflow, /--model claude-/, 'no model is written into the workflow itself');
});
