// scripts/agent.sh, the headless delivery on this machine (ADR 0008), run for real against a throwaway
// repository on disk, with tools/testing/claude standing in for a model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const AGENT = resolve('scripts/agent.sh');
const FAKE_CLAUDE = resolve('tools/testing');
const git = (cwd, ...args) =>
  execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', ...args],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

// A repository whose main holds approved changes, 42-holidays by default, and a build that passes.
function repository(changes = ['42-holidays']) {
  const dir = mkdtempSync(join(tmpdir(), 'agent-'));
  git(dir, 'init', '--quiet', '--initial-branch=main');
  for (const change of changes) {
    mkdirSync(join(dir, `openspec/changes/${change}`), { recursive: true });
    writeFileSync(join(dir, `openspec/changes/${change}/proposal.md`), '# Proposal\n');
  }
  writeFileSync(join(dir, 'build.sh'), '#!/bin/sh\necho "== build passed"\n', { mode: 0o755 });
  writeFileSync(join(dir, '.gitignore'), '.delivery/\n');
  git(dir, 'add', '.');
  git(dir, 'commit', '--quiet', '-m', 'Specifications');
  return dir;
}

const options = (dir, env) => ({
  cwd: dir,
  encoding: 'utf8',
  env: { ...process.env, PATH: `${FAKE_CLAUDE}:${process.env.PATH}`, RUNS_DIR: `${dir}-runs`,
    DELIVERIES_DIR: `${dir}-deliveries`, ...env },
});
const agent = (dir, wanted = '42', env = {}, extra = []) =>
  spawnSync('bash', [AGENT, wanted, ...extra], options(dir, env));
const worktrees = (dir) => git(dir, 'worktree', 'list', '--porcelain').split('\n').filter((l) => l.startsWith('worktree ')).length;

