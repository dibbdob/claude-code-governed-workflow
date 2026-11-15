# How it works

## What you can rely on

- **Nothing is built until its specification is approved.** `/deliver` refuses a change that is not on
  `main`, and only a merged pull request puts it there. There is no flag to set by hand.
- **The tests come from the specification.** Every scenario carries worked examples, and the build fails
  when a scenario has no test naming it ([ADR 0007](adr/0007-a-scenario-is-an-outline-with-worked-examples.md)).
- **The reviewer cannot be talked round.** It is given one commit and the tests, never the author's reasons,
  and a hook holds it to read-only commands ([ADR 0003](adr/0003-the-reviewer-is-not-told-why.md),
  [ADR 0004](adr/0004-a-restriction-is-a-tool-list-or-a-hook.md)).
- **A delivery cannot skip a step.** Reading, review and verification are tasks in every change, and a change
  archived with one undone fails the build ([ADR 0009](adr/0009-a-deliverys-steps-are-tasks.md)).
- **A reworded requirement is never quiet.** It is listed first in the pull request, and noted on the issue,
  for the person who asked for it to confirm.
- **A person merges.** Sessions are denied `git push`, and on GitHub a ruleset makes a pull request
  with a passing build the only way into `main`, merged by a person.
- **Spending is capped.** A run on GitHub stops at $1.50 or 60 turns, and only someone who can label issues
  can start one.

Where an instruction to Claude could be ignored, something else enforces it: a tool list, a hook, or the
build ([ADR 0001](adr/0001-a-rule-points-at-what-enforces-it.md)).

## What each step does

`/refine` ([command](../.claude/commands/refine.md), [ADR 0010](adr/0010-refinement-is-a-command-too.md)):

1. Reads what the product does now, and asks the author questions, above all for worked examples.
2. Writes the change, named after the issue, with plain terms, a risk level, scenarios and tasks.
3. Runs the build, so the spec pull request does not arrive failing.
4. Revises from the author's answers and the reviewer's comments, asking the author where they disagree.
5. Reads the change back in plain terms and publishes the pull request. It never approves or merges.

`/deliver` ([command](../.claude/commands/deliver.md)):

1. Stops unless the change is on `main` and the session is on another branch.
2. Reads the change through the read-only `spec-reader` subagent, and surveys the code it touches.
3. Writes a failing test for each scenario, then the code, running `./build.sh` before every commit.
4. Has the `independent-reviewer` review one commit, and fixes each finding behind a test that fails first.
5. Verifies the change, lists any requirement reworded since approval, and archives it.
6. Writes the pull request description. It does not open the pull request.

## How well it is tested

- **By the build,** on every pull request: every gate, each shown failing on a planted breach before it was
  trusted, the hook's allow and refuse lists, and the scripts against stand-ins for `claude` and `gh`.
- **On live runs:** eight changes taken from an issue to a merged pull request, on GitHub and on a laptop;
  `/refine` both on GitHub and in a session; a requirement reworded during a delivery and flagged for
  confirmation; and the plugin installed in another repository, its hook refusing writes.
- **Not yet run:** `/refine` with an author other than the developer; OpenSpec's `explore` skill; the
  question an attended delivery asks before archiving a reworded change; and a delivery's pull request
  closing its issue on merge.

To change the workflow itself, see [Working on this repository](developing.md).
