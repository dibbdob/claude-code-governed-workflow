---
description: Deliver an approved OpenSpec change end to end, in its own folder, up to a pull request description
argument-hint: <change-name>
---

Deliver the OpenSpec change `$1`. It is on the team's main, so its proposal has been reviewed and approved:
your job is to build what it says, not to renegotiate it. If you believe it is wrong, say so in a sentence
or two and keep building to it.

Use this command to deliver a change in this repository. The building itself is OpenSpec's apply step
(step 2); around it, this command adds what the project insists on: the gates below, a spec-reader with no
shell, an independent review, OpenSpec's verify, archiving with revisions flagged, and the build as the
judge
([ADR 0008](https://github.com/dibbdob/claude-code-governed-workflow/blob/main/docs/adr/0008-specs-are-openspec-changes.md)).

The team's main is `origin/main` when there is a remote, and `main` when there is not.

## 0. Gates before anything else

- **An approved change.** `openspec/changes/$1/proposal.md` must exist on the team's main. A change that
  is only on someone's branch is still being refined; stop and say so.
- **In its own folder.** `git branch --show-current` must be `deliver/$1`. If it is anything else, stop and
  say to run `scripts/start-delivery.sh $1` and open the folder it prints. Every delivery has a folder of its
  own, so several can run at once, by different people, without sharing half-finished files
  ([ADR 0007](https://github.com/dibbdob/claude-code-governed-workflow/blob/main/docs/adr/0007-a-team-delivers-the-way-git-works.md)).
- **A defect is reproduced before it is fixed.** If the proposal says the change fixes a defect, the first
  commit is a test that fails on the team's main for the reason the proposal describes, with the failing
  `./build.sh` output in the commit message. No fix is written until that commit exists.
- **Revise only while the intent holds.** If building shows a requirement or scenario should be worded
  differently, follow the build guidance in `openspec/config.yaml` (`openspec instructions apply --change $1
  --json` returns it): revise the change with OpenSpec's `openspec-update-change` skill, and only while its
  intent is the same. If the intent would change, stop and say it needs a new proposal. Every revision is
  listed for a person to confirm when the change is archived (step 5).

## 1. Ground yourself before writing anything

Run `openspec instructions apply --change $1 --json`: its `contextFiles` are the change's documents, as
OpenSpec defines them. Run `git log --oneline -15 <the team's main>` and
`git log --oneline -- openspec/changes/$1`. Then spawn the `spec-reader` agent with the change name `$1`,
those files and both outputs ([`.claude/agents/spec-reader.md`](../agents/spec-reader.md)). It has no shell,
so the list and the history are yours to give it. It reads them, the main specs the change touches under
`openspec/specs/`, and the ADRs they rely on, and returns every requirement and scenario word for word. It reads on a cheaper model and outside your context. Its report is
a reading aid; the change stays the contract, so open it yourself where you build against it.

**In the same message, spawn an `Explore` agent to survey the code the change touches**: the functions and
modules it names or implies, the tests that exercise them, and anything the change assumes that the code
contradicts. The two run side by side. One says what must be true, the other what is true now.

State back, in five lines or fewer: what you are building, the scenarios you will satisfy, and anything
stale. You are already on the delivery's branch; do not make another.

## 2. Build, with OpenSpec's apply step

Run OpenSpec's `openspec-apply-change` skill on `$1`. It works through the change's tasks in order and tracks
them, and hands you this project's build guidance from `openspec/config.yaml`: tests first, one per scenario
named `[<capability>] <scenario name>`, `./build.sh` before every commit, commit messages starting `$1: `, a
defect reproduced before it is fixed, and revisions only while the intent holds. Follow that guidance; the
build fails when a scenario has no test. When it reports every task done, go on to the review.

## 3. Independent review

With every task ticked, run `./build.sh` and commit. Then pin the review to that commit and collect the
citations:

```bash
git rev-parse HEAD
git grep -n '\[[a-z0-9/-]*\] ' HEAD -- test
```

Spawn the `independent-reviewer` agent ([`.claude/agents/independent-reviewer.md`](../agents/independent-reviewer.md))
with the change name, the commit and the citation lines, and nothing else: not your plan, not your reasons,
not a summary of what you built ([ADR 0003](https://github.com/dibbdob/claude-code-governed-workflow/blob/main/docs/adr/0003-the-reviewer-is-not-told-why.md)). Its value
is that it has not heard your account.

For each finding, fix it (with a test that fails before the fix), or record why it stands. Either way it
goes in the pull request description. If you fixed anything, review again on the new commit.

Review at most twice. A thorough reviewer always finds something, and each fix invites another round: the
first delivery took four, the later ones about inputs nobody sends. After the second review, fix only a
finding that breaks a requirement or scenario of the change, and do not review again; list every other
new finding under "Review findings" in the pull request description, marked as left for a person to judge.

## 4. Verify with OpenSpec

Run OpenSpec's `openspec-verify-change` skill on `$1`. It checks the work against the change: every task
done, every requirement implemented, the design (including its risk mitigations) followed. It is a
self-check by this session, not an independent review; the reviewer in step 3 is that.

Fix each CRITICAL issue (with a test that fails before the fix, where one applies) and run `./build.sh`
again, or record why it stands. WARNING and SUGGESTION issues go in the pull request description.

## 5. Archive the change

First get the archive guidance this project has set:

```bash
openspec instructions archive --change $1 --json
```

Follow its `operationGuidance`: compare the change's spec files with the version approved on the team's main,
and if any requirement or scenario changed, list each one in plain words with whether the intent is the same
and what could go wrong because of the change. If I am here, ask me to confirm the intent before going on. In
a headless run, do not stop: that list goes first in the pull request description. If the intent has
changed, do not archive; say the change needs a new proposal.

Then archive it:

```bash
openspec archive $1 --yes
```

This moves the change into `openspec/changes/archive/` and folds its requirements into the main specs under
`openspec/specs/`, so they describe the system as it now is. Run `./build.sh` (which fails if any archived
change has tasks left undone) and commit as `$1: Archive`.

## 6. Write the pull request description

Write it, in this shape, to `.delivery/pull-request.md` (git ignores that folder), and show it to me:

```
Merge deliver/$1: <what is now true, in plain words>

## Changed since approval: please confirm the intent is the same
(only when step 5 found revisions: each one, with why, and its risk)
## In plain terms
## Risk
(the proposal's risk level and why, and how the design's mitigations were checked)
## What changed
## Tests
## Review findings
(the reviewer's, and OpenSpec verify's warnings and suggestions)
```

Do not push, and do not open the pull request. `scripts/finish-delivery.sh` does that: it checks the change
is archived and its issue is assigned to the person delivering it, runs the build, pushes, and opens the pull
request as a draft. In a session, tell me to run it. In a headless run, `scripts/agent.sh` runs it after you
stop. Nobody merges until a person has reviewed the pull request.
