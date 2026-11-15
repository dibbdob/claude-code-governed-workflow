# Proposal

## Why

This fixes a defect, issue #23. Refusing a priority that is not text goes wrong: a symbol makes the refusal
itself fail with a `TypeError` that says nothing about priorities, and an object is named `[object Object]`.

## What Changes

- A priority that is not text is refused with the same `RangeError` as any other unknown priority, naming
  what was given the way a bad opening time is already named: `a symbol`, `an object`, `a number`.
- A text priority, known or not, is named exactly as now, and every deadline stays the same.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `response-deadline`: adds the requirement that a priority which is not text is refused and described.

## Impact

The refusal in `responseDueAt` in `src/sla.js`, and its tests. The C# services take a typed priority and are
not affected.

## Risk

Low. Only how a refused priority that is not text is named changes; nothing accepted is refused, and no
deadline moves.
