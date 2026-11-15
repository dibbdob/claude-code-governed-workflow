# Proposal

## Why

This fixes a defect, issue #1. When the time a ticket was opened is not a real date, the deadline comes back
as "Invalid Date" instead of being refused, so the desk could store a ticket with no usable deadline and no
error to say why. An opening time written as text, or missing, fails with a `TypeError` from inside the
counting, which names nothing the caller got wrong.

## What Changes

- A response deadline is refused, with a `RangeError` that says the opening time is not a date, when the
  opening time is not a valid `Date`: an invalid date, text, a number, or nothing at all.
- A valid opening time gives exactly the deadline it gives now.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `response-deadline`: adds the requirement that an opening time which is not a date is refused, alongside
  the existing refusals of an unknown priority and a bad holiday.

## Impact

`responseDueAt` in `src/sla.js`, and its tests. No caller in this repository passes anything but a `Date`.
The two C# services have their own implementations and are not affected; they take a typed date, which
cannot be invalid in this way.

## Risk

Low. A caller passing a valid `Date` sees no difference, and a caller passing anything else was already
getting either an error or an unusable deadline; the worst case is an error message they did not expect,
in place of one they could not act on.
