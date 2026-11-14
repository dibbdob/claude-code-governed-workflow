# Tasks

## 1. Tests for each scenario

- [ ] 1.1 Add tests named `[response-deadline] A security report is urgent whatever the plan` and `[response-deadline] A security report that is also an outage is urgent`, each checking every row of its scenario's examples (priority and reply due); verify both fail on `main` because the priority comes out normal or high.
- [ ] 1.2 Add a test named `[response-deadline] A ticket that is not a security report keeps its priority`, checking every row of its examples; verify it passes on `main` as well, since it guards behaviour that must not change.
- [ ] 1.3 Extend the existing tests `[response-deadline] An outage on the enterprise plan is urgent` and `[response-deadline] An outage on any other plan is high` to check every row of their examples, keeping their names; verify they pass on `main` and `./build.sh` reports no scenario without a test.

## 2. Security reports are urgent

- [ ] 2.1 In `priorityOf` in `src/sla.js`, make a ticket whose category is `security` urgent, checked before the outage rule; verify the tests from group 1 pass with `./build.sh`.
- [ ] 2.2 Update the comment on `priorityOf` to name the `security` category; verify by reading it against the spec.

## 3. Mitigations from the design

- [ ] 3.1 Check-order mitigation: confirm the test for "A security report that is also an outage is urgent" includes the starter-plan row; verify by moving the security check after the outage check locally and seeing that test fail, then restoring it.
- [ ] 3.2 No-plan mitigation: confirm the "no plan recorded" row of "A security report is urgent whatever the plan" is tested with no `plan` field at all; verify the test passes.
- [ ] 3.3 Unchanged-priorities mitigation: confirm the billing, question and no-category rows give the same priorities and deadlines as on `main`; verify the test from 1.2 passes unchanged after 2.1.
- [ ] 3.4 Every-row mitigation: check that each row of each table in `specs/response-deadline/spec.md` appears in `test/sla.test.js`; verify by counting rows in both (11 in the spec).
- [ ] 3.5 Spelling trade-off: say in the pull request description that only the category `security`, spelled exactly so, makes a ticket urgent; verify the description says it before review.
