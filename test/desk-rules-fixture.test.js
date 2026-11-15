import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { priorityOf, responseDueAt } from '../src/sla.js';

// The desk's rules as worked examples, kept as data so that any implementation of them can be checked
// against the same rows. If the rules change, the fixture changes with them.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/desk-rules.json', import.meta.url), 'utf8'));

test('the desk-rules fixture: every priority example agrees with the rules', () => {
  for (const { case: name, category, outage, plan, priority } of fixture.priority) {
    assert.equal(priorityOf({ category, outage, plan }), priority, name);
  }
});

test('the desk-rules fixture: every deadline example agrees with the rules', () => {
  for (const { case: name, opened, priority, holidays, due } of fixture.deadline) {
    assert.equal(responseDueAt(new Date(opened), priority, holidays).toISOString(), new Date(due).toISOString(), name);
  }
});

test('the desk-rules fixture covers every rule, the security report and public holidays included', () => {
  assert.equal(fixture.priority.some((p) => p.category === 'security'), true);
  assert.equal(fixture.deadline.some((d) => (d.holidays ?? []).length > 0), true);
});
