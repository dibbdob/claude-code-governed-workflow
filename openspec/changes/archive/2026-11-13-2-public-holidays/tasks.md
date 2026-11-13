# Tasks

## 1. Tests for each scenario

- [x] 1.1 Add a test for each scenario in `specs/response-deadline/spec.md`, named `[response-deadline] <scenario name>`; verify each fails on `main` for the reason its scenario describes.

## 2. Skip public holidays

- [x] 2.1 Let the deadline calculation in `src/sla.js` take an optional list of holidays and skip them like weekends; verify with `./build.sh`.
- [x] 2.2 Check that callers which pass no holidays get the same deadlines as before; verify with the "No list of holidays" test.

## 3. Mitigations from the design

- [x] 3.1 Add a test for a ticket opened at 16:00 UTC on the day before a holiday; verify it is due on the first business day after the holiday.
- [x] 3.2 Make the "No list of holidays" test compare deadlines with an empty list against the existing cases; verify with `./build.sh`.
