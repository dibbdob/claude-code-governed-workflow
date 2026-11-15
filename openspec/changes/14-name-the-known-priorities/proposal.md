# Proposal

## Why

Issue #14. A deadline asked for with a priority the desk does not know is refused with
`Unknown priority: whenever`, and whoever made the mistake has to go and find out which priorities exist.

## What Changes

- The refusal of an unknown priority also names the priorities the desk knows, from most to least urgent:
  urgent, high, normal, low.
- Which priorities are refused, and every deadline, stay as they are.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `response-deadline`: adds the requirement that refusing an unknown priority names the known ones.

## Impact

The error message in `responseDueAt` in `src/sla.js`, and its tests. The two C# services have their own
implementations and are not affected.

## Risk

Low. Only the text of an error changes; nothing that is accepted or refused changes, and no deadline moves.
