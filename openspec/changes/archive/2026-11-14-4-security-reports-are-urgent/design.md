# Design

## Context

`priorityOf` in `src/sla.js` decides a ticket's priority from three fields: `outage`, `plan` and
`category`. An outage is checked first and wins over any category; `billing` is normal, `question` is low,
and anything else is normal. `responseDueAt` turns a priority into a deadline and is not touched here. See
proposal.md for why.

## Goals / Non-Goals

**Goals:**
- A ticket whose category is `security` is urgent, whatever its plan and whether or not it is an outage.

**Non-Goals:**
- Recognising a security problem from what the customer wrote. Whoever records the ticket sets its
  category, as they do for billing and questions now.
- A separate, shorter deadline for security reports. Urgent's four business hours apply.

## Decisions

- **A security report is a category, `security`.** The ticket already has a field for what kind of problem
  it is, and billing and questions use it. A separate `security: true` flag, like `outage`, was considered;
  it would allow a security report that is also billing, which means nothing to the desk, and adds a second
  way of saying what a ticket is about.
- **The security check comes before the outage check.** An outage on the starter plan is high today; one
  that is also a security report must be urgent, so the order of the two checks decides the answer.
- **The category is matched exactly, `security`, as `billing` and `question` are.** Accepting other
  spellings would make this category behave unlike the others.
- **The outage scenarios keep their names.** They are rewritten as outlines with worked examples, as an
  open change requires, but the tests that already cite them by name still do.

## Risks / Trade-offs

- [The security check is placed after the outage check, so a security outage on a plan other than
  enterprise comes out high] → Check the category first; the test for "A security report that is also an
  outage is urgent" checks the starter-plan row, which is high if the order is wrong.
- [A security report with no plan recorded falls through to another rule] → The "no plan recorded" row of
  "A security report is urgent whatever the plan" is tested.
- [Tickets that are not security reports change priority] → The test for "A ticket that is not a security
  report keeps its priority" checks billing, a question and a ticket of no recorded kind against the
  priorities and deadlines they get on main; the existing outage tests keep passing.
- [A row of the worked examples is agreed but never tested] → Every row of each scenario in this change is
  checked by a test, in the way `test/sla.test.js` already checks the holiday rows; the reviewer compares
  the rows in the tests with the tables in the spec.
- [A ticket recorded with another spelling, `Security`, stays normal] → Accepted, and consistent with the
  other categories. Whoever records tickets has to use `security`; this is named in the pull request.
