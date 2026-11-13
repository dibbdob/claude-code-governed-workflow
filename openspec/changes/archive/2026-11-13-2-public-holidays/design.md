# Design

## Context

Deadlines are counted in business hours, Monday to Friday, 09:00 to 17:00 UTC (see the main spec
`response-deadline`). This change adds public holidays as days that do not count. See proposal.md for why.

## Goals / Non-Goals

**Goals:**
- Skip each listed public holiday as a whole day, the way a weekend is skipped.

**Non-Goals:**
- Where the list of holidays comes from, or holidays that differ by country.

## Decisions

- Holidays are given as dates (`YYYY-MM-DD`) and read in UTC, like every other date in the rules. A
  holiday is the whole UTC day.
- The list is optional. Without it, the deadline is computed exactly as before.

## Risks / Trade-offs

- [A holiday read in local time lands on the wrong day] → Read holiday dates in UTC only; the build's
  existing check already refuses local-time date methods in `src/`, and a test opens a ticket at 16:00 UTC
  on the day before a holiday.
- [Callers that pass no holidays see different deadlines] → The "No list of holidays" scenario's test
  compares deadlines with and without an empty list, for the cases the existing tests already cover.
