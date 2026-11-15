// scripts/adopt.sh, run for real against a throwaway project, with stand-ins for `openspec init` and npm so
// that nothing is downloaded.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { brokenLinks, root } from './links.mjs';

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
  for (const f of ['scripts/agent.sh', 'scripts/refinement.sh', 'scripts/refine-tools.txt', 'tools/specs.mjs', 'scripts/test-citations.json',
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

test('a project gets /refine and /deliver, their agents and the hook, so a run on GitHub has them', () => {
  const dir = project();
  const r = adopt(dir);
  assert.equal(r.status, 0, r.stderr);
  for (const f of ['.claude/commands/refine.md', '.claude/commands/deliver.md', '.claude/agents/spec-reader.md',
    '.claude/agents/independent-reviewer.md', '.claude/hooks/read_only_bash.py']) {
    assert.ok(existsSync(join(dir, f)), `${f} is added`);
  }
  // Every command a workflow names is one the project now has.
  for (const workflow of ['refine', 'deliver']) {
    const [, command] = read(dir, `.github/workflows/${workflow}.yml`).match(/\((\.claude\/commands\/[a-z]+\.md)\)/);
    assert.ok(existsSync(join(dir, command)), `${workflow}.yml runs ${command}`);
  }
  // The reviewer keeps the hook that holds it to read-only commands, and the hook is where it points.
  assert.match(read(dir, '.claude/agents/independent-reviewer.md'), /\$CLAUDE_PROJECT_DIR\/\.claude\/hooks\/read_only_bash\.py/);
  assert.equal(read(dir, '.claude/hooks/read_only_bash.py'), read(process.cwd(), '.claude/hooks/read_only_bash.py'));
});

test('the copied commands and agents have no link the project cannot follow', () => {
  const dir = project();
  assert.equal(adopt(dir).status, 0);
  for (const f of ['.claude/commands/refine.md', '.claude/commands/deliver.md', '.claude/agents/spec-reader.md',
    '.claude/agents/independent-reviewer.md']) {
    const broken = brokenLinks(f, read(dir, f), (path) => existsSync(path.replace(root, dir)));
    assert.deepEqual(broken, [], f);
  }
  assert.match(read(dir, '.claude/commands/deliver.md'), /\]\(https:\/\/github\.com\/[^)]*\/docs\/adr\/0006-/);
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

test('a .gitignore whose last line has no newline keeps that line, and gets ours on lines of their own', () => {
  const dir = project({ '.gitignore': 'dist/\n.env' });
  assert.equal(adopt(dir).status, 0);
  const lines = read(dir, '.gitignore').split('\n');
  assert.deepEqual(lines.slice(0, 3), ['dist/', '.env', 'node_modules']);
  assert.ok(lines.includes('.refine/'));
});

test("an OpenSpec config the project already had is kept, though it has no rules", () => {
  const config = 'schema: spec-driven\ncontext: |\n  Our own product.\n';
  const dir = project({ 'openspec/config.yaml': config });
  const r = adopt(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(read(dir, 'openspec/config.yaml'), config);
  assert.match(r.stdout, /Kept as they were, because the project already had them: .*openspec\/config\.yaml/);
  assert.match(r.stdout, /has none of this workflow's rules[\s\S]*fails every change \/refine writes/);
  assert.doesNotMatch(r.stdout, /the risk rule names what is risky for the example desk/);
});

test("a project's own config that already has this workflow's rules is only told to fit the risk rule", () => {
  const config = `${readFileSync('openspec/config.yaml', 'utf8')}\ncontext: |\n  Our own product.\n`;
  const r = adopt(project({ 'openspec/config.yaml': config }));
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /the risk rule names what is risky for the example desk/);
  assert.doesNotMatch(r.stdout, /has none of this workflow's rules/);
});

test('a project that already depends on OpenSpec is not given a second copy', () => {
  const dir = project({ 'package.json': JSON.stringify({ dependencies: { '@fission-ai/openspec': '1.9.0' } }) });
  const r = adopt(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(read(dir, 'package.json')).devDependencies, undefined);
  assert.match(r.stdout, /KEPT {3}package\.json \(it asks for OpenSpec 1\.9\.0/);
});

test("a project's own test config is kept, not replaced by this repository's", () => {
  const own = '{"dirs": ["tests"], "suffixes": [".cs"], "style": "quoted"}\n';
  const dir = project({ 'scripts/test-citations.json': own });
  const r = adopt(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(read(dir, 'scripts/test-citations.json'), own);
  assert.match(r.stdout, /same {3}scripts\/test-citations\.json \(the project's own\)/);
});
