# Reference

## Labels

| Label | Set by | What it does |
|---|---|---|
| `refine` | The spec author, or anyone with triage rights | Starts a refinement on GitHub. Not needed in a session. |
| `ready` | The workflow, automatically | The change is approved and on `main`. Do not add it by hand: a delivery would still refuse to start. |
| `deliver` | Anyone with triage rights | Starts a delivery on GitHub. It spends API credit, so **who may add labels is who may spend**. |

The spec pull request says `Refines #n`, so merging it leaves the issue open. The code pull request says
`Closes #n`, so merging it closes the issue. To run a delivery again, remove `deliver` and add it back.

## Models

| Part | Model |
|---|---|
| The delivery session | Claude Sonnet 5.5, from [`delivery-model.txt`](../../scripts/delivery-model.txt) |
| `spec-reader` | Claude Haiku 5.5 |
| `independent-reviewer` | The session's model |
| `/refine` | On GitHub, the model in `delivery-model.txt`. In a session, the session's model |

Model IDs: `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`.

| To | Do this |
|---|---|
| Change the default for every delivery | Edit `delivery-model.txt`, and check the cap in [`deliver.yml`](../../.github/workflows/deliver.yml) still suits it. |
| Run one delivery on another model | `./scripts/agent.sh 57 --model claude-opus-5-5` |
| Deliver or refine in a session on any model | Select it in Claude Code first. |

GitHub has no per-run override, so a change that needs a stronger model is delivered on your machine.

## When something goes wrong

| You see | Cause and fix |
|---|---|
| *No approved change on main is named after issue #n* | The issue has not been refined, or its spec pull request is not merged. Refine it first. |
| *'57' is not an approved change on main*, from `agent.sh` | The same, locally. Also check your local `main` is up to date. |
| *Issue #n is already refined*, from `/refine` | Its change is on `main`. A change to an approved specification is a new issue. |
| *A refinement changes only its change folder* | `refinement.sh publish` found other files changed. Discard them, or commit them elsewhere. |
| A refinement run posts no link to a spec pull request | The run pushed nothing. Claude's comment on the issue says why. |
| No reply to an `@claude` comment | The commenter lacks write access, the branch does not start `refine/`, or the comment was edited rather than new. |
| `/deliver` stops because it is on `main` | Make a branch first: `git switch -c deliver/<change>`. |
| *Commit or stash your changes first* | `agent.sh` and `refinement.sh start` need a clean checkout. |
| A GitHub run stops part-way | It reached its cap: $1.50 or 60 turns for a delivery, $1.00 or 40 turns for a refinement. Read the branch, then re-label, comment again, or finish locally. |
| *The change is not archived* | The run skipped the archive step. Run `/deliver` again on the branch. |
| A command was refused in an unattended run | Anything not in `scripts/headless-tools.txt` is refused. Add a tool only if every delivery needs it. |
| The build says `verify` is missing | Run `scripts/setup-machine.sh`, then `openspec update`. |
| The build says the workflows were *NOT CHECKED* | actionlint is not installed. Run `scripts/setup-machine.sh`. |
| `refinement.sh publish` cannot open the pull request | The GitHub CLI is not signed in. Run `gh auth login`. |
| A run on your subscription billed the API | `ANTHROPIC_API_KEY` was set in the shell. Unset it. |
| A merged delivery left its issue open | Its description lacked the `Closes #n` line. Close the issue by hand. |
