# 0001 Response deadline

Status: done

## Why

A customer is promised a first response within a number of business hours that depends on how urgent
their ticket is. Agents need the deadline as a moment in time, not as a number of hours.

## Acceptance criteria

<!-- criteria high-water: 5 -->

- **0001-AC-1** Given an outage reported on the enterprise plan, when its priority is decided, then it is urgent.
- **0001-AC-2** Given an outage on any other plan, when its priority is decided, then it is high.
- **0001-AC-3** Given a ticket opened during business hours, when its deadline is computed, then only business hours
  count towards it.
- **0001-AC-4** Given a ticket opened late on a Friday, when its deadline is computed, then the weekend does not count.
- **0001-AC-5** Given a priority the desk does not know, when a deadline is asked for, then it is refused.
