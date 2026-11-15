# Tasks

## 1. Show the defect

- [ ] 1.1 Add a test named `[response-deadline] An opening time that is not a date` covering every row of the
  scenario's examples, and commit it while it fails on main for the reason the proposal gives (an invalid
  date comes back as a deadline; text and nothing fail with a `TypeError`), with the failing `./build.sh`
  output in the commit message

## 2. Refuse it

- [ ] 2.1 Make `responseDueAt` refuse an opening time that is not a valid `Date` with a `RangeError` saying
  so, before any counting, and update its doc comment; verify the test from 1.1 passes, the valid row
  included, and `./build.sh` passes as a whole

## Workflow follow-up

- Archive the change once its build passes and the reviewer has seen it.
