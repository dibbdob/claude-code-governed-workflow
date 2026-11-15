# Tasks

## 1. Whether a ticket is overdue

- [x] 1.1 Add tests named `[response-deadline] Whether a ticket is overdue` and `[response-deadline] Overdue
  for a time that is not a date`, covering every row of their examples, and see them fail because the
  function does not exist yet
- [x] 1.2 Add and export the function from `src/sla.js`, answering true only when now is after the deadline,
  refusing a moment or deadline that is not a date as `businessHoursLeft` does; give it a doc comment; verify
  the tests from 1.1 pass and `./build.sh` passes as a whole

## 2. Delivery

- [x] 2.1 Independent review: the independent-reviewer subagent, pinned to a commit; record the commit here: 85c7f7ac6a6847f92d04c4973d9596ac0c9e9d9a
- [x] 2.2 Second review: on the commit with the first review's fixes; if it led to none, record 'not needed: no fixes' here: not needed: no fixes
- [x] 2.3 OpenSpec verify: run openspec-verify-change; record its CRITICAL, WARNING and SUGGESTION counts here: 0 CRITICAL, 0 WARNING, 0 SUGGESTION
