## ADDED Requirements

### Requirement: Public holidays are not business hours

Given a list of public holidays, a response deadline SHALL skip each of them as a whole day, as it skips
a weekend.

#### Scenario: A deadline that runs into a public holiday

- **GIVEN** a ticket opened at `<opened>` with priority `<priority>`
- **AND** the public holidays `<public holidays>`
- **WHEN** its reply deadline is worked out
- **THEN** each holiday is skipped as a weekend is, and the reply is due at `<reply due>`

| opened | priority | public holidays | reply due |
|---|---|---|---|
| Thu 24 Dec 2026, 15:00 UTC | urgent (4 hours) | Fri 25 Dec | Mon 28 Dec, 11:00 UTC |
| Wed 23 Dec 2026, 09:00 UTC | normal (24 hours) | Fri 25 Dec | Mon 28 Dec, 17:00 UTC |
| Thu 24 Dec 2026, 16:00 UTC | high (8 hours) | Fri 25 Dec and Mon 28 Dec | Tue 29 Dec, 16:00 UTC |

#### Scenario: A ticket opened on a public holiday

- **GIVEN** a ticket opened at `<opened>`, on a public holiday, with priority `<priority>`
- **AND** the public holidays `<public holidays>`
- **WHEN** its reply deadline is worked out
- **THEN** counting starts at 09:00 on the next business day, and the reply is due at `<reply due>`

| opened | priority | public holidays | reply due |
|---|---|---|---|
| Fri 25 Dec 2026, 10:00 UTC | urgent (4 hours) | Fri 25 Dec | Mon 28 Dec, 13:00 UTC |
| Fri 25 Dec 2026, 07:30 UTC | high (8 hours) | Fri 25 Dec | Mon 28 Dec, 17:00 UTC |

#### Scenario: No list of holidays

- **GIVEN** a ticket opened at `<opened>` with priority `<priority>`
- **AND** no list of public holidays
- **WHEN** its reply deadline is worked out
- **THEN** the reply is due at `<reply due>`, as it was before this change

| opened | priority | reply due |
|---|---|---|
| Thu 24 Dec 2026, 15:00 UTC | urgent (4 hours) | Fri 25 Dec, 11:00 UTC |
