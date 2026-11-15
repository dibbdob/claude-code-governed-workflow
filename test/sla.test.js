import { test } from 'node:test';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { businessHoursLeft, priorityOf, responseDueAt } from '../src/sla.js';

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

test('[response-deadline] Refusing a priority the desk does not know', () => {
  // Each row of the scenario's worked examples, opened Mon 16 Nov 2026 at 10:00 UTC
  const opened = new Date('2026-11-16T10:00:00Z');
  for (const given of ['whenever', 'Urgent']) {
    assert.throws(
      () => responseDueAt(opened, given),
      new RangeError(`Unknown priority: ${given}. The priorities the desk knows: urgent, high, normal, low`),
      given,
    );
  }
  assert.equal(responseDueAt(opened, 'urgent').toISOString(), '2026-11-16T14:00:00.000Z');
});

test('[response-deadline] An opening time that is not a date', () => {
  // Each row of the scenario's worked examples, priority urgent: the row as the spec writes it, and the
  // opening time. The refused rows are checked with no holidays and with some, the valid row with none
  const refused = [
    ['a date that is not a real one (Invalid Date)', new Date('not a date')],
    ['the text "2026-11-16T10:00:00Z", not a date', '2026-11-16T10:00:00Z'],
    ['nothing at all', undefined],
    // Not a row of the examples, but named by the proposal: a number is not a date either
    ['a number', Date.UTC(2026, 10, 16, 10)],
  ];
  // What each row gives, side by side, so a failure shows every row and not just the first
  const outcome = (opened, holidays) => {
    try {
      return `due ${responseDueAt(opened, 'urgent', holidays)}`;
    } catch (error) {
      return error instanceof RangeError && /opening time is not a date/i.test(error.message)
        ? 'refused: the opening time is not a date'
        : `${error.name}: ${error.message}`;
    }
  };
  const given = [];
  const wanted = [];
  for (const [row, opened] of refused) {
    for (const holidays of [undefined, ['2026-11-10']]) {
      const where = `${row}, ${holidays ? 'with holidays' : 'no holidays'}`;
      given.push(`${where}: ${outcome(opened, holidays)}`);
      wanted.push(`${where}: refused: the opening time is not a date`);
    }
  }
  assert.deepEqual(given, wanted);

  // Mon 16 Nov 2026, 10:00 UTC: due Mon 16 Nov, 14:00 UTC, as before this change
  assert.equal(responseDueAt(new Date('2026-11-16T10:00:00Z'), 'urgent').toISOString(), '2026-11-16T14:00:00.000Z');
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

  // An opening time that is not a date is refused, with no list and with an empty one
  for (const holidays of [undefined, null, []]) {
    assert.throws(() => responseDueAt(new Date('not a date'), 'urgent', holidays), RangeError);
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

test('an opening time is judged by what it is, not by what it claims to be', () => {
  // Something dressed as a Date is still refused with a RangeError, not a TypeError
  assert.throws(() => responseDueAt(Object.create(Date.prototype), 'urgent'), { name: 'RangeError', message: /opening time is not a date: an object/ });
  assert.throws(() => responseDueAt({}, 'urgent'), { name: 'RangeError', message: /opening time is not a date: an object/ });
  // A real Date made elsewhere (another realm) is a date: Mon 16 Nov 2026, 10:00 UTC, due 14:00 UTC
  const elsewhere = vm.runInNewContext("new Date('2026-11-16T10:00:00Z')");
  assert.equal(responseDueAt(elsewhere, 'urgent').toISOString(), '2026-11-16T14:00:00.000Z');
});

test('an opening time that is not a date, with holidays, is refused', () => {
  assert.throws(() => responseDueAt(new Date('not a date'), 'urgent', ['2026-11-10']), RangeError);
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

test('[response-deadline] Business hours left before a deadline', () => {
  // Each row as the spec writes it: due, public holidays, now, hours left. "none" is checked as no list, a
  // null one and an empty one.
  const rows = [
    ['Mon 16 Nov 2026, 14:00 UTC', '2026-11-16T14:00:00Z', 'none', null, 'Mon 16 Nov 2026, 10:00 UTC', '2026-11-16T10:00:00Z', 4],
    ['Mon 16 Nov 2026, 10:00 UTC', '2026-11-16T10:00:00Z', 'none', null, 'Fri 13 Nov 2026, 16:00 UTC', '2026-11-13T16:00:00Z', 2],
    ['Mon 28 Dec 2026, 11:00 UTC', '2026-12-28T11:00:00Z', 'Fri 25 Dec', ['2026-12-25'], 'Thu 24 Dec 2026, 15:00 UTC', '2026-12-24T15:00:00Z', 4],
    ['Mon 16 Nov 2026, 10:00 UTC', '2026-11-16T10:00:00Z', 'none', null, 'Sat 14 Nov 2026, 12:00 UTC', '2026-11-14T12:00:00Z', 1],
    ['Mon 16 Nov 2026, 10:30 UTC', '2026-11-16T10:30:00Z', 'none', null, 'Mon 16 Nov 2026, 10:00 UTC', '2026-11-16T10:00:00Z', 0.5],
    ['Mon 16 Nov 2026, 14:00 UTC', '2026-11-16T14:00:00Z', 'none', null, 'Mon 16 Nov 2026, 14:00 UTC', '2026-11-16T14:00:00Z', 0],
    ['Mon 16 Nov 2026, 14:00 UTC', '2026-11-16T14:00:00Z', 'none', null, 'Tue 17 Nov 2026, 09:00 UTC', '2026-11-17T09:00:00Z', 0],
  ];
  for (const [dueRow, due, holidaysRow, holidays, nowRow, now, hoursLeft] of rows) {
    const row = `due ${dueRow}, holidays ${holidaysRow}, now ${nowRow}`;
    const lists = holidays === null ? [undefined, null, []] : [holidays];
    for (const list of lists) {
      assert.equal(businessHoursLeft(new Date(now), new Date(due), list), hoursLeft, row);
    }
  }
});

test('business hours left are counted as the deadline was', () => {
  // For deadlines responseDueAt works out, the hours left at opening are the priority's hours
  const cases = [
    ['2026-11-13T16:00:00Z', 'urgent', undefined, 4],
    ['2026-11-14T11:00:00Z', 'high', undefined, 8],
    ['2026-11-09T15:00:00Z', 'normal', undefined, 24],
    ['2026-11-11T10:00:00Z', 'low', undefined, 40],
    ['2026-12-24T16:00:00Z', 'high', ['2026-12-25', '2026-12-28'], 8],
    ['2026-12-25T18:00:00Z', 'urgent', ['2026-12-25'], 4],
  ];
  for (const [openedAt, priority, holidays, hours] of cases) {
    const due = responseDueAt(new Date(openedAt), priority, holidays);
    assert.equal(businessHoursLeft(new Date(openedAt), due, holidays), hours, `${openedAt}, ${priority}`);
  }
});

test('the hours left skip evenings, weekends and holidays between now and a deadline outside opening hours', () => {
  // Friday 15:00 to a deadline on Saturday: only Friday's 2 hours count
  assert.equal(businessHoursLeft(new Date('2026-11-13T15:00:00Z'), new Date('2026-11-14T12:00:00Z')), 2);
  // Thursday 16:00 to Friday 12:00 when Friday is a holiday: only Thursday's hour counts
  assert.equal(businessHoursLeft(new Date('2026-12-24T16:00:00Z'), new Date('2026-12-25T12:00:00Z'), ['2026-12-25']), 1);
  // From Friday evening to a deadline on Sunday: none
  assert.equal(businessHoursLeft(new Date('2026-11-13T18:00:00Z'), new Date('2026-11-15T12:00:00Z')), 0);
});

test('the hours left refuse a holiday list as a deadline does, even past the deadline', () => {
  const now = new Date('2026-11-17T09:00:00Z');
  const due = new Date('2026-11-16T14:00:00Z');
  for (const holidays of ['2026-11-10', {}, ['2026-11-31'], ['10/11/2026'], [new Date('2026-11-10')]]) {
    assert.throws(() => businessHoursLeft(now, due, holidays), RangeError);
    assert.throws(() => businessHoursLeft(due, now, holidays), RangeError);
  }
});

test('[response-deadline] Hours left for a time that is not a date', () => {
  // Each refused row of the scenario's worked examples: the row as the spec writes it, the deadline, the
  // moment, and which of the two is refused. Each is checked with no holidays and with some.
  const due = new Date('2026-11-16T14:00:00Z');
  const now = new Date('2026-11-16T10:00:00Z');
  const refused = [
    ['due Mon 16 Nov 2026, 14:00 UTC, now a date that is not a real one (Invalid Date)', due, new Date('not a date'), 'moment'],
    ['due Mon 16 Nov 2026, 14:00 UTC, now nothing at all', due, undefined, 'moment'],
    ['due a date that is not a real one (Invalid Date), now Mon 16 Nov 2026, 10:00 UTC', new Date('not a date'), now, 'deadline'],
    ['due the text "2026-11-16T14:00:00Z", not a date, now Mon 16 Nov 2026, 10:00 UTC', '2026-11-16T14:00:00Z', now, 'deadline'],
    // Not rows of the examples, but named by the proposal: a number is not a date either
    ['due Mon 16 Nov 2026, 14:00 UTC, now a number', due, Date.UTC(2026, 10, 16, 10), 'moment'],
    ['due a number, now Mon 16 Nov 2026, 10:00 UTC', Date.UTC(2026, 10, 16, 14), now, 'deadline'],
  ];
  // What each row gives, side by side, so a failure shows every row and not just the first
  const outcome = (rowDue, rowNow, holidays) => {
    try {
      return `${businessHoursLeft(rowNow, rowDue, holidays)} hours left`;
    } catch (error) {
      const which = /^The (moment|deadline) is not a date: /.exec(error.message);
      return error instanceof RangeError && which
        ? `refused: the ${which[1]} is not a date`
        : `${error.name}: ${error.message}`;
    }
  };
  const given = [];
  const wanted = [];
  for (const [row, rowDue, rowNow, which] of refused) {
    for (const holidays of [undefined, ['2026-11-10']]) {
      const where = `${row}, ${holidays ? 'with holidays' : 'no holidays'}`;
      given.push(`${where}: ${outcome(rowDue, rowNow, holidays)}`);
      wanted.push(`${where}: refused: the ${which} is not a date`);
    }
  }
  assert.deepEqual(given, wanted);

  // due Mon 16 Nov 2026, 14:00 UTC, now Mon 16 Nov 2026, 10:00 UTC: 4 hours left, as before this change
  assert.equal(businessHoursLeft(now, due), 4);
});

test('the moment and the deadline are judged by what they are, as an opening time is', () => {
  const now = new Date('2026-11-16T10:00:00Z');
  const due = new Date('2026-11-16T14:00:00Z');
  // An object dressed as a Date is refused, naming which of the two it was
  assert.throws(() => businessHoursLeft(Object.create(Date.prototype), due), { name: 'RangeError', message: /^The moment is not a date: an object$/ });
  assert.throws(() => businessHoursLeft(now, {}), { name: 'RangeError', message: /^The deadline is not a date: an object$/ });
  assert.throws(() => businessHoursLeft(now, null), { name: 'RangeError', message: /^The deadline is not a date: null$/ });
  // A Date from another realm is a Date
  const foreign = (iso) => vm.runInNewContext(`new Date('${iso}')`);
  assert.equal(businessHoursLeft(foreign('2026-11-16T10:00:00Z'), foreign('2026-11-16T14:00:00Z')), 4);
  // Past the deadline, a moment that is not a date is still refused, not answered with 0
  assert.throws(() => businessHoursLeft(new Date('not a date'), new Date('2026-11-01T00:00:00Z')), { name: 'RangeError', message: /^The moment is not a date: Invalid Date$/ });
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
