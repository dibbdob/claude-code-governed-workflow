import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCriteria, numberCriteria, findProblems, changedCriteria } from './criteria.mjs';

const spec = (status, criteria) =>
  `# 0009 Example\n\nStatus: ${status}\n\n## Acceptance criteria\n\n${criteria}\n\n## Notes\n\n- not a criterion\n`;

test('criteria are read from their section only', () => {
  const { criteria } = parseCriteria(spec('done', '- Given a, when b, then c.\n- Given d,\n  when e, then f.'));
  assert.deepEqual(criteria.map((c) => c.text), ['Given a, when b, then c.', 'Given d, when e, then f.']);
});

test('numbering gives each unnumbered criterion the next identifier and records the high-water mark', () => {
  const numbered = numberCriteria(spec('ready', '- Given a.\n- Given b.'), '0009');
  const { criteria, highWater } = parseCriteria(numbered);
  assert.deepEqual(criteria.map((c) => c.id), ['0009-AC-1', '0009-AC-2']);
  assert.equal(highWater, 2);
});

test('numbering never reuses the number of a deleted criterion', () => {
  const once = numberCriteria(spec('ready', '- Given a.\n- Given b.'), '0009');
  const secondDeletedThirdAdded = once.replace('- **0009-AC-2** Given b.', '- Given c.');
  const { criteria } = parseCriteria(numberCriteria(secondDeletedThirdAdded, '0009'));
  assert.deepEqual(criteria.map((c) => c.id), ['0009-AC-1', '0009-AC-3']);
});

test('numbering leaves a criterion that already has an identifier alone', () => {
  const once = numberCriteria(spec('ready', '- Given a.'), '0009');
  assert.equal(numberCriteria(once, '0009'), once);
});

test('a done specification with a criterion no test names is a problem', () => {
  const text = numberCriteria(spec('done', '- Given a.\n- Given b.'), '0009');
  const problems = findProblems([{ name: '0009.md', text }], "test('[0009-AC-1] a', ...)");
  assert.deepEqual(problems, ['0009.md: no test names 0009-AC-2']);
});

test('a done specification with an unnumbered criterion is a problem', () => {
  const problems = findProblems([{ name: '0009.md', text: spec('done', '- Given a.') }], '');
  assert.equal(problems.length, 1);
  assert.match(problems[0], /not numbered/);
});

test('a specification that is not done yet is not held to coverage', () => {
  const text = numberCriteria(spec('in progress', '- Given a.'), '0009');
  assert.deepEqual(findProblems([{ name: '0009.md', text }], ''), []);
});

test('a test naming a criterion that does not exist is a problem', () => {
  const problems = findProblems([], "test('[0042-AC-7] ghost', ...)");
  assert.deepEqual(problems, ['a test names 0042-AC-7, which no specification has']);
});

test('a criterion whose words changed is reported, and one that is newly numbered is not', () => {
  const before = numberCriteria(spec('ready', '- Given a.\n- Given b.'), '0009');
  const after = numberCriteria(before.replace('Given b.', 'Given b, mostly.') + '', '0009').replace(
    '## Notes', '- Given c.\n\n## Notes');
  assert.deepEqual(changedCriteria(before, numberCriteria(after, '0009')), ['0009-AC-2']);
});

test('a criterion that was removed is reported', () => {
  const before = numberCriteria(spec('ready', '- Given a.\n- Given b.'), '0009');
  const after = before.replace('- **0009-AC-2** Given b.\n', '');
  assert.deepEqual(changedCriteria(before, after), ['0009-AC-2']);
});
