# Tasks

## 1. Business hours left

- [ ] 1.1 Add a test named `[response-deadline] Business hours left before a deadline` covering every row of
  the scenario's examples, and see it fail because the function does not exist yet
- [ ] 1.2 Add and export the function from `src/sla.js`, counting business hours with the same opening hours,
  weekday and holiday rules `responseDueAt` uses, refusing a bad holiday list as it does, and returning zero
  at or past the deadline; give it a doc comment; verify the test from 1.1 passes and `./build.sh` passes as
  a whole

## Workflow follow-up

- Archive the change once its build passes and the reviewer has seen it.
