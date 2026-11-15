# Models

A delivery uses more than one model. Each part runs on the one that suits it.

| Part | Model | Why |
|---|---|---|
| The delivery session, which builds the change | Claude Sonnet 5.5, from [`delivery-model.txt`](../../scripts/delivery-model.txt) | Writing tests and code to a precise specification is everyday coding work. One file sets the default for GitHub and `agent.sh`. |
| `spec-reader` | Claude Haiku 5.5 | Reading documents and quoting them word for word is not where a stronger model is needed. It reads in its own context, so a large change does not crowd the builder's, and it has no shell. |
| `Explore` | Claude Code's built-in read-only agent | Surveys the code the change touches, alongside the spec-reader. |
| `independent-reviewer` | The session's model | Review is judgement, so it gets the builder's strength. Its independence comes from what it is not told, not from a different model. |
| `/refine` | The default on GitHub; the session's model otherwise | Interviewing and writing a specification is writing work, so the default is enough. |

| Model | ID |
|---|---|
| Claude Opus 5.5 | `claude-opus-5-5` |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` |
| Claude Haiku 5.5 | `claude-haiku-5-5` |

## Switching models

| To | Do this |
|---|---|
| Change the default for every delivery, on GitHub and with `agent.sh` | Edit [`delivery-model.txt`](../../scripts/delivery-model.txt), and check the cap and turn limit in [`deliver.yml`](../../.github/workflows/deliver.yml) still suit the new model. Change both in one pull request. |
| Run one delivery on a different model, on your machine | `./scripts/agent.sh 57 --model claude-opus-5-5` |
| Deliver in a session on any model | Select it in Claude Code before running `/deliver`; the reviewer follows the session's model. |
| Refine on a different model | In a session, select it before `/refine`. On GitHub, `/refine` uses the default. |

GitHub has no per-run override: a run there always uses the default, so a change that needs a stronger model is
delivered on your machine instead, where `--model` applies and the plan's limits replace the dollar cap.

Every delivery's pull request says which model delivered it and whether that was the default. When changes
keep needing `--model`, that record is the case for changing `delivery-model.txt`.
