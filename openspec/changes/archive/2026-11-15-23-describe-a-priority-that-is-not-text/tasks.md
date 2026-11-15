# Tasks

## 1. Show the defect

- [x] 1.1 Add a test named `[response-deadline] A priority that is not text` covering every row of the
  scenario's examples, and commit it while it fails on main for the reason the proposal gives (a symbol
  throws a `TypeError`; an object is named `[object Object]`), with the failing `./build.sh` output in the
  commit message

## 2. Describe it

- [x] 2.1 Make the refusal of an unknown priority describe one that is not text the way a bad opening time is
  described, and name a text one as now; update the doc comment; verify the test from 1.1 passes and
  `./build.sh` passes as a whole

## Workflow follow-up

- Archive the change once its build passes and the reviewer has seen it.
