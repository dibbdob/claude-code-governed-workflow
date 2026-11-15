// Ticketdesk: the rules that decide how urgent a support ticket is and when it must be answered by.
//
// Business hours are Monday to Friday, 09:00 to 17:00 UTC, except on the public holidays a caller lists.
// A response target is counted in business hours, so a ticket opened at 16:00 on a Friday with four hours
// to run is due at 12:00 on Monday.

export const RESPONSE_HOURS = Object.freeze({ urgent: 4, high: 8, normal: 24, low: 40 });

const OPEN_HOUR = 9;
const CLOSE_HOUR = 17;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Decide a ticket's priority from what the customer reported. A security report, category `security`, is
 * urgent on every plan, with no plan recorded, and when it is also an outage. Otherwise an outage is urgent
 * on the enterprise plan and high on any other. A `billing` ticket is normal, a `question` low, and any other
 * ticket normal. Categories are matched exactly, so `Security` is not a security report.
 * @param {{ outage?: boolean, plan?: string, category?: string }} ticket
 * @returns {'urgent' | 'high' | 'normal' | 'low'}
 */
export function priorityOf(ticket) {
  if (ticket.category === 'security') {
    return 'urgent';
  }
  if (ticket.outage) {
    return ticket.plan === 'enterprise' ? 'urgent' : 'high';
  }
  if (ticket.category === 'billing') {
    return 'normal';
  }
  if (ticket.category === 'question') {
    return 'low';
  }
  return 'normal';
}

/**
 * The moment a ticket's first response is due, counting business hours only.
 * @param {Date} openedAt when the ticket was opened. Anything but a valid `Date` (an Invalid Date, text, a
 *   number, nothing) is refused with a RangeError saying the opening time is not a date.
 * @param {keyof typeof RESPONSE_HOURS} priority
 * @param {string[] | null} [holidays] public holidays as UTC dates, `YYYY-MM-DD`; each is skipped as a
 *   whole UTC day. With no list, none are skipped. A list that is not one, or holds anything but a real
 *   `YYYY-MM-DD` date, is refused with a RangeError.
 * @returns {Date}
 */
export function responseDueAt(openedAt, priority, holidays) {
  const opened = timeOf(openedAt);
  if (Number.isNaN(opened)) {
    throw new RangeError(`The opening time is not a date: ${describe(openedAt)}`);
  }

  const hours = RESPONSE_HOURS[priority];
  if (hours === undefined) {
    throw new RangeError(`Unknown priority: ${priority}`);
  }

  const closed = holidaySet(holidays);
  const isBusinessDay = (date) => isWeekday(date) && !closed.has(utcDate(date));

  let remaining = hours * HOUR_MS;
  let now = nextOpening(new Date(opened), isBusinessDay);

  while (remaining > 0) {
    const close = new Date(now);
    close.setUTCHours(CLOSE_HOUR, 0, 0, 0);
    const spend = Math.min(remaining, close.getTime() - now.getTime());
    now = new Date(now.getTime() + spend);
    remaining -= spend;
    if (remaining > 0) {
      now = nextOpening(now, isBusinessDay);
    }
  }

  return now;
}

/**
 * The business hours left between a moment and a ticket's deadline, counted as a deadline is: only Monday to
 * Friday, 09:00 to 17:00 UTC, on days that are not a public holiday given. Parts of an hour count, so half an
 * hour left is 0.5. At or past the deadline there are none left: 0, never less.
 * @param {Date} now the moment to count from. Anything but a valid `Date` (an Invalid Date, text, a number,
 *   nothing) is refused with a RangeError saying the moment is not a date, as `responseDueAt` refuses an
 *   opening time.
 * @param {Date} due the deadline, as `responseDueAt` gives it. Anything but a valid `Date` is refused in the
 *   same way, with a RangeError saying the deadline is not a date.
 * @param {string[] | null} [holidays] public holidays, as `responseDueAt` takes them, refused as it refuses
 *   them with a RangeError
 * @returns {number} hours
 */
export function businessHoursLeft(now, due, holidays) {
  const start = timeOf(now);
  if (Number.isNaN(start)) {
    throw new RangeError(`The moment is not a date: ${describe(now)}`);
  }
  const end = timeOf(due);
  if (Number.isNaN(end)) {
    throw new RangeError(`The deadline is not a date: ${describe(due)}`);
  }

  const closed = holidaySet(holidays);
  const isBusinessDay = (date) => isWeekday(date) && !closed.has(utcDate(date));

  let left = 0;
  let open = nextOpening(new Date(start), isBusinessDay);
  while (open.getTime() < end) {
    const close = new Date(open);
    close.setUTCHours(CLOSE_HOUR, 0, 0, 0);
    left += Math.min(close.getTime(), end) - open.getTime();
    open = nextOpening(close, isBusinessDay);
  }
  return left / HOUR_MS;
}

// The moment a Date holds, or NaN for anything that is not one. It asks the value itself rather than its
// prototype, so a Date from another realm counts and an object dressed as one does not.
function timeOf(value) {
  try {
    return Date.prototype.getTime.call(value);
  } catch {
    return NaN;
  }
}

// What a caller passed that is not a date, for an error message: never throws, whatever it was given.
function describe(value) {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (value === undefined || value === null) {
    return String(value);
  }
  try {
    Date.prototype.getTime.call(value);
    return 'Invalid Date'; // a real Date, so an invalid one
  } catch {
    const type = typeof value;
    return `${/^[aeiou]/.test(type) ? 'an' : 'a'} ${type}`;
  }
}

// No list (undefined or null) means no holidays. A holiday that is not a real date written exactly as
// `YYYY-MM-DD` would never match a day, so it is refused rather than ignored.
function holidaySet(holidays) {
  if (holidays === undefined || holidays === null) {
    return new Set();
  }
  if (!Array.isArray(holidays)) {
    throw new RangeError('Holidays must be a list of YYYY-MM-DD dates');
  }
  for (const holiday of holidays) {
    const real =
      typeof holiday === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(holiday) &&
      utcDate(new Date(`${holiday}T00:00:00Z`)) === holiday;
    if (!real) {
      const shown = typeof holiday === 'string' ? holiday : `a ${typeof holiday}`;
      throw new RangeError(`Not a YYYY-MM-DD holiday: ${shown}`);
    }
  }
  return new Set(holidays);
}

// The UTC calendar date of a moment, as `YYYY-MM-DD`. Unlike toISOString, it does not throw on an
// invalid date.
function utcDate(date) {
  const pad = (n, width = 2) => String(n).padStart(width, '0');
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function isWeekday(date) {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6;
}

// The given moment if the desk is open then, otherwise the next 09:00 on a business day.
function nextOpening(date, isBusinessDay) {
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  if (isBusinessDay(date) && hour >= OPEN_HOUR && hour < CLOSE_HOUR) {
    return date;
  }

  const next = new Date(date);
  if (hour >= CLOSE_HOUR || !isBusinessDay(date)) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  next.setUTCHours(OPEN_HOUR, 0, 0, 0);
  while (!isBusinessDay(next)) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}
