# Spec Delta

## ADDED Requirements

### Requirement: A refused priority names the ones the desk knows

When a deadline is refused for a priority the desk does not know, the refusal SHALL name the priority that
was given and the priorities the desk does know, from most to least urgent.

#### Scenario: Refusing a priority the desk does not know

- **GIVEN** a ticket opened on Mon 16 Nov 2026 at 10:00 UTC with priority `<priority>`
- **WHEN** its reply deadline is worked out
- **THEN** the answer is `<answer>`

| priority | answer |
|---|---|
| whenever | refused, naming whenever and the known priorities urgent, high, normal, low |
| Urgent | refused, naming Urgent and the known priorities urgent, high, normal, low |
| urgent | due Mon 16 Nov, 14:00 UTC, as before this change |
