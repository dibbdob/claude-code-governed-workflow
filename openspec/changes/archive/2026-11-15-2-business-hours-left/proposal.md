# Proposal

## Why

Issue #2. A person on the desk looking at an open ticket wants to know how long they have left to answer it,
in the hours that count. Today they get the deadline as a moment, and have to work out for themselves how
many business hours lie between now and then, across evenings, weekends and holidays.

## What Changes

- New: the business hours left until a ticket's deadline, given the moment now, the deadline and the desk's
  public holidays. Only business hours count, by the same rules a deadline is counted by.
- A ticket at or past its deadline has no hours left: zero, never a negative number.
- Nothing about how a deadline itself is worked out changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `response-deadline`: adds the requirement that the business hours left before a deadline can be asked
  for, counted as a deadline is.

## Impact

A new exported function in `src/sla.js`, with tests and a doc comment. No existing function changes. The two
C# services are not affected; they can adopt it later through the shared examples if they need it.

## Risk

Low. Nothing that exists changes. If the count is wrong, a person on the desk would see the wrong number of
hours left on a ticket, while its deadline, which is what the desk is held to, stays right.
