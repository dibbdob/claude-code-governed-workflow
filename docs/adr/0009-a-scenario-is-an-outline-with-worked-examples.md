# 0009 A scenario is a Gherkin outline with worked examples

Status: accepted. Adds to ADR 0008.

## Context

A change's scenarios are its acceptance criteria, and the first delivery's were rules: "a deadline that runs
into a public holiday skips that day". A rule is easy to agree to without noticing it is wrong, and the people
who know whether a deadline is right are on the desk, not in the code. A worked example, "urgent, opened
Thursday 24 December at 15:00, Christmas a holiday: due Monday 28 December at 11:00", is something they can
check against what they know. Writing the rule and its examples together is common practice, usually called
specification by example, and Gherkin's scenario outline is its usual form.

## Decision

- **Every scenario in a change is a Gherkin scenario outline with worked examples.** GIVEN, WHEN and THEN steps
  in the desk's words, each value that varies a `<placeholder>`, and under them a table whose columns are
  those placeholders: real dates and times, with the day of the week and the time zone, and the answer
  expected, including the boundary easiest to get wrong. OpenSpec accepts this as its own scenario format.
- **`openspec/config.yaml` tells whoever writes the change, and the build checks it.** `tools/specs.mjs` fails
  when a scenario in an open change has no examples, or its placeholders and columns differ. The living specs
  written before this are exempt.
- **Each example is tested.** The delivery's tests check every row of a scenario's examples, under the
  scenario's own name.

## Consequences

- A person on the desk can review a change's proposal in the desk's terms, on its pull request, and the
  reviewer of a delivery can check its tests against the same rows.
- Nothing checks that every row has a test; `/deliver`'s test-first rule and the reviewer are what do.
- Kept out on purpose: copying the criteria into the GitHub issue, labels for each stage, codes on criteria
  and a required acceptance check were each built and then removed. They made the repository a
  project-management tool, which is not what it demonstrates; the proposal's pull request is where a
  change is agreed, and a person merging the delivery is where it is accepted.
