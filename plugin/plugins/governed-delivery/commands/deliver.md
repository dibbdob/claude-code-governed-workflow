---
description: Implement a ready specification end to end, from its branch to a merge message
argument-hint: <spec-number>
---

Implement specification $1. It is marked ready, so it is settled: your job is to build what it says, not
to renegotiate it. If you believe it is wrong, say so in a sentence or two and keep building to it.

## 0. Gates before anything else

- **Only a ready specification.** If `docs/specs/$1-*.md` does not have the line `Status: ready`, stop
  and say what it says instead. A draft has open questions a person has not answered yet.

- **One delivery at a time.** `git branch --list 'deliver/*' --no-merged main` lists any delivery not yet
  merged. If it lists one, stop and ask me which to finish; do not start alongside it. Two deliveries in
  one checkout share a working tree, and each one's build reports on the other's half-finished edits.
- **A defect is reproduced before it is fixed.** If the specification says `Type: defect`, the first
  commit after numbering is a test that fails on `main` for the reason the specification describes, with
  the failing `./build.sh` output in the commit message. No fix is written until that commit exists. A
  fix for a defect nobody reproduced is a guess with a passing build.
- **The criteria are not reworded.** `build.sh` fails if a numbered criterion differs from `main`. If one
  is wrong, stop and say so; amending a specification is its own change.

## 1. Ground yourself before writing anything

Spawn the `spec-reader` agent with the number $1 ([`.claude/agents/spec-reader.md`](../agents/spec-reader.md)).
It reads the specification, the ADRs it cites and recent `main`, and returns every acceptance criterion
verbatim. It reads on a cheaper model and outside your context, so a long specification and its ADRs do
not fill the session that has to build. Its report is a reading aid; the specification stays the contract,
so open it yourself where you build against it.

**In the same message, spawn an `Explore` agent to survey the code the specification touches**: the
functions and modules it names or implies, the tests that exercise them, and anything the specification
assumes that the code contradicts. It also only reads, and it needs nothing from the spec-reader, so the
two run side by side rather than one after the other. Their two reports together are what you plan from:
one says what must be true, the other says what is true now.

State back, in five lines or fewer: what you are building, the criteria you will satisfy, and anything
stale. Then branch off current `main` as `deliver/<NNNN>-<slug>`.

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
goes in the merge message. If you fixed anything, review again on the new commit; a fix is new code
nobody has reviewed.

## 5. Finish

Write the merge message, in this shape, and show it to me:

```
Merge deliver/<NNNN>-<slug>: <what is now true, in plain words>

## In plain terms
## What changed
## Tests
## Review findings
```

Do not merge. I merge after reading it. In a headless run, where nobody is there to answer, stop after
the final commit and put the merge message in your last reply.
