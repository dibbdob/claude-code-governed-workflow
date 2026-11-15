# 0008 Deliveries run on the standard Claude Code action

Status: accepted

## Context

A delivery should be able to run with nobody's machine involved: a person approves a change, and the work
happens on GitHub. Anthropic's Claude Code action does the GitHub part as standard: a label on an issue
starts it, it works on a branch of its own, keeps a progress comment on the issue, pushes with the Claude
GitHub app's token, and links to a pull request for a person to open. Branch protection and a required
review decide who may merge.

What makes a delivery governed is not on that list, and does not need to be: `/deliver`, its subagents, the
reviewer's hook and the build are in the checkout, and the action runs them as they are.

A team could also want more around a delivery: a claim on the issue so two people cannot start the same
change, a folder per delivery, commits credited to the person rather than a bot, and a check that a pull
request's author is the issue's assignee. All of it is team process rather than Claude Code, and each piece
is code to maintain.

## Decision

- **On GitHub, the `deliver` label runs the action in its standard tag mode.** It runs `/deliver` on a
  `deliver/` branch the action makes, with the tools `scripts/headless-tools.txt` lists, and its default
  permission mode. It runs on the model `scripts/delivery-model.txt` names (Claude Sonnet 5.5), capped at
  $1.50 a run (`--max-budget-usd`) as well as by the turn limit. Setting it up is installing the Claude GitHub app and adding `ANTHROPIC_API_KEY`.
- **On a laptop, `scripts/agent.sh` runs `/deliver` headless** on a `deliver/<change>` branch made from main,
  with `--permission-mode dontAsk`, the same tool list, the same default model and the same turn limit, then
  checks what it left: nothing uncommitted, the change archived, the build passing. A person pushes the
  branch and opens the pull request.
- **The two differ in two ways only.** A laptop runs under the person's own Claude Code login, usually a
  plan, where GitHub runs on the API key. And on a laptop the model can be chosen for one run
  (`agent.sh 57 --model claude-opus-5-5`), for a change the default cannot do: the person runs it again
  locally on a stronger model, at the cost of their own plan. GitHub always runs the default. Either way the
  pull request description says which model delivered the change, and whether it was the default.
- **No team layer.** Who is delivering a change is whoever the issue is assigned to, set by hand as on any
  GitHub project. `build` is the one check main requires.

## Consequences

- Two people can start the same change without being warned; the issue's assignee is what most teams rely
  on.
- On GitHub, the action's commits are its own bot's, and its permission mode is the action's default rather
  than `dontAsk`. The build on the pull request and a person's review are what check the result.
- Nothing on GitHub checks the change was archived before the pull request is opened; the reviewer of the
  pull request sees it. `scripts/agent.sh` checks it on a laptop.
- A delivery that reaches the cap stops part-way: its branch keeps what it committed, and a person labels
  the issue again or finishes it. The first three deliveries, on Opus 5.5, cost $1.67 to $2.06 each.
- `agent.sh` has no dollar cap: the person's plan has its own limits, and a $1.50 cap would stop a stronger
  model before it finished (the Opus delivery of issue 18 would have cost $1.73 on the API).
- Changes that keep needing `--model` are visible in their pull requests, and are the case for changing the
  default.
- `agent.sh` works in the person's own checkout, so two local deliveries at once need two clones.
- `dontAsk` refuses what the list does not name, but not every command: Claude Code runs an in-place
  `sed -i` unlisted. The build and the review check what a run leaves.
