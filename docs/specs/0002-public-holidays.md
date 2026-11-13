# 0002 Public holidays do not count

Status: ready

## Why

The desk is closed on public holidays, but the deadline rules count them as business hours, so a ticket
opened before a holiday is shown as overdue when nobody could have answered it.

## Acceptance criteria

- Given a list of public holidays, when a deadline runs into one of them, then that whole day is skipped
  as though it were a weekend.
- Given a ticket opened on a public holiday, when its deadline is computed, then counting starts at 09:00
  on the next business day.
- Given no list of holidays, when a deadline is computed, then it is the same as before this change.
