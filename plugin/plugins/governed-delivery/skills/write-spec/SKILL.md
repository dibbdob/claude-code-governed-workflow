---
name: write-spec
description: Draft a specification in docs/specs/ from a one-line request, with Given/When/Then acceptance criteria and the questions a person must settle before it is marked ready. Runs in a forked context and never marks its own draft ready.
argument-hint: <one-line request>
disable-model-invocation: true
context: fork
agent: general-purpose
allowed-tools: Read, Glob, Grep, Write
---

Draft a specification for this request: $ARGUMENTS

You are running in a forked context. You have none of the conversation that led here, only this request
and the repository, which is the point: a specification has to make sense to someone who was not in the
room. You also cannot ask questions. Where the request leaves something open, write it down as an open
question rather than choosing an answer.

1. Read `CLAUDE.md`, the specifications in `docs/specs/` (for their shape and numbering), and the ADRs in
   `docs/adr/` that bear on the request. Read the code the request touches, enough to know what is true
   now.
2. Take the next free number: one more than the highest `docs/specs/NNNN-*.md`.
3. Write `docs/specs/<NNNN>-<slug>.md` in this shape:

   ```markdown
   # <NNNN> <Title in plain words>

   Status: draft

   ## Why

   <What is wrong or missing today, for whom, in two or three sentences.>

   ## Acceptance criteria

   - Given <state>, when <action>, then <observable outcome>.

   ## Open questions

   - <Each decision the request leaves open, with the options you can see.>
   ```

   Each criterion is one observable outcome that a test could check. No criterion describes how the code
   is built. Do not number the criteria: numbering happens when delivery starts.
4. Leave the status as `draft`. A person marks it `ready` once the open questions are answered;
   `/deliver` and `scripts/agent.sh` refuse anything else.

Reply with the path you wrote and the open questions, and nothing more.
