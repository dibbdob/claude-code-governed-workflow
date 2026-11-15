# Spec Delta

## ADDED Requirements

### Requirement: Whether a ticket is overdue

The desk SHALL be able to ask whether a ticket is overdue, given its deadline and the moment now, and be
answered yes or no. A ticket is overdue only when the moment now is after its deadline; at the deadline it
is not yet overdue. The answer compares the two moments as they are: weekends and holidays do not change it.

#### Scenario: Whether a ticket is overdue

- **GIVEN** a ticket due at `<due>`
- **WHEN** it is looked at at `<now>`
- **THEN** the answer to whether it is overdue is `<overdue>`

| due | now | overdue |
|---|---|---|
| Mon 16 Nov 2026, 14:00 UTC | Mon 16 Nov 2026, 10:00 UTC | no |
| Mon 16 Nov 2026, 14:00 UTC | Mon 16 Nov 2026, 14:00 UTC | no |
| Mon 16 Nov 2026, 14:00 UTC | Mon 16 Nov 2026, 14:01 UTC | yes |
| Fri 13 Nov 2026, 16:00 UTC | Sat 14 Nov 2026, 12:00 UTC | yes |
| Thu 24 Dec 2026, 16:00 UTC | Fri 25 Dec 2026, 10:00 UTC (Fri 25 Dec is a public holiday) | yes |

#### Scenario: Overdue for a time that is not a date

- **GIVEN** a ticket due at `<due>`
- **WHEN** it is looked at at `<now>`
- **THEN** the answer is `<answer>`

| due | now | answer |
|---|---|---|
| Mon 16 Nov 2026, 14:00 UTC | a date that is not a real one (Invalid Date) | refused: the moment is not a date |
| a date that is not a real one (Invalid Date) | Mon 16 Nov 2026, 10:00 UTC | refused: the deadline is not a date |
