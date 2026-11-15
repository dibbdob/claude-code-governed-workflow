# Tasks

## 1. Show the defect

- [ ] 1.1 Add a test named `[response-deadline] A priority named like a built-in property` covering every row
  of the scenario's examples, and commit it while it fails on main for the reason the proposal gives (each of
  the four names gets a deadline of the moment the ticket was opened), with the failing `./build.sh` output
  in the commit message

## 2. Refuse it

- [ ] 2.1 Make `responseDueAt` treat a priority as known only when it is one of the desk's own, not one an
  object inherits; verify the test from 1.1 passes, the valid row included, and `./build.sh` passes as a whole

## Workflow follow-up

- Archive the change once its build passes and the reviewer has seen it.
