# 0009 A delivery's own steps are tasks of its change

Status: accepted

## Context

`/deliver` asks for an independent review, a second review when the first led to fixes, and OpenSpec's
verify. They were asked for, not checked. The delivery of issue 23, on GitHub on Claude Sonnet 5.5, skipped
the second review and verify, said so in its report, and its branch still built and could have merged.

OpenSpec has no gate a project can attach to a step: a custom schema's documents are checked only for
existing, while planning, and a proposed gate system was not released. What OpenSpec does check is a change's
tasks: `openspec validate --archived` fails on an archived change with a task left unticked, and `build.sh`,
which main requires, runs it.

## Decision

- **Every change's tasks end with a Delivery group** of three tasks, worded the same in every change: the
  independent review, with the commit it was pinned to; the second review, with its commit or "not needed:
  no fixes"; and OpenSpec verify, with its counts. `openspec/config.yaml` tells whoever writes the tasks,
  and `tools/specs.mjs` fails the build when an open change lacks the group or one of the three.
- **`/deliver` ticks them as it goes,** recording what each asks for.
- **A delivery that skips a step is then a build failure,** on its pull request, wherever and on whichever
  model it ran. To finish it, do the unticked steps on the same branch, tick them, and push.

## Consequences

- The tasks are the record of the delivery, in the repository and archived with the change. Issue comments
  and progress reports stay as their runs left them.
- A ticked task is the session's own claim, not proof. Each records its evidence (a commit, the counts),
  and the pull request lists the findings, so a reviewer can check a claim against what it names.
- Changes archived before this decision have no Delivery group and are not checked for one.
- OpenSpec's own `archive` still archives a change with tasks unticked; the build is what refuses it.
