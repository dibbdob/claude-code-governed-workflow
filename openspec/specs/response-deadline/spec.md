# response-deadline Specification

## Purpose

A customer is promised a first response within a number of business hours that depends on how urgent
their ticket is. Agents need the deadline as a moment in time, not as a number of hours.

## Requirements

### Requirement: Priority follows what the customer reported

The desk SHALL decide a ticket's priority from what the customer reported, so that an outage is never
treated as routine, and a security problem is urgent whatever the customer's plan.

#### Scenario: An outage on the enterprise plan is urgent

- **GIVEN** a customer on the enterprise plan reports an outage, opened at `<opened>`
- **WHEN** its priority is decided and its reply deadline worked out
- **THEN** the priority is urgent, and the reply is due at `<reply due>`

| opened | reply due |
|---|---|
| Wed 11 Nov 2026, 10:00 UTC | Wed 11 Nov, 14:00 UTC |

#### Scenario: An outage on any other plan is high

- **GIVEN** a customer on `<plan>` reports an outage that is not a security problem, opened at `<opened>`
- **WHEN** its priority is decided and its reply deadline worked out
- **THEN** the priority is high, and the reply is due at `<reply due>`

| plan | opened | reply due |
|---|---|---|
| the starter plan | Wed 11 Nov 2026, 10:00 UTC | Thu 12 Nov, 10:00 UTC |
| no plan recorded | Fri 13 Nov 2026, 16:00 UTC | Mon 16 Nov, 16:00 UTC |

#### Scenario: A security report is urgent whatever the plan

- **GIVEN** a customer on `<plan>` reports a security problem: `<what they report>`
- **AND** the ticket is opened at `<opened>`
- **WHEN** its priority is decided and its reply deadline worked out
- **THEN** the priority is urgent, and the reply is due at `<reply due>`

| plan | what they report | opened | reply due |
|---|---|---|---|
| the starter plan | a leaked password | Wed 11 Nov 2026, 10:00 UTC | Wed 11 Nov, 14:00 UTC |
| the enterprise plan | someone else's data on their screen | Wed 11 Nov 2026, 16:30 UTC | Thu 12 Nov, 12:30 UTC |
| no plan recorded | a login they did not make | Fri 13 Nov 2026, 16:00 UTC | Mon 16 Nov, 12:00 UTC |

#### Scenario: A security report that is also an outage is urgent

- **GIVEN** a customer on `<plan>` reports an outage that is also a security problem, opened at `<opened>`
- **WHEN** its priority is decided and its reply deadline worked out
- **THEN** the priority is urgent, not high, and the reply is due at `<reply due>`

| plan | opened | reply due |
|---|---|---|
| the starter plan | Wed 11 Nov 2026, 10:00 UTC | Wed 11 Nov, 14:00 UTC |
| the enterprise plan | Fri 13 Nov 2026, 16:00 UTC | Mon 16 Nov, 12:00 UTC |

#### Scenario: A ticket that is not a security report keeps its priority

- **GIVEN** a customer on `<plan>` reports `<what they report>`, which is not a security problem
- **AND** the ticket is opened at `<opened>`
- **WHEN** its priority is decided and its reply deadline worked out
- **THEN** the priority is `<priority>`, as it was before this change, and the reply is due at `<reply due>`

| plan | what they report | opened | priority | reply due |
|---|---|---|---|---|
| the enterprise plan | a billing problem | Fri 13 Nov 2026, 16:00 UTC | normal (24 hours) | Wed 18 Nov, 16:00 UTC |
| the starter plan | a question | Wed 11 Nov 2026, 10:00 UTC | low (40 hours) | Wed 18 Nov, 10:00 UTC |
| the starter plan | a problem of no recorded kind | Wed 11 Nov 2026, 10:00 UTC | normal (24 hours) | Mon 16 Nov, 10:00 UTC |

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
