# 0002 Reading is delegated to a subagent

Status: accepted

## Context

A session that implements a specification has to read it first, along with the ADRs it cites and enough
of recent history to know what has changed. All of that lands in the same context window the session then
builds in. On a large specification the reading crowds out the work, and it is done on the most expensive
model for no gain: reading and quoting accurately is not where a stronger model earns its cost.

Reading also fails quietly. A read that stops at a tool's line limit makes the sections after it look
absent, and the session builds a confident implementation of half a specification.

## Decision

`/deliver` is a coordinator. Its first step spawns the `spec-reader` subagent, which runs on Sonnet with no
write tools, reads everything in its own context, and returns only what the builder needs: every
acceptance criterion verbatim, what is stale, and the paths it read. It counts a file's lines before
reading so it knows when it has reached the end.

The report quotes criteria rather than summarising them, because the builder writes a test against each
one and a paraphrase drops clauses.

## Amendment: the survey runs beside it

Grounding from the specification alone left the builder to discover the code's current shape while
building, which is when a contradiction between the two is most expensive to find. `/deliver` now spawns
the built-in `Explore` agent in the same message as the spec-reader, to survey the code the specification
touches. Neither needs the other's result, so they run in parallel, and the builder plans from both: what
must be true, and what is true now.

## Consequences

- The builder's context starts with a short, complete report instead of raw documents.
- The read costs less and runs on a model chosen for it.
- The report is a reading aid, not the contract. The builder still opens the specification where it
  builds against it, so an error in the report is caught rather than built.
- The subagent's tools are restricted by its frontmatter, but its Bash is not yet narrowed to read-only
  commands.
