import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenarios, citations, coverageProblems, scenarioBlocks, exampleRows, exampleColumns, placeholders, examplesProblems, deliveryTasksProblems } from './specs.mjs';

const spec = (...names) => names.map((n) => `### Requirement: R\n\nIt SHALL.\n\n#### Scenario: ${n}\n\n- **WHEN** a\n- **THEN** b\n`).join('\n');

test('scenarios are read from a spec by name', () => {
  assert.deepEqual(scenarios(spec('An outage is urgent', 'A Friday ticket')), ['An outage is urgent', 'A Friday ticket']);
});

test('a test cites a scenario as [capability] scenario name', () => {
  assert.deepEqual(citations("test('[response-deadline] A Friday ticket', ...)\ntest('no citation', ...)"),
    [{ capability: 'response-deadline', scenario: 'A Friday ticket' }]);
});

test("a scenario's name may hold a quote of another kind, or the same one escaped", () => {
  assert.deepEqual(citations(`test("[response-deadline] A customer's ticket", ...)\ntest('[response-deadline] A vendor\\'s ticket', ...)`),
    [{ capability: 'response-deadline', scenario: "A customer's ticket" }, { capability: 'response-deadline', scenario: "A vendor's ticket" }]);
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

// worked examples (ADR 0007)

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

test("only a scenario's first table is its worked examples", () => {
  const body = '\n- **WHEN** <a>\n\n| a |\n|---|\n\nNotes:\n\n| b | c |\n|---|---|\n| 1 | 2 |\n';
  assert.deepEqual(exampleColumns(body), ['a']);
  assert.deepEqual(exampleRows(body), []);
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

const delivery = (n = 3, lines = ["Grounding: or 'nothing stale'", 'Independent review: record the commit', "Second review: or 'not needed: no fixes'", 'OpenSpec verify: the counts']) =>
  `# Tasks\n\n## 1. Build\n\n- [ ] 1.1 Do it\n\n## ${n}. Delivery\n\n${lines.map((l, i) => `- [ ] ${n}.${i + 1} ${l}`).join('\n')}\n\n## Workflow follow-up\n\n- Archive it.\n`;

test("an open change's tasks end with the Delivery group, ticked or not", () => {
  assert.deepEqual(deliveryTasksProblems([{ change: '57-holidays', text: delivery() }]), []);
  assert.deepEqual(deliveryTasksProblems([{ change: '57-holidays', text: delivery().replaceAll('- [ ]', '- [x]') }]), []);
});

test('an open change with no Delivery group is a problem', () => {
  assert.deepEqual(deliveryTasksProblems([{ change: '57-holidays', text: '# Tasks\n\n## 1. Build\n\n- [ ] 1.1 Do it\n' }]),
    ['57-holidays: its tasks have no "## <n>. Delivery" group (openspec/config.yaml)']);
});

test('a Delivery group missing one of its four tasks is a problem, as is a task outside the group', () => {
  assert.deepEqual(deliveryTasksProblems([{ change: '57-holidays', text: delivery(2, ['Grounding: x', 'Independent review: x', 'OpenSpec verify: y']) }]),
    ['57-holidays: its Delivery group has no "Second review" task']);
  const outside = '# Tasks\n\n## 1. Build\n\n- [ ] 1.1 Second review: here instead\n\n' + delivery(2, ['Grounding: x', 'Independent review: x', 'OpenSpec verify: y']).replace('# Tasks\n\n', '');
  assert.deepEqual(deliveryTasksProblems([{ change: '57-holidays', text: outside }]),
    ['57-holidays: its Delivery group has no "Second review" task']);
});

test('a Delivery group with no Grounding task is a problem, so a delivery cannot skip its reading unseen', () => {
  assert.deepEqual(deliveryTasksProblems([{ change: '57-holidays', text: delivery(2, ['Independent review: x', "Second review: y", 'OpenSpec verify: z']) }]),
    ['57-holidays: its Delivery group has no "Grounding" task']);
});
