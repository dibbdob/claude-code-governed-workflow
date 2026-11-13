// The team delivery scripts (ADRs 0007, 0008), run for real against a stand-in team: a bare repository on disk is
// the team's GitHub repository, each person is a clone of it, and tools/testing/gh plays GitHub's issues.
//
//   start   makes a person's own folder and branch, offline if need be, and claims when it can
//   claim   the only step that assigns an issue
//   finish  only looks: it opens the pull request when the issue is yours, and refuses otherwise
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPTS = resolve('scripts');
const FAKE_GH = resolve('tools/testing');
const git = (cwd, ...args) =>
  execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', ...args],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

// Approved changes on the team's main. A change still being refined is not on main at all, so '44-draft' is
// not among them.
const CHANGES = ['42-holidays', '43-weekends', 'unlinked-change'];

function team(github = {}) {
  const root = mkdtempSync(join(tmpdir(), 'team-'));
  const shared = join(root, 'shared.git');
  git(root, 'init', '--quiet', '--bare', '--initial-branch=main', shared);
  const seed = join(root, 'seed');
  git(root, 'clone', '--quiet', shared, seed);
  for (const change of CHANGES) {
    mkdirSync(join(seed, 'openspec/changes', change), { recursive: true });
    writeFileSync(join(seed, 'openspec/changes', change, 'proposal.md'), `# Proposal\n\n## Why\n\n${change}\n`);
  }
  writeFileSync(join(seed, 'build.sh'), '#!/bin/sh\necho "== build passed"\n', { mode: 0o755 });
  writeFileSync(join(seed, '.gitignore'), '.delivery/\n');
  git(seed, 'add', '.');
  git(seed, 'commit', '--quiet', '-m', 'Specifications');
  git(seed, 'push', '--quiet', 'origin', 'HEAD:main');

  const state = join(root, 'github.json');
  writeFileSync(state, JSON.stringify({
    online: true, me: 'ana', canAssign: true, prs: [], calls: [],
    issues: { 42: { assignees: [] }, 43: { assignees: [] } },
    ...github,
  }));
  const env = (me) => ({ ...process.env, PATH: `${FAKE_GH}:${process.env.PATH}`, FAKE_GH_STATE: state, DELIVERY_DIR: join(root, `${me}-deliveries`) });

  return {
    shared,
    state,
    github: () => JSON.parse(readFileSync(state, 'utf8')),
    setGithub(change) {
      writeFileSync(state, JSON.stringify({ ...JSON.parse(readFileSync(state, 'utf8')), ...change }));
    },
    person(me) {
      const dir = join(root, me);
      git(root, 'clone', '--quiet', shared, dir);
      const run = (script, args, cwd = dir) => {
        this.setGithub({ me });
        return spawnSync('bash', [join(SCRIPTS, script), ...args], { cwd, encoding: 'utf8', env: env(me) });
      };
      return { dir, run };
    },
  };
}

const edits = (t) => t.github().calls.filter((c) => c[0] === 'issue' && c[1] === 'edit').length;

// The folder a start made. A failed start stops the test here, so nothing is ever written into an empty path,
// which would be this repository.
const started = (r) => {
  assert.equal(r.status, 0, r.stderr);
  const folder = r.stdout.trim();
  assert.ok(folder.startsWith(tmpdir()) || folder.includes('team-'), `unexpected folder: '${folder}'`);
  return folder;
};

// start

test('start gives a delivery its own folder and branch from the team main, and claims it', () => {
  const t = team();
  const ana = t.person('ana');
  const r = ana.run('start-delivery.sh', ['42']);
  assert.equal(r.status, 0, r.stderr);
  const folder = r.stdout.trim();
  assert.ok(existsSync(join(folder, 'openspec/changes/42-holidays/proposal.md')));
  assert.equal(git(folder, 'branch', '--show-current').trim(), 'deliver/42-holidays');
  assert.deepEqual(t.github().issues[42].assignees, ['ana']);
});

test('start works with no connection at all, and says the claim is still to do', () => {
  const t = team({ online: false });
  const ana = t.person('ana');
  renameSync(t.shared, `${t.shared}.away`);
  const r = ana.run('start-delivery.sh', ['42']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(r.stdout.trim(), 'openspec/changes/42-holidays/proposal.md')));
  assert.match(r.stderr, /Couldn't reach GitHub/);
  assert.match(r.stderr, /claim-delivery\.sh 42-holidays/);
});

