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
  for (const openedAt of ['2026-11-10T00:00:00Z', '2026-11-10T08:00:00Z', '2026-11-10T11:00:00Z']) {
    const due = responseDueAt(new Date(openedAt), 'urgent', holidays);
    assert.equal(due.toISOString(), '2026-11-11T13:00:00.000Z', openedAt);
  }
  // Opened after closing on a holiday Friday: the weekend follows, so counting starts at 09:00 on Monday
  const due = responseDueAt(new Date('2026-12-25T18:00:00Z'), 'urgent', ['2026-12-25']);
  assert.equal(due.toISOString(), '2026-12-28T13:00:00.000Z');
});

test('[response-deadline] No list of holidays', () => {
  // The cases the earlier tests cover, and deadlines that run over several days, give the same deadlines as
  // before, with no list and with an empty one
  const cases = [
    ['2026-11-11T10:00:00Z', 'urgent', '2026-11-11T14:00:00.000Z'],
    ['2026-11-13T16:00:00Z', 'urgent', '2026-11-16T12:00:00.000Z'],
    ['2026-11-14T11:00:00Z', 'high', '2026-11-16T17:00:00.000Z'],
    ['2026-11-09T18:00:00Z', 'high', '2026-11-10T17:00:00.000Z'],
    ['2026-11-09T15:00:00Z', 'normal', '2026-11-12T15:00:00.000Z'],
    ['2026-11-11T10:00:00Z', 'low', '2026-11-18T10:00:00.000Z'],
  ];
  for (const [openedAt, priority, expected] of cases) {
    for (const holidays of [undefined, null, []]) {
      assert.equal(responseDueAt(new Date(openedAt), priority, holidays).toISOString(), expected, openedAt);
    }
  }

  // An opening time that is not a date gave an invalid date before, and still does
  for (const holidays of [undefined, null, []]) {
    const due = responseDueAt(new Date('not a date'), 'urgent', holidays);
    assert.ok(Number.isNaN(due.getTime()));
  }
});

test('a holiday not written as YYYY-MM-DD is refused, not ignored', () => {
  const openedAt = new Date('2026-11-09T10:00:00Z');
  for (const holidays of [[new Date('2026-11-10')], ['2026-11-10T00:00:00Z'], ['10/11/2026'], ['2026-11-10 '], '2026-11-10', ['2026-11-31'], ['2026-02-30'], {}, ['NaN-NaN-NaN'], [Symbol('x')]]) {
    assert.throws(() => responseDueAt(openedAt, 'high', holidays), RangeError, String(holidays));
  }
});

test('a real holiday before the year 1000 is accepted', () => {
  // Christmas 0999 was a Thursday; opened 16:00 on the 24th, urgent, it is due 12:00 on Monday the 28th
  const due = responseDueAt(new Date('0999-12-24T16:00:00Z'), 'urgent', ['0999-12-25']);
  assert.equal(due.toISOString(), '0999-12-28T12:00:00.000Z');
});

test('an opening time that is not a date, with holidays, still gives an invalid deadline', () => {
  const due = responseDueAt(new Date('not a date'), 'urgent', ['2026-11-10']);
  assert.ok(Number.isNaN(due.getTime()));
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
