# Models and costs

Each part of a run uses the cheapest model that does that part well.

| Part | Model | Why |
|---|---|---|
| The delivery session, which builds the change | Claude Sonnet 5.5, from [`delivery-model.txt`](../../scripts/delivery-model.txt) | Writing tests and code to a precise specification is everyday coding, and Sonnet does it at half Opus's price. On GitHub it is what keeps a run inside the $1.50 cap: the first deliveries, on Opus, cost $1.67–2.06. One file sets the default for GitHub and `agent.sh`. |
| `spec-reader` | Claude Haiku 5.5 | Reading documents and quoting them word for word is not where a stronger model earns its cost. It reads in its own context, so a large change does not crowd the builder's, and it has no shell. |
| `Explore` | Claude Code's built-in read-only agent | Surveys the code the change touches, alongside the spec-reader. |
| `independent-reviewer` | The session's model | Review is judgement, so it gets the builder's strength. Its independence comes from what it is not told, not from a different model. |
| `/refine` | The default on GitHub; the session's model otherwise | Interviewing and writing a specification is writing work, so Sonnet is enough. |
| An override, for one run | Claude Opus 5.5, with `--model claude-opus-5-5` | For a change the default could not finish: run it again locally under your plan. GitHub has no override, since a stronger model would reach the cap. |

Every pull request says which model delivered it and whether that was the default. When changes keep needing
`--model`, that record is the case for changing `delivery-model.txt`, and the cap in
[`deliver.yml`](../../.github/workflows/deliver.yml) with it, in one pull request.

## Prices

Anthropic's published API rates per million tokens, as of 3 November 2026. They apply only on GitHub, or
wherever an API key is in use; check them before quoting a budget.

| Model | ID | Input | Output |
|---|---|---:|---:|
| Claude Opus 5.5 | `claude-opus-5-5` | $4.00 | $20.00 |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | $2.00 | $10.00 |
| Claude Haiku 5.5 | `claude-haiku-5-5` | $0.10 | $0.50 |

## What runs have cost

Every delivery so far, each from an issue to a merged pull request, on 15 November 2026. The codebase is
small, so treat these as a floor for larger changes rather than an estimate.

| Issue | Change | Where | Model | Turns | Cost |
|---|---|---|---|---:|---:|
| 1 | A deadline for an opening time that is not a date | GitHub | Opus 5.5 | 11 | $2.06 |
| 2 | Business hours left before a deadline | `agent.sh` | Opus 5.5 | 30 | $2.05 |
| 8 | Hours left for a time that is not a date | GitHub | Opus 5.5 | 10 | $1.67 |
| 14 | Name the known priorities when one is refused | GitHub | Sonnet 5.5 | 17 | $0.46 |
| 18 | A priority named like a built-in property | `agent.sh`, subscription | Opus 5.5 | 50 | $0 |
| 23 | Refuse a priority that is not text | GitHub | Sonnet 5.5 | 12 | $0.35 |
| 29 | Say whether a ticket is overdue | GitHub | Sonnet 5.5 | 20 | $0.29 |
| 35 | Say when the desk is next open | GitHub | Sonnet 5.5 | 18 | $0.70 |

Moving the default from Opus to Sonnet took a GitHub delivery from about $1.70–2.10 to $0.29–0.70. Part of
that is smaller changes; the price per token is half. Issue 35 cost the most of the Sonnet runs because its
first review led to a fix, so it was reviewed twice.

Refinement is cheaper. Issue 29 was refined on GitHub for $0.27: $0.17 for the draft from the brief, and
$0.10 for one round of answers. Each further round costs about the same as that one. Issue 35 was refined in a
session, on the plan, so it added nothing to the bill.

## Keeping costs down

- **On GitHub, use a key from an account with a spend limit.** Each run is capped, but a run that reaches the
  cap has spent it, and a re-run after a failure costs again: read the branch before re-labelling.
- **Labelling rights are spending rights.** Give triage access only to people who should be able to start a
  run.
- **Refine well.** A change with precise scenarios and worked examples needs fewer turns and fewer review
  rounds. Most of the cost of a vague change is spent finding out what it meant.
- **Keep changes small.** One issue, one behaviour.
- **Use Opus when the default could not finish, not by habit.** On a subscription it uses the allowance
  faster.
- **A long refinement is cheaper in a session**, where each round is on the author's plan rather than a
  separate paid run.
