import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenarios, citations, coverageProblems, scenarioBlocks, exampleRows, exampleColumns, placeholders, examplesProblems } from './specs.mjs';

const spec = (...names) => names.map((n) => `### Requirement: R\n\nIt SHALL.\n\n#### Scenario: ${n}\n\n- **WHEN** a\n- **THEN** b\n`).join('\n');

test('scenarios are read from a spec by name', () => {
  assert.deepEqual(scenarios(spec('An outage is urgent', 'A Friday ticket')), ['An outage is urgent', 'A Friday ticket']);
});

test('a test cites a scenario as [capability] scenario name', () => {
  assert.deepEqual(citations("test('[response-deadline] A Friday ticket', ...)\ntest('no citation', ...)"),
    [{ capability: 'response-deadline', scenario: 'A Friday ticket' }]);
});

test('a scenario in the specs with no test naming it is a problem', () => {
  const problems = coverageProblems([{ capability: 'response-deadline', text: spec('Covered', 'Not covered') }], [],
    "test('[response-deadline] Covered', ...)");
  assert.deepEqual(problems, ['response-deadline: no test names the scenario "Not covered"']);
});

test('a test naming a scenario that no spec or open change has is a problem', () => {
  const problems = coverageProblems([], [], "test('[response-deadline] Ghost', ...)");
  assert.deepEqual(problems, ['a test names "[response-deadline] Ghost", which no spec or open change has']);
});

test('a test may name a scenario from a change that is still being delivered', () => {
  const change = [{ capability: 'response-deadline', text: spec('A public holiday') }];
  assert.deepEqual(coverageProblems([], change, "test('[response-deadline] A public holiday', ...)"), []);
});

// worked examples (ADR 0009)

const holidaySpec = `## ADDED Requirements

### Requirement: Public holidays are not business hours

#### Scenario: A deadline that runs into a public holiday

- **GIVEN** a ticket opened at <Opened> with priority <Priority>, and the holidays <Holidays>
- **WHEN** its deadline runs into a public holiday
- **THEN** that whole day is skipped, and it is due at <Due>

| Opened | Priority | Holidays | Due |
|---|---|---|---|
| Thu 24 Dec 2026, 15:00 | urgent | 25 Dec | Mon 28 Dec, 11:00 |

#### Scenario: No list of holidays

- **WHEN** there is no list
- **THEN** it is the same as before
`;

test('a scenario carries its worked examples as the rows of a table under it', () => {
  const [first, second] = scenarioBlocks(holidaySpec);
  assert.equal(first.name, 'A deadline that runs into a public holiday');
  assert.deepEqual(exampleRows(first.body), [['Thu 24 Dec 2026, 15:00', 'urgent', '25 Dec', 'Mon 28 Dec, 11:00']]);
  assert.deepEqual(exampleRows(second.body), []);
});

test('a scenario in an open change with no worked example is a problem', () => {
  const problems = examplesProblems([{ change: '57-holidays', capability: 'response-deadline', text: holidaySpec }]);
  assert.deepEqual(problems, ['57-holidays: the scenario "No list of holidays" (response-deadline) has no worked examples']);
});

const outline = (steps, header) => `### Requirement: R

#### Scenario: S

${steps}

| ${header.join(' | ')} |
|${header.map(() => '---').join('|')}|
| ${header.map((h) => `a ${h}`).join(' | ')} |
`;

test("a scenario's steps name the examples' columns as <placeholders>", () => {
  const [s] = scenarioBlocks(outline('- **GIVEN** a ticket opened at `<opened>`\n- **WHEN** worked out\n- **THEN** due at `<reply due>`', ['opened', 'reply due']));
  assert.deepEqual(placeholders(s.body), ['opened', 'reply due']);
  assert.deepEqual(exampleColumns(s.body), ['opened', 'reply due']);
});

test('a placeholder with no column, or a column no step uses, is a problem', () => {
  const text = outline('- **GIVEN** a ticket opened at `<opened>`\n- **WHEN** worked out\n- **THEN** due at `<due>`', ['opened', 'priority', 'reply due']);
  assert.deepEqual(examplesProblems([{ change: '57-x', capability: 'c', text }]), [
    '57-x: the scenario "S" (c) uses <due>, which is not a column of its examples',
    '57-x: the scenario "S" (c) has the column "priority", which no step uses',
    '57-x: the scenario "S" (c) has the column "reply due", which no step uses',
  ]);
});
