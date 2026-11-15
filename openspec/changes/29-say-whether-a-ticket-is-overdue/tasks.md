# Tasks

## 1. Whether a ticket is overdue

- [ ] 1.1 Add tests named `[response-deadline] Whether a ticket is overdue` and `[response-deadline] Overdue
  for a time that is not a date`, covering every row of their examples, and see them fail because the
  function does not exist yet
- [ ] 1.2 Add and export the function from `src/sla.js`, answering true only when now is after the deadline,
  refusing a moment or deadline that is not a date as `businessHoursLeft` does; give it a doc comment; verify
  the tests from 1.1 pass and `./build.sh` passes as a whole

## 2. Delivery

- [ ] 2.1 Independent review: the independent-reviewer subagent, pinned to a commit; record the commit here
- [ ] 2.2 Second review: on the commit with the first review's fixes; if it led to none, record 'not needed: no fixes' here
- [ ] 2.3 OpenSpec verify: run openspec-verify-change; record its CRITICAL, WARNING and SUGGESTION counts here
