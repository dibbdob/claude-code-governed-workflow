# 0001 Response deadline

Status: done

## Why

A customer is promised a first response within a number of business hours that depends on how urgent
their ticket is. Agents need the deadline as a moment in time, not as a number of hours.

## Acceptance criteria

- Given an outage reported on the enterprise plan, when its priority is decided, then it is urgent.
- Given an outage on any other plan, when its priority is decided, then it is high.
- Given a ticket opened during business hours, when its deadline is computed, then only business hours
  count towards it.
- Given a ticket opened late on a Friday, when its deadline is computed, then the weekend does not count.
- Given a priority the desk does not know, when a deadline is asked for, then it is refused.
