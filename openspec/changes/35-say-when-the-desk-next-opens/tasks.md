# Tasks

## 1. When the desk next opens

- [ ] 1.1 Add tests named `[response-deadline] When the desk next opens` and `[response-deadline] When the
  desk next opens, for a moment that is not a date`, covering every row of their examples, and see them fail
  because the function does not exist yet
- [ ] 1.2 Add and export the function from `src/sla.js`, using the same business hours and holiday handling
  as a deadline, refusing a moment that is not a date as `businessHoursLeft` does, and refusing holidays as
  `responseDueAt` does; give it a doc comment; verify the tests from 1.1 pass and `./build.sh` passes as a
  whole

## 2. Delivery

- [ ] 2.1 Grounding: the spec-reader and Explore subagents, side by side; record what the spec-reader found stale here, or 'nothing stale'
- [ ] 2.2 Independent review: the independent-reviewer subagent, pinned to a commit; record the commit here
- [ ] 2.3 Second review: on the commit with the first review's fixes; if it led to none, record 'not needed: no fixes' here
- [ ] 2.4 OpenSpec verify: run openspec-verify-change; record its CRITICAL, WARNING and SUGGESTION counts here
