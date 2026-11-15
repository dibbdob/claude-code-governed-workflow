# Spec Delta

## ADDED Requirements

### Requirement: The business hours left before a deadline

The desk SHALL be able to ask how many business hours are left between a given moment and a ticket's
deadline, counting only business hours and skipping the public holidays given, as a deadline is counted.
A ticket at or past its deadline SHALL have none left.

#### Scenario: Business hours left before a deadline

- **GIVEN** a ticket due at `<due>`
- **AND** the public holidays `<public holidays>`
- **WHEN** it is looked at at `<now>`
- **THEN** it has `<hours left>` business hours left

| due | public holidays | now | hours left |
|---|---|---|---|
| Mon 16 Nov 2026, 14:00 UTC | none | Mon 16 Nov 2026, 10:00 UTC | 4 |
| Mon 16 Nov 2026, 10:00 UTC | none | Fri 13 Nov 2026, 16:00 UTC | 2 |
| Mon 28 Dec 2026, 11:00 UTC | Fri 25 Dec | Thu 24 Dec 2026, 15:00 UTC | 4 |
| Mon 16 Nov 2026, 10:00 UTC | none | Sat 14 Nov 2026, 12:00 UTC | 1 |
| Mon 16 Nov 2026, 10:30 UTC | none | Mon 16 Nov 2026, 10:00 UTC | 0.5 |
| Mon 16 Nov 2026, 14:00 UTC | none | Mon 16 Nov 2026, 14:00 UTC | 0 |
| Mon 16 Nov 2026, 14:00 UTC | none | Tue 17 Nov 2026, 09:00 UTC | 0 |
