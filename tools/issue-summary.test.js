// tools/issue-summary.mjs: the summary an approved change leaves on its issue (ADR 0010).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { END, START, apply, examples, revised, section } from './issue-summary.mjs';

const proposal = `# Proposal

## In plain terms

A ticket opened on a bank holiday is due as if it
were opened at 09:00 on the next working day.

## Why

Issue #57. The desk is closed on bank holidays.

## Risk

Medium. It changes deadlines customers see.

Second paragraph, left out.
`;

const spec = `## ADDED Requirements

### Requirement: Bank holidays are closed days

#### Scenario: A ticket opened on a bank holiday

- **GIVEN** a ticket opened at \`<opened>\`
- **THEN** it is due at \`<due>\`

| opened | due |
|---|---|
| Fri 25 Dec 2026, 10:00 UTC | Mon 28 Dec 2026, 13:00 UTC |

#### Scenario: A scenario with no table

- **GIVEN** nothing
`;

const written = () => section({
  proposal, specs: [spec], approvedOn: '15 Nov 2026', specUrl: 'https://example.invalid/tree/abc/57', pr: '61',
});

test('the summary says what the approved change says: its plain terms, its examples, its risk and where it is', () => {
  const s = written();
  assert.ok(s.startsWith(START) && s.endsWith(END));
  assert.match(s, /## Refined: approved 15 Nov 2026/);
  assert.match(s, /\*\*In plain terms:\*\* A ticket opened on a bank holiday is due as if it were opened at 09:00/);
  assert.match(s, /\*A ticket opened on a bank holiday\*\n\n\| opened \| due \|\n\|---\|---\|\n\| Fri 25 Dec 2026/);
  assert.match(s, /\*\*Risk:\*\* Medium\. It changes deadlines customers see\.\n/);
  assert.doesNotMatch(s, /Second paragraph/);
  assert.match(s, /\*\*Specification, as approved:\*\* https:\/\/example\.invalid\/tree\/abc\/57/);
  assert.match(s, /\*\*Refinement discussion:\*\* #61/);
});

test('a proposal written before "In plain terms" was a rule is summarised from its Why', () => {
  const s = section({ proposal: '# Proposal\n\n## Why\n\nIssue #2. Hours left.\n\nMore.\n', specs: [], approvedOn: 'today', specUrl: 'u', pr: '' });
  assert.match(s, /\*\*In plain terms:\*\* Issue #2\. Hours left\.\n/);
  assert.doesNotMatch(s, /Refinement discussion/);
});

test('only scenarios with worked examples are listed', () => {
  assert.deepEqual(examples(spec).map((s) => s.name), ['A ticket opened on a bank holiday']);
});

test('the summary goes below what was asked, which stays as it was', () => {
  const body = apply('Bank holidays should count as closed days.\n', written());
  assert.ok(body.startsWith('Bank holidays should count as closed days.\n\n' + START));
});

test('writing the summary again replaces it, not adds a second copy', () => {
  const once = apply('Asked.\n', written());
  const twice = apply(once, written().replace('15 Nov 2026', '16 Nov 2026'));
  assert.equal(twice.split(START).length, 2);
  assert.match(twice, /approved 16 Nov 2026/);
  assert.doesNotMatch(twice, /approved 15 Nov 2026/);
});

test('a delivery that reworded the change is noted inside the summary, once per pull request', () => {
  const body = revised(revised(apply('Asked.\n', written()), '64'), '64');
  assert.equal(body.split('see #64,').length, 2);
  assert.ok(body.indexOf('see #64,') < body.indexOf(END));
});

test('a revision of an issue with no summary gets a section of its own', () => {
  const body = revised('Asked.\n', '64');
  assert.ok(body.startsWith('Asked.\n\n' + START));
  assert.match(body, /Revised during delivery:\*\* see #64,/);
});

test('writing the summary after a revision keeps the note of the revision', () => {
  const body = apply(revised('Asked.\n', '64'), written());
  assert.equal(body.split(START).length, 2);
  assert.match(body, /Refined: approved/);
  assert.equal(body.split('see #64,').length, 2);
  assert.ok(body.indexOf('see #64,') < body.indexOf(END));
});

test('the command line reads a change folder', () => {
  const dir = mkdtempSync(join(tmpdir(), 'summary-'));
  execFileSync('mkdir', ['-p', join(dir, 'specs/response-deadline')]);
  writeFileSync(join(dir, 'proposal.md'), proposal);
  writeFileSync(join(dir, 'specs/response-deadline/spec.md'), spec);
  const out = execFileSync('node', ['tools/issue-summary.mjs', 'section', dir, '15 Nov 2026', 'u', '-'], { encoding: 'utf8' });
  assert.match(out, /Fri 25 Dec 2026/);
});
