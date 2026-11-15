# Proposal

## In plain terms

Someone on the desk looking at a ticket can see straight away whether it is already past its response
deadline: a plain yes or no, without working it out from the deadline and the time now. A ticket is overdue
only once its deadline has passed; at the very moment of the deadline it is not yet overdue.

## Why

Issue #29. A person on the desk wants to know at a glance whether a ticket is overdue. Today they get the
deadline as a moment and have to compare it with the time now themselves.

## What Changes

- New: whether a ticket is overdue, given its deadline and the moment now. The answer is yes or no.
- Overdue is a plain comparison of moments: weekends, evenings and holidays do not change it.
- Nothing about how a deadline is worked out, or how the hours left are counted, changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `response-deadline`: adds the requirement that a ticket can be asked whether it is overdue, and refuses a
  moment or deadline that is not a date.

## Impact

A new exported function in `src/sla.js`, with tests and a doc comment. No existing function changes. The two
C# services are not affected; they can adopt it later through the shared examples if they need it.

## Risk

Low. Nothing that exists changes. If the answer is wrong, a person on the desk would see a ticket wrongly
marked overdue, or not, while its deadline, which is what the desk is held to, stays right.
