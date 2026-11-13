import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenarios, citations, coverageProblems } from './specs.mjs';

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
