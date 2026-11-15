# 0002 Reading is delegated to a subagent

Status: accepted

## Context

A session that delivers a change has to read it first: the proposal, its tasks and scenarios, the main
specs it touches, the ADRs they rely on, and enough history to know what has moved since it was approved.
All of that lands in the same context window the session then builds in. On a large change the reading
crowds out the work, and it is done on the most expensive model for no gain: reading and quoting accurately
is not where a stronger model earns its cost.

Reading also fails quietly. A read that stops at a tool's line limit makes the sections after it look
absent, and the session builds a confident implementation of half a change.

Grounding from the change alone has a second gap: the builder discovers the code's current shape while
building, which is when a contradiction between the two is most expensive to find.

## Decision

`/deliver` is a coordinator. Its first step spawns two subagents in one message, because neither needs the
other's result:

- the `spec-reader`, on Haiku, with Read, Grep and Glob only, which reads the change's documents in its own
  context and returns every requirement and scenario word for word, what is stale, and the paths it read;
- the built-in `Explore` agent, which surveys the code the change touches.

The builder plans from both: what must be true, and what is true now. The spec-reader quotes rather than
summarises, because the builder writes a test against each scenario and a paraphrase drops clauses.

## Consequences

- The builder's context starts with a short, complete report instead of raw documents.
- The read costs less and runs on a model chosen for it.
- The report is a reading aid, not the contract. The builder still opens the change where it builds
  against it, so an error in the report is caught rather than built.
- The spec-reader has no shell, so the coordinator runs the `git log` commands it needs and passes the
  output (ADR 0004).