test('start refuses a change that has not been approved onto the team main', () => {
  const t = team();
  const r = t.person('ana').run('start-delivery.sh', ['44-draft']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not an approved change/);
});

test('a second person can start the same specification, and is warned whose it is', () => {
  const t = team();
  assert.equal(t.person('ana').run('start-delivery.sh', ['42']).status, 0);
  const r = t.person('ben').run('start-delivery.sh', ['42']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /assigned to ana/);
  assert.deepEqual(t.github().issues[42].assignees, ['ana']);
});

// claim

test('claim assigns a free issue to you, and running it again changes nothing', () => {
  const t = team();
  const ana = t.person('ana');
  assert.equal(ana.run('claim-delivery.sh', ['42-holidays']).status, 0);
  assert.deepEqual(t.github().issues[42].assignees, ['ana']);
  const before = edits(t);
  const again = ana.run('claim-delivery.sh', ['42-holidays']);
  assert.equal(again.status, 0);
  assert.match(again.stdout, /yours/);
  assert.equal(edits(t), before);
});

test("claim never takes someone else's issue; it warns you instead", () => {
  const t = team({ issues: { 42: { assignees: ['ben'] }, 43: { assignees: [] } } });
  const r = t.person('ana').run('claim-delivery.sh', ['42-holidays']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /assigned to ben/);
  assert.deepEqual(t.github().issues[42].assignees, ['ben']);
  assert.equal(edits(t), 0);
});

test('when you may not assign issues, claim says who to ask and changes nothing', () => {
  const t = team({ canAssign: false });
  const r = t.person('ana').run('claim-delivery.sh', ['42-holidays']);
  assert.equal(r.status, 3);
  assert.match(r.stderr, /Ask someone who can assign issues/);
  assert.deepEqual(t.github().issues[42].assignees, []);
});

test('when two people end up on one issue, claim says so and changes nothing', () => {
  // Two claims in the same second can both land. Claim does not decide between them: it says so, and the
  // pull request check refuses to merge until one person is left.
  const t = team({ issues: { 42: { assignees: ['ana', 'ben'] }, 43: { assignees: [] } } });
  const r = t.person('ana').run('claim-delivery.sh', ['42-holidays']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /ana and ben are both on issue #42/);
  assert.deepEqual(t.github().issues[42].assignees, ['ana', 'ben']);
  assert.equal(edits(t), 0);
});

test('claim says so when GitHub cannot be reached, and when a specification has no issue', () => {
  const t = team({ online: false });
  const ana = t.person('ana');
  assert.equal(ana.run('claim-delivery.sh', ['42-holidays']).status, 2);
  t.setGithub({ online: true });
  const unlinked = ana.run('claim-delivery.sh', ['unlinked-change']);
  assert.equal(unlinked.status, 4);
  assert.match(unlinked.stderr, /not named after an issue/);
});

test('claim --check only looks: it never assigns, and passes only for one owner who is the one named', () => {
  const t = team();
  const ana = t.person('ana');
  assert.equal(ana.run('claim-delivery.sh', ['--check', '42-holidays']).status, 1);
  assert.equal(edits(t), 0);
  t.setGithub({ issues: { 42: { assignees: ['ana'] }, 43: { assignees: ['ana', 'ben'] } } });
  assert.equal(ana.run('claim-delivery.sh', ['--check', '42-holidays']).status, 0);
  assert.equal(ana.run('claim-delivery.sh', ['--check', '42-holidays', '--owner', 'ben']).status, 1);
  assert.equal(ana.run('claim-delivery.sh', ['--check', '43-weekends']).status, 1, 'two people on one issue');
  assert.equal(edits(t), 0);
});

// What /deliver's last step does: openspec archive moves the change into the archive (and updates the specs).
const archive = (folder, change = '42-holidays') => {
  mkdirSync(join(folder, 'openspec/changes/archive'), { recursive: true });
  git(folder, 'mv', `openspec/changes/${change}`, `openspec/changes/archive/2026-11-13-${change}`);
  git(folder, 'commit', '--quiet', '-m', `Archive ${change}`);
};

// finish

test("finish will not open a pull request for an issue that is not yours", () => {
  const t = team();
  const ben = t.person('ben');
  const folder = started(ben.run('start-delivery.sh', ['42']));
  t.setGithub({ issues: { 42: { assignees: ['ana'] }, 43: { assignees: [] } } });
  archive(folder);
  mkdirSync(join(folder, '.delivery'));
  writeFileSync(join(folder, '.delivery/pull-request.md'), 'Merge deliver/42-holidays: holidays\n');
  const r = ben.run('finish-delivery.sh', [], folder);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /assigned to ana/);
  assert.deepEqual(t.github().prs, []);
});

