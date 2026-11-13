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
