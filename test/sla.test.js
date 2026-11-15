import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priorityOf, responseDueAt } from '../src/sla.js';

// Each row of a priority scenario's worked examples (openspec/specs/response-deadline/spec.md): the row as
// the spec writes it, the ticket, when it was opened, and the priority and reply deadline agreed for it.
function checkRows(rows) {
  for (const [row, ticket, openedAt, priority, due] of rows) {
    assert.equal(priorityOf(ticket), priority, row);
    assert.equal(responseDueAt(new Date(openedAt), priorityOf(ticket)).toISOString(), due, row);
  }
}

test('[response-deadline] An outage on the enterprise plan is urgent', () => {
  checkRows([
    ['Wed 11 Nov 2026, 10:00 UTC', { outage: true, plan: 'enterprise' }, '2026-11-11T10:00:00Z', 'urgent', '2026-11-11T14:00:00.000Z'],
  ]);
});

test('[response-deadline] An outage on any other plan is high', () => {
  checkRows([
    ['the starter plan', { outage: true, plan: 'starter' }, '2026-11-11T10:00:00Z', 'high', '2026-11-12T10:00:00.000Z'],
    ['no plan recorded', { outage: true }, '2026-11-13T16:00:00Z', 'high', '2026-11-16T16:00:00.000Z'],
  ]);
});

test('[response-deadline] A security report is urgent whatever the plan', () => {
  // What the customer reported (a leaked password, and so on) is recorded as the category `security`
  checkRows([
    ['the starter plan: a leaked password', { category: 'security', plan: 'starter' }, '2026-11-11T10:00:00Z', 'urgent', '2026-11-11T14:00:00.000Z'],
    ["the enterprise plan: someone else's data on their screen", { category: 'security', plan: 'enterprise' }, '2026-11-11T16:30:00Z', 'urgent', '2026-11-12T12:30:00.000Z'],
    ['no plan recorded: a login they did not make', { category: 'security' }, '2026-11-13T16:00:00Z', 'urgent', '2026-11-16T12:00:00.000Z'],
  ]);
});

test('[response-deadline] A security report that is also an outage is urgent', () => {
  checkRows([
    ['the starter plan', { outage: true, category: 'security', plan: 'starter' }, '2026-11-11T10:00:00Z', 'urgent', '2026-11-11T14:00:00.000Z'],
    ['the enterprise plan', { outage: true, category: 'security', plan: 'enterprise' }, '2026-11-13T16:00:00Z', 'urgent', '2026-11-16T12:00:00.000Z'],
  ]);
});

test('[response-deadline] A ticket that is not a security report keeps its priority', () => {
  checkRows([
    ['the enterprise plan: a billing problem', { category: 'billing', plan: 'enterprise' }, '2026-11-13T16:00:00Z', 'normal', '2026-11-18T16:00:00.000Z'],
    ['the starter plan: a question', { category: 'question', plan: 'starter' }, '2026-11-11T10:00:00Z', 'low', '2026-11-18T10:00:00.000Z'],
    ['the starter plan: a problem of no recorded kind', { plan: 'starter' }, '2026-11-11T10:00:00Z', 'normal', '2026-11-16T10:00:00.000Z'],
  ]);
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
  for (const holidays of [[new Date('2026-11-10')], ['2026-11-10T00:00:00Z'], ['10/11/2026'], ['2026-11-10 '], '2026-11-10', ['2026-11-31'], ['2026-02-30'], {}, ['NaN-NaN-NaN'], [Symbol('x')], [Object.create(null)]]) {
    assert.throws(() => responseDueAt(openedAt, 'high', holidays), RangeError);
  }
});

test('a real holiday before the year 1000 is accepted', () => {
  // 24 to 26 December 0999 are weekdays: 1 hour on the 24th, the 25th is a holiday, 3 more on the 26th
  const due = responseDueAt(new Date('0999-12-24T16:00:00Z'), 'urgent', ['0999-12-25']);
  assert.equal(due.toISOString(), '0999-12-26T12:00:00.000Z');
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

// The worked examples agreed for each scenario (openspec/specs/response-deadline/spec.md), row by row: each
// is a case a person on the desk checks on the issue, so each is checked here too.
const agreed = {
  'A deadline that runs into a public holiday': [
    ['Thu 24 Dec 2026, 15:00 UTC', '2026-12-24T15:00:00Z', 'urgent', ['2026-12-25'], '2026-12-28T11:00:00.000Z'],
    ['Wed 23 Dec 2026, 09:00 UTC', '2026-12-23T09:00:00Z', 'normal', ['2026-12-25'], '2026-12-28T17:00:00.000Z'],
    ['Thu 24 Dec 2026, 16:00 UTC', '2026-12-24T16:00:00Z', 'high', ['2026-12-25', '2026-12-28'], '2026-12-29T16:00:00.000Z'],
  ],
  'A ticket opened on a public holiday': [
    ['Fri 25 Dec 2026, 10:00 UTC', '2026-12-25T10:00:00Z', 'urgent', ['2026-12-25'], '2026-12-28T13:00:00.000Z'],
    ['Fri 25 Dec 2026, 07:30 UTC', '2026-12-25T07:30:00Z', 'high', ['2026-12-25'], '2026-12-28T17:00:00.000Z'],
  ],
  'No list of holidays': [
    ['Thu 24 Dec 2026, 15:00 UTC', '2026-12-24T15:00:00Z', 'urgent', undefined, '2026-12-25T11:00:00.000Z'],
  ],
};
for (const [scenario, rows] of Object.entries(agreed)) {
  test(`every agreed example of "${scenario}" gives the answer agreed`, () => {
    for (const [opened, at, priority, holidays, due] of rows) {
      assert.equal(responseDueAt(new Date(at), priority, holidays).toISOString(), due, `${opened}, ${priority}`);
    }
  });
}
