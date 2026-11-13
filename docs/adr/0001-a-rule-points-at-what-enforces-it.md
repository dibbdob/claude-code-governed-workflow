# 0001 A rule points at what enforces it

Status: accepted

## Context

CLAUDE.md is read at the start of every session, and every line in it competes for the session's attention
with the task. Rules written as prose are followed most of the time. "Most of the time" is acceptable for
style and fatal for a rule whose breach passes the build: a test that covers no criterion, or a date read
in local time, looks like success to the session that wrote it and to anyone skimming the diff.

The file also only grows. Each lesson adds a line, nobody removes one, and the rules that matter end up
diluted by the ones that do not.

## Decision

When a lesson can be checked mechanically, the check goes into `build.sh` and CLAUDE.md keeps one line
saying where it is. Prose stays only for what cannot be checked yet, marked as such. A rule that applies
to one directory lives in that directory's CLAUDE.md, which loads only when a session works there.

## Consequences

- A breach fails the build with a message saying what to do, whether or not the session read the rule.
- CLAUDE.md gets shorter as the build gets stricter, rather than longer.
- Each check is code that needs its own tests (`tools/criteria.test.js`), and a check that cannot fail is
  worse than none, so each one is shown failing before it is trusted.
