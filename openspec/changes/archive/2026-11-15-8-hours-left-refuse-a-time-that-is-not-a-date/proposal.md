# Proposal

## Why

This fixes a defect, issue #8. Since change 1, a response deadline refuses an opening time that is not a
date. The business hours left before a deadline, added at the same time, do not: an invalid date for the
moment or the deadline gives `NaN`, which a screen would show as "NaN hours left", and text or nothing fails
with a `TypeError` from inside the counting.

## What Changes

- The business hours left are refused, with a `RangeError` that names which one was wrong, when the moment
  or the deadline is not a valid `Date`: an invalid date, text, a number, or nothing at all.
- Valid dates give exactly the hours left they give now.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `response-deadline`: adds the requirement that the hours left are refused for a moment or a deadline
  that is not a date, as a deadline already is for an opening time that is not one.

## Impact

`businessHoursLeft` in `src/sla.js`, its doc comment and its tests. No caller in this repository passes
anything but a `Date`. The C# services do not have this function.

## Risk

Low. Valid dates see no difference. A caller passing anything else was getting `NaN` or a `TypeError`;
now it gets an error that says what was wrong.
