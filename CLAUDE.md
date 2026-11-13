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
([ADR 0002](docs/adr/0002-reading-is-delegated-to-a-subagent.md)), and is reviewed by the
`independent-reviewer` subagent, pinned to one commit and given no rationale
([ADR 0003](docs/adr/0003-the-reviewer-is-not-told-why.md)). The spec-reader has no shell
([ADR 0006](docs/adr/0006-an-agent-that-can-do-without-a-shell-gets-none.md)); the reviewer's Bash is held
to read-only commands by a hook in its frontmatter, whose tests run in `build.sh`
([ADR 0004](docs/adr/0004-a-restriction-is-a-hook-not-a-sentence.md)). After changing the hook, run
`./build.sh`; nothing else exercises it outside a session.

`.claude/settings.json` allows the build and read-only git, and denies `git push` and `git reset --hard`.

`./scripts/agent.sh <number>` runs the same `/deliver` headless, then runs the build itself.

## The plugin

`plugin/` is a marketplace holding one plugin, `governed-delivery`, generated from `.claude/` by
`python3 tools/package_plugin.py`. Edit `.claude/`, regenerate, and commit both; `build.sh` fails when they
differ ([ADR 0005](docs/adr/0005-the-plugin-is-generated-from-the-project.md)).
