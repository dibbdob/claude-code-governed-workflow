import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priorityOf, responseDueAt } from '../src/sla.js';

test('[0001-AC-1] an outage on the enterprise plan is urgent', () => {
  assert.equal(priorityOf({ outage: true, plan: 'enterprise' }), 'urgent');
});

test('[0001-AC-2] an outage on any other plan is high', () => {
  assert.equal(priorityOf({ outage: true, plan: 'starter' }), 'high');
});

test('a question is low', () => {
  assert.equal(priorityOf({ category: 'question' }), 'low');
});

test('[0001-AC-3] a ticket opened mid-morning is due the same day', () => {
  // Wednesday 10:00 + 4 business hours = Wednesday 14:00
  const due = responseDueAt(new Date('2026-11-11T10:00:00Z'), 'urgent');
  assert.equal(due.toISOString(), '2026-11-11T14:00:00.000Z');
});

test('[0001-AC-4] a ticket opened late on Friday carries over the weekend', () => {
  // Friday 16:00, 1 hour left Friday, 3 more from Monday 09:00 = Monday 12:00
  const due = responseDueAt(new Date('2026-11-13T16:00:00Z'), 'urgent');
  assert.equal(due.toISOString(), '2026-11-16T12:00:00.000Z');
});

test('a ticket opened on Saturday starts counting on Monday', () => {
  const due = responseDueAt(new Date('2026-11-14T11:00:00Z'), 'high');
  assert.equal(due.toISOString(), '2026-11-16T17:00:00.000Z');
});

test('[0001-AC-5] an unknown priority is refused', () => {
  assert.throws(() => responseDueAt(new Date(), 'whenever'), RangeError);
});
