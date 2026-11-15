# Proposal

## Why

This fixes a defect, issue #18. A priority named like a property every JavaScript object has, such as
`toString`, `constructor`, `__proto__` or `hasOwnProperty`, is not refused. Its deadline comes back as the
moment the ticket was opened, so the ticket has no time at all to be answered, and nothing says why.

## What Changes

- A priority is known only if it is one of the desk's own four: urgent, high, normal and low. Any other
  name, including one an object inherits, is refused with the message that names the known priorities.
- The four real priorities give exactly the deadlines they give now.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `response-deadline`: adds the requirement that a priority named like a built-in property is refused
  like any other unknown one.

## Impact

How `responseDueAt` in `src/sla.js` looks a priority up, and its tests. The C# services look priorities up
in their own way and are not affected.

## Risk

Low. Nothing that the desk uses changes; only names that already gave a wrong deadline are now refused.
