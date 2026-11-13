# Ticketdesk

The rules a support desk uses to set a ticket's priority and its response deadline. Plain JavaScript (ES
modules), no dependencies, Node's built-in test runner.

A rule in this file is a pointer at whatever enforces it. When a lesson can be checked, the check goes in
`build.sh` and only the pointer stays here ([ADR 0001](docs/adr/0001-a-rule-points-at-what-enforces-it.md)).

## Build

```bash
./build.sh
```

The whole of it is the gate; a test file you chose to run is not.

## Specifications

Every feature starts as a specification in `docs/specs/`, with acceptance criteria in Given/When/Then form.
Before implementing one, number its criteria with `node tools/criteria.mjs number <spec>`. A test names
the criterion it covers in its title, `[0001-AC-2]`, and `build.sh` fails a finished specification with a
criterion no test names.

`build.sh` also fails when a numbered criterion's words differ from `main`. Amending a specification is a
change of its own, built with `ALLOW_CRITERIA_CHANGE=1`.

`build.sh` runs one at a time per checkout (`.build.lock`).

## Delivering a specification

`/deliver <number>` takes a ready specification from its branch to a merge message
([command](.claude/commands/deliver.md)). It reads through the `spec-reader` subagent first
([ADR 0002](docs/adr/0002-reading-is-delegated-to-a-subagent.md)).

`./scripts/agent.sh <number>` runs the same `/deliver` headless, then runs the build itself.
