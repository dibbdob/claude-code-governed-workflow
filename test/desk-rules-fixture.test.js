import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { priorityOf, responseDueAt } from '../src/sla.js';

// The worked examples the C# repositories also run (ticket-intake-service, mcp-server-dotnet). This
// repository owns them: if the rules change, this file changes first and the others are copied from it.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/desk-rules.json', import.meta.url), 'utf8'));

test('the shared desk-rules fixture: every priority example agrees with the rules', () => {
  for (const { case: name, category, outage, plan, priority } of fixture.priority) {
    assert.equal(priorityOf({ category, outage, plan }), priority, name);
  }
});

test('the shared desk-rules fixture: every deadline example agrees with the rules', () => {
  for (const { case: name, opened, priority, holidays, due } of fixture.deadline) {
    assert.equal(responseDueAt(new Date(opened), priority, holidays).toISOString(), new Date(due).toISOString(), name);
  }
});

test('the shared desk-rules fixture covers every rule, the security report and public holidays included', () => {
  assert.equal(fixture.priority.some((p) => p.category === 'security'), true);
  assert.equal(fixture.deadline.some((d) => (d.holidays ?? []).length > 0), true);
});
