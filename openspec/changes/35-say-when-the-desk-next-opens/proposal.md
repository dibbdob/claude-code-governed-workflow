# Proposal

## In plain terms

When a customer writes in, the desk can say when it next opens after that moment, so an out-of-hours
customer can be told when someone will be there to read their message. Weekends and the public holidays
the desk lists count as closed, as they do for a deadline.

## Why

Issue #35. The desk tells out-of-hours customers when it will next be open, and works that out by hand
from the business hours and the holidays today.

## What Changes

- New: when the desk next opens after a given moment, taking the public holidays given into account.
- A moment that is not a date is refused, as the other answers refuse it.
- Nothing about how a deadline is worked out, or how the hours left are counted, changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `response-deadline`: adds the requirement that the desk can say when it next opens after a moment.

## Impact

A new exported function in `src/sla.js`, with tests and a doc comment. No existing function changes, and
the shared examples in `test/fixtures/desk-rules.json` do not change, so the C# copies stay as they are.

## Risk

Low. Nothing that exists changes. If the answer is wrong, a customer is told the wrong time the desk opens,
while their deadline, which is what the desk is held to, stays right.
