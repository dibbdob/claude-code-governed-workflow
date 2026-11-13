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
 * Decide a ticket's priority from what the customer reported.
 * @param {{ outage?: boolean, plan?: string, category?: string }} ticket
 * @returns {'urgent' | 'high' | 'normal' | 'low'}
 */
export function priorityOf(ticket) {
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
 * @param {Date} openedAt
 * @param {keyof typeof RESPONSE_HOURS} priority
 * @param {string[] | null} [holidays] public holidays as UTC dates, `YYYY-MM-DD`; each is skipped as a
 *   whole UTC day. With no list, none are skipped. A list that is not one, or holds anything but a real
 *   `YYYY-MM-DD` date, is refused with a RangeError.
 * @returns {Date}
 */
export function responseDueAt(openedAt, priority, holidays) {
  const hours = RESPONSE_HOURS[priority];
  if (hours === undefined) {
    throw new RangeError(`Unknown priority: ${priority}`);
  }

  const closed = holidaySet(holidays);
  const isBusinessDay = (date) => isWeekday(date) && !closed.has(utcDate(date));

  let remaining = hours * HOUR_MS;
  let now = nextOpening(new Date(openedAt.getTime()), isBusinessDay);

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
    const real = typeof holiday === 'string' && utcDate(new Date(`${holiday}T00:00:00Z`)) === holiday;
    if (!real) {
      throw new RangeError(`Not a YYYY-MM-DD holiday: ${holiday}`);
    }
  }
  return new Set(holidays);
}

// The UTC calendar date of a moment, as `YYYY-MM-DD`. Unlike toISOString, it does not throw on an
// invalid date.
function utcDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
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
