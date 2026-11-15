# Tasks

## 1. Show the defect

- [x] 1.1 Add a test named `[response-deadline] Hours left for a time that is not a date` covering every row
  of the scenario's examples, and commit it while it fails on main for the reason the proposal gives (an
  invalid date gives `NaN`; text and nothing fail with a `TypeError`), with the failing `./build.sh` output
  in the commit message

## 2. Refuse it

- [x] 2.1 Make `businessHoursLeft` refuse a moment or a deadline that is not a valid `Date` with a
  `RangeError` naming which, judged the way `responseDueAt` judges an opening time, and update its doc
  comment; verify the test from 1.1 passes, the valid row included, and `./build.sh` passes as a whole

## Workflow follow-up

- Archive the change once its build passes and the reviewer has seen it.