test('finish waits until the change is archived, so the specs and the code merge together', () => {
  const t = team();
  const ana = t.person('ana');
  const folder = started(ana.run('start-delivery.sh', ['42']));
  mkdirSync(join(folder, '.delivery'));
  writeFileSync(join(folder, '.delivery/pull-request.md'), 'Merge deliver/42-holidays: holidays\n');
  const r = ana.run('finish-delivery.sh', [], folder);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /openspec archive 42-holidays --yes/);
  assert.deepEqual(t.github().prs, []);
});

test('finish pushes the branch and opens a draft pull request that closes the issue', () => {
  const t = team();
  const ana = t.person('ana');
  const folder = started(ana.run('start-delivery.sh', ['42']));
  writeFileSync(join(folder, 'holidays.txt'), 'done\n');
  git(folder, 'add', '.');
  git(folder, 'commit', '--quiet', '-m', '0002 Skip holidays');
  archive(folder);
  mkdirSync(join(folder, '.delivery'));
  writeFileSync(join(folder, '.delivery/pull-request.md'), 'Merge deliver/42-holidays: holidays are skipped\n\n## In plain terms\n');
  const r = ana.run('finish-delivery.sh', [], folder);
  assert.equal(r.status, 0, r.stderr);
  assert.match(git(t.shared, 'log', '--oneline', 'deliver/42-holidays'), /0002 Skip holidays/);
  const [pr] = t.github().prs;
  assert.equal(pr.draft, true);
  assert.equal(pr.title, '42-holidays: holidays are skipped');
  assert.match(pr.body, /Closes #42/);
});

// the unattended run

const agent = (person, t, env = {}) => {
  t.setGithub({ me: env.me ?? 'ana' });
  return spawnSync('bash', [join(SCRIPTS, 'agent.sh'), '42'], {
    cwd: person.dir,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${FAKE_GH}:${process.env.PATH}`, FAKE_GH_STATE: t.state,
      DELIVERY_DIR: `${person.dir}-deliveries`, RUNS_DIR: `${person.dir}-runs`, ...env },
  });
};

test('an unattended run starts its own folder, delivers, and opens a draft pull request', () => {
  const t = team();
  const ana = t.person('ana');
  const r = agent(ana, t);
  assert.equal(r.status, 0, r.stderr);
  assert.match(git(t.shared, 'log', '--oneline', 'deliver/42-holidays'), /Deliver it/);
  assert.equal(t.github().prs.length, 1);
  assert.equal(git(ana.dir, 'branch', '--show-current').trim(), 'main', "the person's own checkout is left alone");
});

test('a run in CI opens the pull request for the person assigned, and only for them', () => {
  const t = team({ issues: { 42: { assignees: ['ana'] }, 43: { assignees: [] } } });
  const bot = t.person('bot');
  const refused = agent(bot, t, { me: 'github-actions[bot]', DELIVERY_FOR: 'ben' });
  assert.equal(refused.status, 1);
  assert.equal(t.github().prs.length, 0);

  const other = t.person('bot2');
  const r = agent(other, t, { me: 'github-actions[bot]', DELIVERY_FOR: 'ana' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(t.github().prs.length, 1);
});

test('claim --check --any-owner passes for exactly one person, whoever it is', () => {
  const t = team({ issues: { 42: { assignees: ['ana'] }, 43: { assignees: ['ana', 'ben'] } } });
  const bot = t.person('bot');
  assert.equal(bot.run('claim-delivery.sh', ['--check', '42-holidays', '--any-owner']).status, 0);
  assert.equal(bot.run('claim-delivery.sh', ['--check', '43-weekends', '--any-owner']).status, 1);
  t.setGithub({ issues: { 42: { assignees: [] }, 43: { assignees: [] } } });
  assert.equal(bot.run('claim-delivery.sh', ['--check', '42-holidays', '--any-owner']).status, 1);
  assert.equal(edits(t), 0);
});
