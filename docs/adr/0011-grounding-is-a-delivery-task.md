# 0011 Grounding is a delivery task too

Status: accepted

## Context

ADR 0009 made `/deliver`'s review, second review and verify tasks of every change, so a delivery that
skips one fails the build. Grounding, its first step, was left out: the spec-reader and Explore, run side
by side before anything is written (ADR 0002).

The delivery of issue 29, on GitHub on Claude Sonnet 5.5, skipped both. It said so in its pull request
("one small function"), and nothing caught it. The change was small and came out right. But grounding is
for what the builder would not have thought to check, such as a requirement made stale by a later change
or code that contradicts the specification. A builder that judges a change too small to need it is
deciding without the information grounding exists to give it.

## Decision

- **The Delivery group has four tasks, grounding first.** `openspec/config.yaml` words it: "Grounding: the
  spec-reader and Explore subagents, side by side; record what the spec-reader found stale here, or
  'nothing stale'". `tools/specs.mjs` fails the build when an open change lacks it.
- **`/deliver` ticks it after step 1,** with what was found stale, however small the change looks.

## Consequences

- A delivery that skips grounding now has to leave the task unticked, which fails the build when the
  change is archived, or tick it falsely, against what its own report and the reviewer can see.
- As with the other three, a ticked task is the session's claim, not proof. What it records (what was
  stale, or nothing) is there for the pull request's reviewer to check.
- Open changes proposed before this decision need the task added before they build. Archived changes are
  not checked.
