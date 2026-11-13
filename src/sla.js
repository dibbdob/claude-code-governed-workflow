// Ticketdesk: the rules that decide how urgent a support ticket is and when it must be answered by.
//
// Business hours are Monday to Friday, 09:00 to 17:00 UTC. A response target is counted in business
// hours, so a ticket opened at 16:00 on a Friday with four hours to run is due at 12:00 on Monday.

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
 * @returns {Date}
 */
export function responseDueAt(openedAt, priority) {
  const hours = RESPONSE_HOURS[priority];
  if (hours === undefined) {
    throw new RangeError(`Unknown priority: ${priority}`);
  }

  let remaining = hours * HOUR_MS;
  let now = nextOpening(new Date(openedAt.getTime()));

  while (remaining > 0) {
    const close = new Date(now);
    close.setUTCHours(CLOSE_HOUR, 0, 0, 0);
    const spend = Math.min(remaining, close.getTime() - now.getTime());
    now = new Date(now.getTime() + spend);
    remaining -= spend;
    if (remaining > 0) {
      now = nextOpening(now);
    }
  }

  return now;
}

function isWeekday(date) {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6;
}

// The given moment if the desk is open then, otherwise the next 09:00 on a weekday.
function nextOpening(date) {
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  if (isWeekday(date) && hour >= OPEN_HOUR && hour < CLOSE_HOUR) {
    return date;
  }

  const next = new Date(date);
  if (hour >= CLOSE_HOUR || !isWeekday(date)) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  next.setUTCHours(OPEN_HOUR, 0, 0, 0);
  while (!isWeekday(next)) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}
