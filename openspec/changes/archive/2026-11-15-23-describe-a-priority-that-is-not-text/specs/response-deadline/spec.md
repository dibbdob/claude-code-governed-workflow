# Spec Delta

## ADDED Requirements

### Requirement: A priority that is not text is refused and described

A deadline asked for with a priority that is not text SHALL be refused like any other unknown priority, and
the refusal SHALL describe what was given rather than fail while refusing it.

#### Scenario: A priority that is not text

- **GIVEN** a ticket opened on Mon 16 Nov 2026 at 10:00 UTC with priority `<priority>`
- **WHEN** its reply deadline is worked out
- **THEN** the answer is `<answer>`

| priority | answer |
|---|---|
| a symbol | refused, naming it as a symbol and the known priorities urgent, high, normal, low |
| an object | refused, naming it as an object and the known priorities urgent, high, normal, low |
| the number 42 | refused, naming it as a number and the known priorities urgent, high, normal, low |
| the text whenever | refused, naming whenever and the known priorities, exactly as before this change |
| urgent | due Mon 16 Nov, 14:00 UTC, as before this change |
