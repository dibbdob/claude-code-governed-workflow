# Ticketdesk

The rules a support desk uses to set a ticket's priority and its response deadline. Plain JavaScript (ES
modules), no dependencies, Node's built-in test runner.

## Build

```bash
./build.sh
```

## Conventions

- Every feature starts as a specification in `docs/specs/`, with acceptance criteria in Given/When/Then form.
- Times are UTC. Business hours are Monday to Friday, 09:00 to 17:00.
- Keep the library free of dependencies.

## Unattended work

`./scripts/agent.sh <number>` hands a specification marked `Status: ready` to a headless Claude Code run on
its own branch.

## Lessons

- Run `./build.sh`, all of it, before saying a change works. A test file you chose to run is not the gate.
- Name each test after the acceptance criterion it covers, so a reader can tell which criterion has no test.
- Never change a specification's acceptance criteria while implementing it. If one looks wrong, say so in
  the commit message and build to it as written.
- Use only the UTC forms of the `Date` methods (`getUTCHours`, not `getHours`). The local forms pass on a
  machine set to UTC and fail everywhere else.
