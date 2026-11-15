# Spec Delta

## ADDED Requirements

### Requirement: The hours left are refused for a time that is not a date

The business hours left SHALL NOT be counted from a moment or to a deadline that is not a valid date; the
request is refused and says which of the two is the problem.

#### Scenario: Hours left for a time that is not a date

- **GIVEN** a ticket due at `<due>`
- **WHEN** it is looked at at `<now>`
- **THEN** the answer is `<answer>`

| due | now | answer |
|---|---|---|
| Mon 16 Nov 2026, 14:00 UTC | a date that is not a real one (Invalid Date) | refused: the moment is not a date |
| Mon 16 Nov 2026, 14:00 UTC | nothing at all | refused: the moment is not a date |
| a date that is not a real one (Invalid Date) | Mon 16 Nov 2026, 10:00 UTC | refused: the deadline is not a date |
| the text "2026-11-16T14:00:00Z", not a date | Mon 16 Nov 2026, 10:00 UTC | refused: the deadline is not a date |
| Mon 16 Nov 2026, 14:00 UTC | Mon 16 Nov 2026, 10:00 UTC | 4 hours left, as before this change |
