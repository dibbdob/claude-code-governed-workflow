# 0007 A scenario is a Gherkin outline with worked examples

Status: accepted

## Context

A change's scenarios are its acceptance criteria. Written as rules, "a deadline that runs into a public
holiday skips that day", they are easy to agree to without noticing they are wrong, and the people who know
whether a deadline is right are on the desk, not in the code. A worked example, "urgent, opened Thursday
24 December at 15:00, Christmas a holiday: due Monday 28 December at 11:00", is something they can check
against what they know. Writing the rule and its examples together is common practice, usually called
specification by example, and Gherkin's scenario outline is its usual form.

The same examples are worth having as data, apart from the specs: a second check on the code, worked out by
hand, that any other implementation of the rules can be run against.

## Decision

- **Every scenario in a change is a Gherkin scenario outline with worked examples.** GIVEN, WHEN and THEN
  steps in the desk's words, each value that varies a `<placeholder>`, and under them a table whose columns
  are those placeholders: real dates and times, with the day of the week and the time zone, and the answer
  expected, including the boundary easiest to get wrong. OpenSpec accepts this as its own scenario format.
- **`openspec/config.yaml` tells whoever writes the change, and the build checks it.** `tools/specs.mjs`
  fails when a scenario in an open change has no examples, or its placeholders and columns differ.
- **Each example is tested.** The delivery's tests check every row of a scenario's examples, under the
  scenario's own name.
- **The desk's examples are also data.** `test/fixtures/desk-rules.json` holds worked examples of every rule,
  security reports and public holidays included, and its tests hold `src/sla.js` to it. Another
  implementation of the rules, in any language, can copy the file and run against it.

## Consequences

- A person on the desk can review a change's proposal in the desk's terms, on its pull request, and the
  reviewer of a delivery can check its tests against the same rows.
- Nothing checks that every row has a test; `/deliver`'s test-first rule and the reviewer are what do.
- A rule that changes changes the examples file too, and a copy elsewhere follows by copying it.
- Kept out on purpose: copying the criteria into the GitHub issue, labels for each step, codes on criteria
  and a required acceptance check. They would make the repository a project-management tool, which it is
  not meant to be; the proposal's pull request is where a change is agreed, and a person merging the
  delivery is where it is accepted.
