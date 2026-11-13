---
description: Implement a ready specification end to end, in its own folder, up to a pull request description
argument-hint: <spec-number>
---

Implement specification $1. It is marked ready, so it is settled: your job is to build what it says, not
to renegotiate it. If you believe it is wrong, say so in a sentence or two and keep building to it.

## 0. Gates before anything else

- **Only a ready specification.** If `docs/specs/$1-*.md` does not have the line `Status: ready`, stop
  and say what it says instead. A draft has open questions a person has not answered yet.

- **In its own folder.** `git branch --show-current` must be `deliver/$1-<slug>`. If it is anything else,
  stop and say to run `scripts/start-delivery.sh $1` and open the folder it prints. Every delivery has a
  folder of its own, so several can run at once, by different people, without sharing half-finished files
  ([ADR 0007](../../docs/adr/0007-a-team-delivers-the-way-git-works.md)).
- **A defect is reproduced before it is fixed.** If the specification says `Type: defect`, the first
  commit after numbering is a test that fails on the team's main for the reason the specification describes, with
  the failing `./build.sh` output in the commit message. No fix is written until that commit exists. A
  fix for a defect nobody reproduced is a guess with a passing build.
- **The criteria are not reworded.** `build.sh` fails if a numbered criterion differs from the team's main. If one
  is wrong, stop and say so; amending a specification is its own change.

## 1. Ground yourself before writing anything

The team's main is `origin/main` when there is a remote, and `main` when there is not. Run
`git log --oneline -15 <the team's main>` and `git log --oneline -- docs/specs/$1-*.md`, then spawn the
`spec-reader` agent with the number $1 and both outputs
([`.claude/agents/spec-reader.md`](../agents/spec-reader.md)). It has no shell, so the history is yours
to give it. It reads the specification, the ADRs it cites and the code they name, and returns every
acceptance criterion verbatim. It reads on a cheaper model and outside your context, so a long specification and its ADRs do
not fill the session that has to build. Its report is a reading aid; the specification stays the contract,
so open it yourself where you build against it.

**In the same message, spawn an `Explore` agent to survey the code the specification touches**: the
functions and modules it names or implies, the tests that exercise them, and anything the specification
assumes that the code contradicts. It also only reads, and it needs nothing from the spec-reader, so the
two run side by side rather than one after the other. Their two reports together are what you plan from:
one says what must be true, the other says what is true now.

State back, in five lines or fewer: what you are building, the criteria you will satisfy, and anything
stale. You are already on the delivery's branch; do not make another.

## 2. Number the criteria

```bash
node tools/criteria.mjs number docs/specs/<NNNN>-<slug>.md
```

Set the status line to `Status: in progress` and commit both as `<NNNN> Pick up the specification`.

## 3. Build

Tests first, one per criterion at least, each naming its criterion in its title (`[<NNNN>-AC-<k>]`). Then
the code. Commit in steps a reviewer can read, each message starting `<NNNN> `. Run `./build.sh` (the
whole of it) before each commit.

## 4. Independent review

Set `Status: done`, run `./build.sh`, and commit. Then pin the review to that commit and collect the
citations:

```bash
git rev-parse HEAD
git grep -n '\[<NNNN>-AC-' HEAD -- test
```

Spawn the `independent-reviewer` agent ([`.claude/agents/independent-reviewer.md`](../agents/independent-reviewer.md))
with the number, the commit and the citation lines, and nothing else: not your plan, not your reasons, not
a summary of what you built ([ADR 0003](../../docs/adr/0003-the-reviewer-is-not-told-why.md)). Its value
is that it has not heard your account.

For each finding, fix it (with a test that fails before the fix), or record why it stands. Either way it
goes in the pull request description. If you fixed anything, review again on the new commit; a fix is new code
nobody has reviewed.

## 5. Finish

Write the pull request description, in this shape, to `.delivery/pull-request.md` (git ignores that
folder), and show it to me:

```
Merge deliver/<NNNN>-<slug>: <what is now true, in plain words>

## In plain terms
## What changed
## Tests
## Review findings
```

Do not push, and do not open the pull request. `scripts/finish-delivery.sh` does that: it checks the
specification's issue is assigned to the person delivering it, runs the build, pushes, and opens the pull
request as a draft. In a session, tell me to run it. In a headless run, `scripts/agent.sh` runs it after you
stop. Nobody merges until a person has reviewed the pull request.
