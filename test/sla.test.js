import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priorityOf, responseDueAt } from '../src/sla.js';

test('[response-deadline] An outage on the enterprise plan is urgent', () => {
  assert.equal(priorityOf({ outage: true, plan: 'enterprise' }), 'urgent');
});

test('[response-deadline] An outage on any other plan is high', () => {
  assert.equal(priorityOf({ outage: true, plan: 'starter' }), 'high');
});

test('a question is low', () => {
  assert.equal(priorityOf({ category: 'question' }), 'low');
});

test('[response-deadline] A ticket opened during business hours', () => {
  // Wednesday 10:00 + 4 business hours = Wednesday 14:00
  const due = responseDueAt(new Date('2026-11-11T10:00:00Z'), 'urgent');
  assert.equal(due.toISOString(), '2026-11-11T14:00:00.000Z');
});

test('[response-deadline] A ticket opened late on a Friday', () => {
  // Friday 16:00, 1 hour left Friday, 3 more from Monday 09:00 = Monday 12:00
  const due = responseDueAt(new Date('2026-11-13T16:00:00Z'), 'urgent');
  assert.equal(due.toISOString(), '2026-11-16T12:00:00.000Z');
});

test('a ticket opened on Saturday starts counting on Monday', () => {
  const due = responseDueAt(new Date('2026-11-14T11:00:00Z'), 'high');
  assert.equal(due.toISOString(), '2026-11-16T17:00:00.000Z');
});

test('[response-deadline] A priority the desk does not know', () => {
  assert.throws(() => responseDueAt(new Date(), 'whenever'), RangeError);
});

test('[response-deadline] A deadline that runs into a public holiday', () => {
  // Monday 10:00 + 8 business hours: 7 on Monday, Tuesday is a holiday, 1 on Wednesday = Wednesday 10:00
  const due = responseDueAt(new Date('2026-11-09T10:00:00Z'), 'high', ['2026-11-10']);
  assert.equal(due.toISOString(), '2026-11-11T10:00:00.000Z');
});

test('[response-deadline] A ticket opened on a public holiday', () => {
  // Opened on a holiday Tuesday, at any hour: counting starts at 09:00 on Wednesday
  const holidays = ['2026-11-10'];
  for (const openedAt of ['2026-11-10T00:00:00Z', '2026-11-10T11:00:00Z', '2026-11-10T23:59:00Z']) {
    const due = responseDueAt(new Date(openedAt), 'urgent', holidays);
    assert.equal(due.toISOString(), '2026-11-11T13:00:00.000Z', openedAt);
  }
});

test('[response-deadline] No list of holidays', () => {
  // The cases the earlier tests cover, with no list and with an empty one, give the same deadlines as before
  const cases = [
    ['2026-11-11T10:00:00Z', 'urgent', '2026-11-11T14:00:00.000Z'],
    ['2026-11-13T16:00:00Z', 'urgent', '2026-11-16T12:00:00.000Z'],
    ['2026-11-14T11:00:00Z', 'high', '2026-11-16T17:00:00.000Z'],
  ];
  for (const [openedAt, priority, expected] of cases) {
    assert.equal(responseDueAt(new Date(openedAt), priority).toISOString(), expected, openedAt);
    assert.equal(responseDueAt(new Date(openedAt), priority, []).toISOString(), expected, openedAt);
  }
});

test('a ticket opened at 16:00 UTC the day before a holiday is due after the holiday', () => {
  // Thursday 16:00, 1 hour left Thursday, Friday is a holiday, 3 more from Monday 09:00 = Monday 12:00
  const due = responseDueAt(new Date('2026-12-24T16:00:00Z'), 'urgent', ['2026-12-25']);
  assert.equal(due.toISOString(), '2026-12-28T12:00:00.000Z');
});

test('consecutive holidays and a weekend are all skipped', () => {
  // Thursday 16:00 urgent; Friday and the following Monday are holidays = Tuesday 12:00
  const due = responseDueAt(new Date('2026-12-24T16:00:00Z'), 'urgent', ['2026-12-25', '2026-12-28']);
  assert.equal(due.toISOString(), '2026-12-29T12:00:00.000Z');
});
