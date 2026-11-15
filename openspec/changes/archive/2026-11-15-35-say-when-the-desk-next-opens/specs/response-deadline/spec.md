## ADDED Requirements

### Requirement: When the desk next opens

The desk SHALL be able to say when it next opens after a given moment: that moment itself if the desk is
open then, otherwise the next 09:00 UTC on a business day, Monday to Friday, that is not one of the public
holidays given.

#### Scenario: When the desk next opens

- **GIVEN** the public holidays `<public holidays>`
- **WHEN** a customer writes in at `<moment>`
- **THEN** the desk next opens at `<next open>`

| moment | public holidays | next open |
|---|---|---|
| Fri 13 Nov 2026, 17:30 UTC | none | Mon 16 Nov, 09:00 UTC |
| Mon 16 Nov 2026, 07:00 UTC | none | Mon 16 Nov, 09:00 UTC |
| Mon 16 Nov 2026, 10:00 UTC | none | Mon 16 Nov, 10:00 UTC |
| Mon 16 Nov 2026, 17:00 UTC | none | Tue 17 Nov, 09:00 UTC |
| Thu 24 Dec 2026, 17:30 UTC | Fri 25 Dec | Mon 28 Dec, 09:00 UTC |

#### Scenario: When the desk next opens, for a moment that is not a date

- **GIVEN** a customer writes in at `<moment>`
- **WHEN** the desk is asked when it next opens
- **THEN** the answer is `<answer>`

| moment | answer |
|---|---|
| a date that is not a real one (Invalid Date) | refused: the moment is not a date |
| nothing at all | refused: the moment is not a date |
