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
