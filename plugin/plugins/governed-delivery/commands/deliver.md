---
description: Deliver an approved OpenSpec change end to end, on its own branch, up to a pull request description
argument-hint: <change-name>
---

Deliver the OpenSpec change `$1`. It is on the team's main, so its proposal has been reviewed and approved:
your job is to build what it says, not to renegotiate it. If you believe it is wrong, say so in a sentence
or two and keep building to it.

Use this command to deliver a change in this repository. The building itself is OpenSpec's apply step
(step 2); around it, this command adds what the project insists on: the gates below, a spec-reader with no
shell, an independent review, OpenSpec's verify, archiving with revisions flagged, and the build as the
judge
([ADR 0006](https://github.com/dibbdob/claude-code-governed-workflow/blob/main/docs/adr/0006-specs-are-openspec-changes.md)).

The team's main is `origin/main` when there is a remote, and `main` when there is not.

## 0. Gates before anything else

- **An approved change.** `openspec/changes/$1/proposal.md` must exist on the team's main. A change that
  is only on someone's branch is still being refined; stop and say so.
- **On a branch of its own.** `git branch --show-current` must not be `main`. If it is, stop and say to make
  one (`git switch -c deliver/$1`); `scripts/agent.sh` and the `deliver` workflow on GitHub make it before
  they start you.
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

Then tick the change's Grounding task, recording what the spec-reader found stale, or "nothing stale". Do
this however small the change looks: the reading is for what you would not have thought to check, and a
change archived with the task unticked fails the build
([ADR 0011](https://github.com/dibbdob/claude-code-governed-workflow/blob/main/docs/adr/0011-grounding-is-a-delivery-task.md)).

## 2. Build, with OpenSpec's apply step

Run OpenSpec's `openspec-apply-change` skill on `$1`. It works through the change's tasks in order and tracks
them, and hands you this project's build guidance from `openspec/config.yaml`: tests first, one per scenario
named `[<capability>] <scenario name>`, `./build.sh` before every commit, commit messages starting `$1: `, a
defect reproduced before it is fixed, and revisions only while the intent holds. Follow that guidance; the
build fails when a scenario has no test. When it reports every task done, go on to the review.

## 3. Independent review

With every task ticked, run `./build.sh` and commit. Then pin the review to that commit and collect the
citations, from a tree with nothing uncommitted so that they are the commit's:

```bash
git rev-parse HEAD
node tools/specs.mjs citations
```

The second lists each test that cites a scenario as `file:line: [capability] scenario`, wherever the
project's tests are and in whatever language (`scripts/test-citations.json`).

Spawn the `independent-reviewer` agent ([`.claude/agents/independent-reviewer.md`](../agents/independent-reviewer.md))
with the change name, the commit and the citation lines, and nothing else: not your plan, not your reasons,
not a summary of what you built ([ADR 0003](https://github.com/dibbdob/claude-code-governed-workflow/blob/main/docs/adr/0003-the-reviewer-is-not-told-why.md)). Its value
is that it has not heard your account.

For each finding, fix it (with a test that fails before the fix), or record why it stands. Either way it
goes in the pull request description. If you fixed anything, review again on the new commit.

Tick the change's Delivery tasks as you go, each with what it asks you to record: the first review's
commit, then the second review's commit, or "not needed: no fixes" when the first led to none. These tasks
are how the project knows the review happened: a change archived with one unticked fails the build.

Review at most twice. A thorough reviewer always finds something, and each fix invites another round, the
later ones about inputs nobody sends ([ADR 0003](https://github.com/dibbdob/claude-code-governed-workflow/blob/main/docs/adr/0003-the-reviewer-is-not-told-why.md)). After
the second review, fix only a finding that breaks a requirement or scenario of the change, and do not review
again; list every other new finding under "Review findings" in the pull request description, marked as left
for a person to judge.

## 4. Verify with OpenSpec

Run OpenSpec's `openspec-verify-change` skill on `$1`. It checks the work against the change: every task
done, every requirement implemented, the design (including its risk mitigations) followed. It is a
self-check by this session, not an independent review; the reviewer in step 3 is that.

Fix each CRITICAL issue (with a test that fails before the fix, where one applies) and run `./build.sh`
again, or record why it stands. WARNING and SUGGESTION issues go in the pull request description. Then tick
the Delivery task for verify, with the three counts.

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

Closes #<n>.

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

`<n>` is the issue the change is named after, the number `$1` starts with. That line is what closes the
issue when the pull request is merged; leave it out and the issue stays open with its work done.

Do not push, and do not open the pull request, unless the instructions you were started with say to; on
GitHub, the `deliver` workflow's do. In a session, tell me the branch is ready to push. In a headless run on
this machine, `scripts/agent.sh` checks what you left, archive included, and runs the build. Nobody merges
until a person has reviewed the pull request.
