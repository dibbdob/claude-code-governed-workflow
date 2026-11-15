---
description: Refine a GitHub issue into an OpenSpec change with its author, up to a spec pull request for review
argument-hint: <issue-number>
---

Refine GitHub issue #$1 into an OpenSpec change, with the person who raised it. They know what the product
should do; they may not know OpenSpec, Gherkin, git or this codebase, and do not need to. Talk to them in
the words they use about the product. Never show them a template, ask them to name a branch, or ask them to
run a command.

Your job ends at a spec pull request a developer reviews. Merging it is the approval, and the `refined`
workflow then labels the issue `ready` and adds a summary to it
([ADR 0006](../../docs/adr/0006-specs-are-openspec-changes.md),
[ADR 0010](../../docs/adr/0010-refinement-is-a-command-too.md)).
You never approve, merge, or write code: a refinement changes only its change folder.

There are two ways you are run. **In a session**, the author is here and answers you as you go. **On
GitHub**, the instructions you were started with say so: the author is not here, the issue or pull
request and its comments are what they have said, and each of their replies is a new run.

## 0. Gates

- **The issue exists and is open.** In a session, read it with `gh issue view $1 --comments`. On GitHub it
  is in your instructions.
- **It is not already approved.** If a folder `openspec/changes/$1-*` or `openspec/changes/archive/*-$1-*`
  is on the team's main (`origin/main`, or `main` with no remote), say it is already refined and stop. A
  change to an approved one is a new issue.
- **In a session, start with the script.** Run `./scripts/refinement.sh start $1`. It refuses uncommitted
  work, and puts you on the right place: main, for a new refinement, or the existing `refine/$1-…` branch,
  whose spec pull request it names, for a revision. Do not switch branches yourself.

## 1. Understand, before writing anything

If a change for this issue already exists on your branch, this is a **revision**: go to step 4.

Otherwise, read what the product does now in the area the issue touches: `openspec/specs/` for the
capabilities, and enough of the code to know whether the issue assumes something that is not so. Then work
out, with the author, what they need. Use OpenSpec's `openspec-explore` skill as a stance, not a script:
it is for thinking, and it writes nothing.

What a delivery cannot do without, and only the author can give you:

1. **Who it is for, and what should be true afterwards**, in a sentence.
2. **Worked examples.** Real cases with the answer they expect: "a ticket opened at 17:45 on Friday 13
   November should be due at 10:45 on Monday". Ask for three to six, and **always the awkward one**: the
   boundary, the day off, the value that is not there. Propose cases yourself and ask them to correct the
   answers; people are better at spotting a wrong answer than inventing a case.
3. **What should not change**, and anything they are unsure of.
4. **Why it matters**, enough to rate the risk: what goes wrong for whom if it is built wrong.

In a session, ask a few questions at a time, numbered, each answerable in a line. On GitHub, you cannot
wait for answers: make the best assumption for each, write it down as one, and list the questions in your
reply (step 5). A short brief gets a draft with more questions, not a refusal.

## 2. Write the change

Pick the change name: `$1-` and three to six words of what it does, lowercase and hyphenated
(`57-bank-holidays`). Run OpenSpec's `openspec-propose` skill with that name and everything you agreed.
`openspec instructions` hands it this project's rules from `openspec/config.yaml`: the proposal begins with
`## In plain terms` and ends with `## Risk`, every scenario is an outline with a table of the author's
worked examples, a medium or high risk gets a design with mitigations, and the tasks end with the Delivery
group. Follow them. The examples are the author's, not yours: never add a row they have not seen.

`openspec-propose` stops after the planning documents. So do you: no code, and no tests.

## 3. Check it is buildable

Run `./build.sh`. It fails on a scenario that is not an outline, placeholders that do not match the table's
columns, a missing Delivery group, or a broken link. Fix what it reports in the change and run it again. A
spec pull request that fails its build is not ready for anyone to review.

## 4. Revise, when this is a later run

Read every comment since the change was last revised: the author's answers and the reviewer's points.
Revise the change with OpenSpec's `openspec-update-change` skill, and only the change. Keep each answer the
author gave; if a reviewer's point contradicts one, do not choose between them: ask the author, naming who
said what. Run `./build.sh` again.

If what is now asked for is a different change, not this one refined, say so and stop: it needs its own
issue.

## 5. Hand it over

Read the change back to the author **in plain terms**: what will be true, the worked examples as a table,
the risk and why, and the questions still open, numbered. In a session, ask whether it says what they mean,
and revise until it does. Then write the spec pull request's description to `.refine/pull-request.md`
(git ignores it), in this shape:

```
Refine #$1: <what will be true, in plain words>

Refines #$1. Merging this approves the change for delivery; it does not close the issue.

## In plain terms
## Examples agreed
(the worked examples, as tables)
## Risk
## Open questions
(numbered, or "None.")
## For the reviewer
(what to check first, and any assumption you made)
```

Then publish it:

- **In a session**, run `./scripts/refinement.sh publish $1`. It commits only the change folder, runs the
  build, pushes the `refine/<change>` branch, opens the spec pull request (or comments on the one that is
  open) and links it on the issue. Give the author the link. Tell them a developer reviews it next, and that
  they can come back to the same session, or run `/refine $1` again, to answer review comments.
- **On GitHub**, commit the change folder with a message starting with the change name and a colon, and
  push with the tools you were given. The workflow opens the spec pull request from
  `.refine/pull-request.md` when there is none. Put the plain-terms read-back and the numbered open
  questions in your comment, and end it with how to answer: a comment on the spec pull request that
  mentions `@claude`.

Do not label the issue, approve, or merge. Nobody approves a refinement but a person reviewing its pull
request.
