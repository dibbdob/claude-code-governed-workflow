## ADDED Requirements

### Requirement: Public holidays are not business hours

Given a list of public holidays, a response deadline SHALL skip each of them as a whole day, as it skips
a weekend.

#### Scenario: A deadline that runs into a public holiday

- **WHEN** a deadline is computed with a list of public holidays and it runs into one of them
- **THEN** that whole day is skipped as though it were a weekend

#### Scenario: A ticket opened on a public holiday

- **WHEN** a ticket is opened on a public holiday and its deadline is computed
- **THEN** counting starts at 09:00 on the next business day

#### Scenario: No list of holidays

- **WHEN** a deadline is computed with no list of holidays
- **THEN** it is the same as before this change
