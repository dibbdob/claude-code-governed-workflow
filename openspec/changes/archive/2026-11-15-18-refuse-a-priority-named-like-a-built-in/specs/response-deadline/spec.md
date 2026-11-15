# Spec Delta

## ADDED Requirements

### Requirement: A priority named like a built-in property is refused

A deadline SHALL NOT be computed for a priority that is not one of the desk's own, even when its name is one
every object has; it is refused like any other priority the desk does not know.

#### Scenario: A priority named like a built-in property

- **GIVEN** a ticket opened on Mon 16 Nov 2026 at 10:00 UTC with priority `<priority>`
- **WHEN** its reply deadline is worked out
- **THEN** the answer is `<answer>`

| priority | answer |
|---|---|
| toString | refused, naming toString and the known priorities urgent, high, normal, low |
| constructor | refused, naming constructor and the known priorities urgent, high, normal, low |
| __proto__ | refused, naming __proto__ and the known priorities urgent, high, normal, low |
| hasOwnProperty | refused, naming hasOwnProperty and the known priorities urgent, high, normal, low |
| low | due Mon 23 Nov, 10:00 UTC, as before this change |
