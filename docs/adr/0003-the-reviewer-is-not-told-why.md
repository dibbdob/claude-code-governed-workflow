# 0003 The reviewer is not told why

Status: accepted

## Context

A session that has just built something is the worst-placed reviewer of it. It knows what it meant, and
reads the code as that. Asking it to "review your work" produces a list of things it already believes.

A second session helps only if it starts from somewhere else. Given the author's plan, commit messages or
summary, it inherits the same reading: an explanation tells a reviewer where to look and what to expect
there. And a review of a moving branch is a review of nothing in particular: by the time its findings come
back, the code it read may have changed.

## Decision

The review is done by the `independent-reviewer` subagent, which is given three things only: the change's
name, one commit, and the lines where the tests cite each scenario. It reads the change and the code at that
commit, and cannot read commit messages. The coordinator does not pass its plan, its reasoning or a summary.

The reviewer reports in four classes: unmet requirements or scenarios, defects with a concrete failing case,
statements that are untrue of the code, and checks that cannot fail. It labels any finding it inferred
rather than verified.

Each finding is fixed with a test that fails first, or recorded as standing, and every finding appears in
the pull request description. A fix is reviewed again on its new commit, at most twice: a thorough reviewer
always finds something, each fix invites another round, and later rounds drift to inputs nobody sends.
After the second review only a finding that breaks the change is fixed; the rest are left for a person.

## Consequences

- The review measures the code against the change, not against the author's intention.
- Pinning to a commit makes the review's findings refer to something that still exists.
- A citation list makes "no test for this scenario" a mechanical finding, not a judgement.
- Not reading commit messages is enforced by the reviewer's read-only hook, which refuses `git log` and a
  bare `git show <commit>` (ADR 0004).
