## MODIFIED Requirements

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
