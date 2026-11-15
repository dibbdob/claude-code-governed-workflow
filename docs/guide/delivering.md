# Delivering a change

`/deliver <change>` builds an approved change on a branch of its own and stops at a pull request description.
The command is [`deliver.md`](../../.claude/commands/deliver.md). It is a coordinator: it hands reading and
reviewing to subagents and keeps the building for itself.

## What it does

| # | Step | What happens |
|---|---|---|
| 0 | Gates | Stops unless the change is on `main` and the session is on another branch. A defect is reproduced by a failing test, with the failing build in its commit message, before any fix. Requirements may be reworded only while their intent holds. |
| 1 | Grounding, in parallel | Two subagents start at once. The `spec-reader` (Haiku, no shell) returns every requirement and scenario word for word, and anything stale. `Explore` surveys the code they touch. The session says in five lines what it will build, and ticks the Grounding task. |
| 2 | Build | OpenSpec's `openspec-apply-change` works through the tasks. Tests come first, one per scenario, named `[<capability>] <scenario name>`. `./build.sh` runs before every commit, and each commit message starts with the change name. |
| 3 | Independent review | The `independent-reviewer` is given the change name, one commit and the lines where tests cite scenarios, and nothing else. It cannot read commit messages, and a hook keeps its shell read-only. Each finding is fixed behind a test that fails first, or recorded. At most two rounds. |
| 4 | Verify | OpenSpec's `openspec-verify-change` checks tasks, requirements and design. CRITICAL issues are fixed; warnings go in the pull request. |
| 5 | Archive | Any requirement changed since approval is listed in plain words with its risk. In a session you are asked to confirm the intent; unattended, the list goes first in the pull request. `openspec archive` then folds the change into the main specs. |
| 6 | Pull request description | Written to `.delivery/pull-request.md`: a `Closes #n` line, changes since approval, plain terms, risk, what changed, tests, review findings. It does not push or open the pull request unless told to. |

**What enforces it.** Steps 1, 3 and 4 are tasks in every change's task list, a Delivery group the build
requires, so a change cannot be archived with one skipped
([ADR 0009](../adr/0009-a-deliverys-steps-are-tasks.md), [ADR 0011](../adr/0011-grounding-is-a-delivery-task.md)).
The build also fails when a scenario has no test naming it.

**What it will not do** is renegotiate an approved change. If it thinks the change is wrong, it says so in a
sentence or two and builds to it anyway. If the intent would have to change, it stops and says a new proposal
is needed.

## Where to run it

| | On GitHub (`deliver` label) | On your machine (`agent.sh`, or a session) |
|---|---|---|
| Runs under | The repository's `ANTHROPIC_API_KEY` | Your Claude login: on a subscription, the plan's limits apply |
| Limit | $1.50 a run | None; the plan has its own limits |
| Model | Always the default, Sonnet 5.5 | The default, or `--model` for one run; any model in a session |
| Turn limit | 60 | 60 with `agent.sh`; none in a session |
| Archive checked | By the person reviewing the pull request | By `agent.sh`, before it finishes |
| Pull request | Branch pushed; you open it from the link | You push and open it |
| Commits by | The Claude app's bot | You |
| Two at once | Fine, on separate issues | Needs two clones |

The reasons for running the same delivery in both places are in
[ADR 0008](../adr/0008-deliveries-run-on-the-standard-action.md).

### On GitHub

Before adding the label: the issue is labelled `ready`, it is assigned to you, and nobody else has a delivery
of the same change in flight.

1. Add `deliver` to the issue.
2. The `deliver` workflow checks out `main`, installs the pinned OpenSpec, and finds the change by its issue
   number. If there is none, it fails at once: *No approved change on main is named after issue #n*.
3. It reads the model from `scripts/delivery-model.txt` and the tools from `scripts/headless-tools.txt`, and
   starts the Claude Code action with the cap, the turn limit and that tool list.
4. The action makes a `deliver/…` branch, keeps a progress comment on the issue, runs `/deliver`, pushes the
   branch, and puts the description in its comment.
5. **You open the pull request** from the link in the comment, with that description. The `build` check
   runs, and a person reviews and merges.

A run that reaches the cap stops where it is, and its branch keeps whatever it committed. Remove and re-add
the label, or finish it on your machine: check out the branch and run `/deliver <change>` in a session, which
carries on from the tasks already ticked.

### On your machine

With no `ANTHROPIC_API_KEY` in the environment, Claude Code runs under your subscription. A key that is set
takes precedence and bills the API, so check first:

```bash
echo ${ANTHROPIC_API_KEY:+"API key set: this run will bill the API"}   # prints nothing on a subscription
```

In a session, `/status` shows which login is in use.

**Unattended, with `agent.sh`.** The same run as GitHub's, from a clean `main`:

```bash
git switch main && git pull
./scripts/agent.sh 57                              # the change for issue 57, on the default model
./scripts/agent.sh 57 --model claude-opus-5-5      # the same, on a stronger model, for one run
```

It makes `deliver/<change>` from `main`, runs `/deliver` headless with `--permission-mode dontAsk`, the shared
tool list and 60 turns, and keeps the run's JSON in `runs/`. Then it checks what the run left rather than
believing its report: nothing uncommitted, the change archived, `./build.sh` passing. A run that fails before
committing anything removes its empty branch, so running it again simply works. You push the branch and open
the pull request.

**Attended, in a session.** Use this to watch, steer, or answer the archive step's question yourself:

```bash
git switch -c deliver/57-bank-holidays
claude                                             # then: /deliver 57-bank-holidays
```

The steps are the same. At the archive step you are asked to confirm the intent of any reworded requirement,
and the model is whichever you have selected. Sessions are denied `git push`, so it tells you when the branch
is ready and you push it.

## What to check in the pull request

| Section | Why you read it |
|---|---|
| Changed since approval | Requirements the delivery reworded. Ask the spec author to confirm the intent is the same before merging. In the delivery of issue 35, the reviewer found a requirement's first sentence contradicting its own worked example; the delivery reworded the sentence, left the examples alone, and listed it here with the old and new wording. |
| Archive | Nothing on GitHub checks that the change was archived. Confirm `openspec/changes/<change>` moved to `archive/`. |
| Review findings | Points the reviewer left for a person to judge. |
| Tasks | The Delivery group's four tasks: Grounding (what was stale, or "nothing stale"), the review's commit, the second review or "not needed: no fixes", and the verify counts. |
