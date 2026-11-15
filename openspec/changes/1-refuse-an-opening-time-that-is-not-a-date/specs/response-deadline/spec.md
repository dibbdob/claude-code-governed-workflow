# Spec Delta

## ADDED Requirements

### Requirement: An opening time that is not a date is refused

A response deadline SHALL NOT be computed from an opening time that is not a valid date; the request is
refused and says that the opening time is the problem.

#### Scenario: An opening time that is not a date

- **GIVEN** a ticket whose opening time is `<opened>`, with priority urgent
- **WHEN** its reply deadline is worked out
- **THEN** the answer is `<answer>`

| opened | answer |
|---|---|
| a date that is not a real one (Invalid Date) | refused: the opening time is not a date |
| the text "2026-11-16T10:00:00Z", not a date | refused: the opening time is not a date |
| nothing at all | refused: the opening time is not a date |
| Mon 16 Nov 2026, 10:00 UTC | due Mon 16 Nov, 14:00 UTC, as before this change |