test('a headless run delivers on its own branch, archived, and the build passes', () => {
  const dir = repository();
  const r = agent(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.match(git(dir, 'log', '--oneline', 'deliver/42-holidays'), /Archive 42-holidays/);
  assert.match(r.stdout, /== build passed/);
  assert.equal(worktrees(dir), 1, 'its worktree is removed once everything in it is committed');
  assert.match(readFileSync(`${dir}-runs/42-holidays.md`, 'utf8'), /^Merge deliver\/42-holidays: /);
});

test('a run leaves the person\'s own checkout as it was, its branch and uncommitted work included', () => {
  const dir = repository();
  git(dir, 'switch', '--quiet', '-c', 'my-work');
  writeFileSync(join(dir, 'notes.txt'), 'half-finished');
  const r = agent(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(dir, 'branch', '--show-current').trim(), 'my-work');
  assert.equal(readFileSync(join(dir, 'notes.txt'), 'utf8'), 'half-finished');
  assert.ok(!existsSync(join(dir, 'delivered.txt')), 'the delivery\'s work is on its branch, not here');
  assert.match(git(dir, 'log', '--oneline', 'deliver/42-holidays'), /Archive 42-holidays/);
});

test('two changes can be delivered at once, each in its own worktree', async () => {
  const dir = repository(['42-holidays', '43-weekends']);
  const run = (wanted) => promisify(execFile)('bash', [AGENT, wanted], options(dir, {}));
  await Promise.all([run('42'), run('43')]);
  assert.match(git(dir, 'log', '--oneline', 'deliver/42-holidays'), /Archive 42-holidays/);
  assert.match(git(dir, 'log', '--oneline', 'deliver/43-weekends'), /Archive 43-weekends/);
  assert.equal(worktrees(dir), 1);
});

test('a change whose delivery branch already exists is refused, and the branch is left alone', () => {
  const dir = repository();
  assert.equal(agent(dir).status, 0);
  const before = git(dir, 'rev-parse', 'deliver/42-holidays');
  const r = agent(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /deliver\/42-holidays already exists/);
  assert.equal(git(dir, 'rev-parse', 'deliver/42-holidays'), before);
});

test('a run that leaves work uncommitted keeps its worktree for a person to read', () => {
  const dir = repository();
  const r = agent(dir, '42', { FAKE_CLAUDE_LEAVE_UNCOMMITTED: '1' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /left uncommitted changes/);
  assert.match(r.stderr, /worktree is kept at .*42-holidays/);
  assert.equal(readFileSync(`${dir}-deliveries/42-holidays/delivered.txt`, 'utf8'), 'half-finished\n');
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

test('a run refuses the archive, or a path inside a change, as the change to deliver', () => {
  const dir = repository();
  mkdirSync(join(dir, 'openspec/changes/archive/2026-01-01-7-old'), { recursive: true });
  writeFileSync(join(dir, 'openspec/changes/archive/2026-01-01-7-old/proposal.md'), '# Proposal\n');
  git(dir, 'add', '.');
  git(dir, 'commit', '--quiet', '-m', 'An archived change');
  for (const wanted of ['archive', 'archive/2026-01-01-7-old', '42-holidays/proposal.md', '../changes/42-holidays']) {
    const r = agent(dir, wanted);
    assert.equal(r.status, 1, `${wanted}: ${r.stderr}`);
    assert.match(r.stderr, /not an approved change/, wanted);
    assert.equal(git(dir, 'branch', '--list', 'deliver/*').trim(), '', `${wanted} made no branch`);
  }
  assert.equal(agent(dir, '42-holidays').status, 0, 'the change named in full is delivered');
});

test('a run refuses an issue number that more than one change is named after', () => {
  const dir = repository();
  mkdirSync(join(dir, 'openspec/changes/42-weekends'), { recursive: true });
  writeFileSync(join(dir, 'openspec/changes/42-weekends/proposal.md'), '# Proposal\n');
  git(dir, 'add', '.');
  git(dir, 'commit', '--quiet', '-m', 'A second change for 42');
  const r = agent(dir, '42');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /More than one change is named after issue #42.*42-holidays 42-weekends/);
  assert.equal(git(dir, 'branch', '--list', 'deliver/*').trim(), '');
});

test('a run that fails before delivering anything leaves nothing behind, so it can simply be run again', () => {
  // An expired login, say: what a failed run left behind must not stop the next one.
  const dir = repository();
  const failed = agent(dir, '42', { FAKE_CLAUDE_FAIL: '1' });
  assert.equal(failed.status, 1);
  assert.equal(git(dir, 'branch', '--list', 'deliver/42-holidays').trim(), '', `the empty branch is removed: ${failed.stderr}`);
  assert.equal(worktrees(dir), 1, 'and so is its worktree');
  assert.equal(agent(dir).status, 0);
});

test('a run that fails after committing keeps its branch', () => {
  const dir = repository();
  const r = agent(dir, '42', { FAKE_CLAUDE_FAIL_AFTER_COMMIT: '1' });
  assert.equal(r.status, 1);
  assert.match(git(dir, 'log', '--oneline', 'deliver/42-holidays'), /Deliver it/);
  assert.equal(worktrees(dir), 1, 'its worktree had nothing uncommitted, so it is removed');
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
  const description = readFileSync(`${dir}-runs/42-holidays.md`, 'utf8').split('\n');
  assert.match(description[0], /^Merge deliver\/42-holidays: /, 'the title line stays first');
  assert.equal(description[2], `Delivered by \`scripts/agent.sh\` on ${DEFAULT_MODEL}, the default in \`scripts/delivery-model.txt\`.`);
});

test('--model runs one delivery on another model, and the pull request says it was chosen', () => {
  const dir = repository();
  const r = agent(dir, '42', { FAKE_CLAUDE_ARGS: `${dir}-args` }, ['--model', 'claude-opus-5-5']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(modelGiven(`${dir}-args`), 'claude-opus-5-5');
  assert.match(readFileSync(`${dir}-runs/42-holidays.md`, 'utf8'),
    new RegExp(`on claude-opus-5-5, chosen for this run in place of the default, ${DEFAULT_MODEL}\\.`));
});

test('a model that is not a plain name, or a flag it does not know, is refused before anything starts', () => {
  for (const extra of [['--model', 'opus; rm -rf .'], ['--model', ''], ['--model'], ['--modle', 'claude-opus-5-5']]) {
    const dir = repository();
    const r = agent(dir, '42', {}, extra);
    assert.equal(r.status, 1, `${extra.join(' ')}: ${r.stderr}`);
    assert.equal(git(dir, 'branch', '--list', 'deliver/*').trim(), '', `${extra.join(' ')} made no branch`);
  }
});

test('the deliver workflow reads the same default model and tool list as agent.sh', () => {
  const workflow = readFileSync('.github/workflows/deliver.yml', 'utf8');
  assert.match(workflow, /scripts\/delivery-model\.txt/);
  assert.match(workflow, /--model \$\{\{ steps\.find\.outputs\.model \}\}/);
  assert.match(workflow, /scripts\/headless-tools\.txt/);
  assert.doesNotMatch(workflow, /--model claude-/, 'no model is written into the workflow itself');
});

test('an unattended run may ask which branch it is on, but not delete or move one', () => {
  const tools = readFileSync('scripts/headless-tools.txt', 'utf8').split('\n');
  assert.deepEqual(tools.filter((t) => t.startsWith('Bash(git branch')), ['Bash(git branch --show-current)']);
});
