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

Never change a specification's acceptance criteria while implementing it. If one looks wrong, say so in
the commit message and build to it as written. (Not yet enforced.)

## Unattended work

`./scripts/agent.sh <number>` hands a specification marked `Status: ready` to a headless Claude Code run on
its own branch, then runs the build itself.
