# response-deadline Specification

## Purpose

A customer is promised a first response within a number of business hours that depends on how urgent
their ticket is. Agents need the deadline as a moment in time, not as a number of hours.

## Requirements

### Requirement: Priority follows what the customer reported

The desk SHALL decide a ticket's priority from what the customer reported, so that an outage is never
treated as routine.

#### Scenario: An outage on the enterprise plan is urgent

- **WHEN** an outage is reported on the enterprise plan and its priority is decided
- **THEN** the priority is urgent

#### Scenario: An outage on any other plan is high

- **WHEN** an outage is reported on any plan other than enterprise and its priority is decided
- **THEN** the priority is high

### Requirement: Deadlines count business hours only

A response deadline SHALL be counted in business hours, Monday to Friday, 09:00 to 17:00 UTC.

#### Scenario: A ticket opened during business hours

- **WHEN** a ticket is opened during business hours and its deadline is computed
- **THEN** only business hours count towards the deadline

#### Scenario: A ticket opened late on a Friday

- **WHEN** a ticket is opened late on a Friday and its deadline is computed
- **THEN** the weekend does not count towards the deadline

### Requirement: An unknown priority is refused

A deadline SHALL NOT be computed for a priority the desk does not know.

#### Scenario: A priority the desk does not know

- **WHEN** a deadline is asked for with a priority the desk does not know
- **THEN** the request is refused

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
