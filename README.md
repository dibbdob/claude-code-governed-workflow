# Governed delivery with Claude Code

A small codebase, and the Claude Code setup that governs how changes to it are made. [OpenSpec](https://github.com/Fission-AI/OpenSpec)
says what to build: a change with a proposal, tasks, and requirements with scenarios. Around it, this
repository adds how it gets built: a coordinator command that delivers a change end to end, subagents that
read on a cheaper model and cannot write, a refinement command that turns an issue into a change with the
person who raised it, a reviewer that is never told the author's reasons, hooks and
checks that enforce what prompts can only ask for, and a plugin that carries it to another repository. On
GitHub it works the standard way: a brief starts as an issue, its change is refined in a reviewed pull
request, a label hands it to Anthropic's Claude Code action, and pull requests are the only way into `main`.

The codebase itself, Ticketdesk, is deliberately small: the rules a support desk uses to set a ticket's
priority and its response deadline in business hours. It is there so the workflow has something real to
govern. To use the workflow on a project of your own, see [Setting up](docs/guide/setting-up.md).

## How a change gets made

```mermaid
flowchart LR
  A["Issue<br/>a brief"] --> B["/refine<br/>a change, named after it"]
  B --> C["Pull request<br/>reviewed and merged:<br/>approved"]
  C --> D["/deliver<br/>label on GitHub,<br/>or agent.sh"]
  D --> E["Pull request<br/>build, then a person"]
```

`/refine <issue>` takes a brief to a specification with the person who raised it, who needs to know nothing
of OpenSpec, git or the code, and publishes it as a pull request. Merging it approves the change, and the
`refined` workflow labels the issue `ready` and writes a summary of the change on it. `/deliver <change>`
then builds it on a branch of its own: grounding by two read-only subagents, tests before code, an
independent review, OpenSpec's verify and archive, and a pull request description that lists anything
reworded since approval.

**The [guide](docs/guide/README.md) says how to use it:** [refining](docs/guide/refining.md),
[delivering](docs/guide/delivering.md), [models and costs](docs/guide/models-and-costs.md),
[setting up](docs/guide/setting-up.md) and [when something goes wrong](docs/guide/troubleshooting.md).

## What it demonstrates

| Area | Where to look |
|---|---|
| **CLAUDE.md at three levels**: project, directory (loaded on demand), and a rule as a pointer at its check | [`CLAUDE.md`](CLAUDE.md), [`src/CLAUDE.md`](src/CLAUDE.md), [ADR 0001](docs/adr/0001-a-rule-points-at-what-enforces-it.md) |
| **Coordinator and subagents**: one command running a lifecycle, with grounding delegated | [`deliver.md`](.claude/commands/deliver.md), [ADR 0002](docs/adr/0002-reading-is-delegated-to-a-subagent.md) |
| **Parallel subagents with isolated context**: spec-reader and Explore in one message | [`deliver.md` step 1](.claude/commands/deliver.md) |
| **Model routing**: reading on Haiku, review on the session's model, and deliveries on GitHub on Sonnet with a dollar cap | [`spec-reader.md`](.claude/agents/spec-reader.md), [`independent-reviewer.md`](.claude/agents/independent-reviewer.md) |
| **Review without the author's rationale**, pinned to one commit, at most two rounds | [`independent-reviewer.md`](.claude/agents/independent-reviewer.md), [ADR 0003](docs/adr/0003-the-reviewer-is-not-told-why.md) |
| **A tool list before a guard, and a guard that fails closed**: the spec-reader has no shell; the reviewer's Bash is held by a PreToolUse hook scoped to it, with its own tests | [`spec-reader.md`](.claude/agents/spec-reader.md), [`read_only_bash.py`](.claude/hooks/read_only_bash.py), [tests](.claude/hooks/test_read_only_bash.py), [ADR 0004](docs/adr/0004-a-restriction-is-a-tool-list-or-a-hook.md) |
| **Permissions**: allow and deny rules for the project | [`.claude/settings.json`](.claude/settings.json) |
| **Headless Claude Code**: `claude -p`, JSON output, an allowlist of tools, `dontAsk`, a turn limit, the build as the judge | [`scripts/agent.sh`](scripts/agent.sh), [`headless-tools.txt`](scripts/headless-tools.txt), [tests](tools/agent.test.js) |
| **Plugin and marketplace**, generated from the project, validated, with a drift check | [`plugin/`](plugin), [`package_plugin.py`](tools/package_plugin.py), [ADR 0005](docs/adr/0005-the-plugin-is-generated-from-the-project.md) |
| **Specs with an established framework**: OpenSpec changes and specs, its own checks (`validate`, `validate --archived`, the `verify` workflow), and one check of ours: every scenario has a test | [`openspec/`](openspec), [`specs.mjs`](tools/specs.mjs), [tests](tools/specs.test.js), [ADR 0006](docs/adr/0006-specs-are-openspec-changes.md) |
| **Refinement as a pull request**: a change reaches main only through review, and its issue is then labelled ready | [`refined.yml`](.github/workflows/refined.yml), [ADR 0006](docs/adr/0006-specs-are-openspec-changes.md) |
| **Risk and revisions in OpenSpec's own config**: every proposal states a risk, medium or high ones get mitigations, and requirements revised during delivery are flagged for a person to confirm | [`openspec/config.yaml`](openspec/config.yaml) |
| **Worked examples in Gherkin**, checked by the build, and kept as data any implementation can be tested against | [`specs.mjs`](tools/specs.mjs), [`desk-rules.json`](test/fixtures/desk-rules.json), [ADR 0007](docs/adr/0007-a-scenario-is-an-outline-with-worked-examples.md) |
| **Claude Code on GitHub, the standard way**: the build on every pull request, and deliveries started by a label through Anthropic's Claude Code action, which runs this project's `/deliver`, subagents and hook as they are | [`build.yml`](.github/workflows/build.yml), [`deliver.yml`](.github/workflows/deliver.yml), [ADR 0008](docs/adr/0008-deliveries-run-on-the-standard-action.md) |
| **A delivery's steps as tasks**: every change's tasks end with grounding, the review, the second review and verify, so a delivery that skips one fails the build | [`config.yaml`](openspec/config.yaml), [`specs.mjs`](tools/specs.mjs), [ADR 0009](docs/adr/0009-a-deliverys-steps-are-tasks.md), [ADR 0011](docs/adr/0011-grounding-is-a-delivery-task.md) |
| **Refinement as a command**: `/refine` interviews the author, writes the change with OpenSpec's skills, and publishes the spec pull request; on GitHub, a label and `@claude` comments; the approved change summarised on its issue | [`refine.md`](.claude/commands/refine.md), [`refinement.sh`](scripts/refinement.sh), [`refine.yml`](.github/workflows/refine.yml), [`issue-summary.mjs`](tools/issue-summary.mjs), [ADR 0010](docs/adr/0010-refinement-is-a-command-too.md) |
| **Human gates**: a change is not ready until its pull request is approved; nothing merges without one | [`deliver.md` step 6](.claude/commands/deliver.md), [the ruleset](docs/guide/setting-up.md#on-github-once) |

## Run it

Needs Node 22.12 or later and Python 3. The build installs OpenSpec, pinned in `package.json`, if it is
missing.

```bash
./build.sh
```

The build is the whole gate: syntax, the UTC rule, OpenSpec's own validation (including that nothing is
archived half-done, a skipped delivery step included), that OpenSpec's verify skill is installed, scenario
coverage, that every open change's tasks end with the delivery steps, the tests, the plugin's
drift check, every relative link, the GitHub workflows (with [actionlint](https://github.com/rhysd/actionlint)),
and the hook's tests.

actionlint is the one check the build cannot install for itself. Install it once (`brew install actionlint`,
which brings shellcheck for the scripts in each step). Without it, a laptop build says the workflows were
NOT CHECKED and carries on; on GitHub the build workflow installs a pinned release first, and a build there
without it fails.

To set up a machine, use the workflow on a project of your own, or put it on GitHub, see
[Setting up](docs/guide/setting-up.md). To deliver a change once it is approved, see
[Delivering a change](docs/guide/delivering.md).

## What has and has not been verified

- **Verified by the build:** every gate, each shown failing on a planted breach before it was trusted;
  the hook's allow and refuse lists, its agent-type mode and its failure handling; each read-only agent's
  tool list; the plugin matching a fresh build of `.claude/`; the desk's rules against every worked example
  in `test/fixtures/desk-rules.json`.
- **Verified against a stand-in model:** `scripts/agent.sh` on a throwaway repository with a pretend
  `claude` ([`tools/agent.test.js`](tools/agent.test.js)): a delivery on its own branch, a change not
  approved, uncommitted work, a run that claims success without archiving, and runs that fail before and
  after committing.
- **Verified against OpenSpec 2.0.0 itself:** the specs pass `openspec validate --strict`; archiving a change
  with tasks undone makes `validate --archived` fail; `openspec instructions` returns the project's risk
  rules and its build and archive guidance.
- **Verified by `claude plugin validate --strict`:** the marketplace and plugin manifests.
- **Run on GitHub:** `./build.sh`, by the `build` workflow on every pull request and every push to `main`,
  which main's ruleset requires before a merge.
- **Run against a live model, on 2026-11-15:** six changes, each from a GitHub issue to a merged pull
  request.
  - Both were proposed with `/openspec-propose` in an attended session, as pull requests whose build checked
    their scenarios; merging them approved them, and `refined` labelled their issues `ready`.
  - Issue 1, a defect (an opening time that is not a date gave an "Invalid Date" deadline), was delivered on
    GitHub by the `deliver` label through the Claude Code action, for $2.06 in 11 turns. Its first commit was
    the failing test, with the failing build in its message; two rounds of review found four problems,
    each fixed behind a test that failed first. The action pushes a branch and links to a pull request, as
    it is meant to; a person opens it.
  - Issue 2, a new function for the business hours left before a deadline, was delivered by
    `scripts/agent.sh` for $2.05 in 30 turns. `dontAsk` refused two compound commands not on the tool list,
    and the run carried on without them.
  - The two were delivered at the same time from the same main, so the second to merge needed main merged
    into it: both had added a requirement and code in the same places, and both were kept.
  - Each reviewer left points for a person, in its pull request. One was a follow-up: once both changes
    were in, the deadline refused an opening time that is not a date while the hours left gave `NaN` for
    one.
  - Issue 8 was that follow-up, delivered by the `deliver` label for $1.67 in 10 turns: the failing test
    first, then the fix, reusing change 1's checks. Review found no defects, so there was one round.
  - The first three ran on Opus 5.5. Issue 14, naming the known priorities when one is refused, was the
    first on Claude Sonnet 5.5 with the $1.50 cap and the spec-reader on Haiku: $0.46 in 17 turns, with
    every step of `/deliver` done, one round of review, and no model above Sonnet used. It was also the
    smallest change of the four. Its reviewer found an older defect, left for its own change: a priority
    named like a built-in property, such as `toString`, is not refused.
  - Issue 18 fixed that defect, delivered by `scripts/agent.sh` on a laptop with no API key in its
    environment, so under the owner's Claude subscription instead: no dollar cost, 50 turns on the
    subscription's default model, Opus 5.5. The failing test came first; the fix was one line.
  - Issue 23 was the first delivery with the model read from `scripts/delivery-model.txt`: $0.35 in 12
    turns on Sonnet 5.5, its pull request saying so. It also skipped two steps `/deliver` requires, the
    second review after its fixes and OpenSpec's verify, and said so in its report. Both were then run
    headless on a laptop under the owner's subscription, on the same model, and came back clean. Nothing
    then failed a delivery that skipped a step; ADR 0009 made the steps tasks of the change, so one skipped
    now fails the build. Shown on a planted change: no Delivery group failed `tools/specs.mjs`, and one
    archived with its second review unticked failed `openspec validate --archived`.
- **The plugin, installed and run live, on 2026-11-15:** installed from `./plugin` into a throwaway
  repository, at local scope, for $0.48 in all. With Bash allowed to every agent, so that only the plugin's
  hook could stop a command, the plugin's reviewer ran `git rev-parse` and `git show <rev>:<path>`, and was
  refused `touch`, a `>` redirect and a bare `git log` (whose message the review must not read), each with
  the hook's reason and the plugin's name; neither file it tried to write exists. The main session was not
  held, and the spec-reader had no shell to try. The plugin's `/deliver`, given a change that does not
  exist, stopped at its gates and changed nothing.
- **Setting up, on 2026-11-15:** `scripts/adopt.sh` run against throwaway projects with stand-ins for
  `openspec init` and npm ([tests](tools/adopt.test.js)), and once for real with OpenSpec 2.0.0 and npm,
  after which the adopted project's starting build passed, actionlint included.
  `scripts/setup-machine.sh` run on one Mac, where it updated OpenSpec from 1.14.1 to the pinned 2.0.0 and
  found the rest in place; its Homebrew installs, `gh auth login` and `--plugin` have not yet been run.
- **`/refine` on GitHub, run live on 2026-11-15:** issue 29, a throwaway change (say whether a ticket is
  overdue), from a two-sentence brief to merged code for $0.56 in all, on Sonnet 5.5.
  - The `refine` label drafted the change in 11 turns for $0.17: plain terms, four worked examples with the
    exact-deadline boundary, a low risk, and three numbered questions, each with its assumption.
  - The run then found three faults, fixed in #30 and each shown working on the next run. The action
    revokes its token before the next step, so the spec pull request was not opened ("Bad credentials"); it
    is now opened with the workflow's token, which starts the build itself. `openspec` was not on the PATH,
    so Claude wrote the change by hand; `refine` and `deliver` now put the pinned copy there. And a
    `refinement.sh` test read the bare remote in a way the runner's `safe.bareRepository=explicit` refuses.
  - One `@claude` comment on the spec pull request, answering the questions and asking for a public-holiday
    example, revised the change in 9 turns for $0.10. Claude answered each point against the change, and
    flagged two examples it had added itself. Nobody answered that flag before approval, so they went in:
    checking that the examples are the author's is the reviewer's job, and only a person can do it.
  - Merging the spec pull request labelled the issue `ready` and wrote the summary below its brief: plain
    terms, both tables of examples, the risk, and links to the change as approved and to the discussion.
  - The `deliver` label then delivered it in 20 turns for $0.29: review found no defects, verify found no
    issues, and the change was archived. It skipped the spec-reader and Explore, said so, and nothing
    caught it: the build checks the Delivery tasks, not the grounding. `revised` rightly did nothing, since
    no requirement changed after approval.
- **`/refine` and its workflows, without GitHub or a model:** `scripts/refinement.sh` run
  for real against a throwaway repository with a local remote and a stand-in `gh`
  ([tests](tools/refinement.test.js)); the summary on an issue, written, replaced and noted
  ([tests](tools/issue-summary.test.js)); and every workflow checked by actionlint, shown failing on a
  planted typo in a step's output.
- **`/refine` in a session, and a delivery that rewords a requirement, run live on 2026-11-15:** issue 35
  (say when the desk is next open) was refined in a session with `scripts/refinement.sh`, on the owner's
  subscription, and its spec pull request merged; `refined` labelled it `ready` and wrote its summary. The
  `deliver` label delivered it in 18 turns for $0.70 on Sonnet 5.5, with the Grounding task ticked. One
  requirement was planted with loose wording; the review caught it, the delivery reworded it, the pull
  request listed it under "Changed since approval", and `revised` noted it on the issue.
- **Not yet run against a live model:** `/refine` in a session with an author other than the developer
  answering; OpenSpec's `explore` skill; the archive guidance's "please confirm the intent" question, which
  only an attended delivery asks; and a delivery's `Closes #<n>` line closing its issue on merge.
- **Gaps the run found, since closed:** the `deliver` and `refine` runs now install the same pinned
  actionlint as the build workflow (one shared step, `.github/actions/install-actionlint`), so the build
  Claude runs on GitHub's machine checks the workflows too; and grounding is now a Delivery task
  ([ADR 0011](docs/adr/0011-grounding-is-a-delivery-task.md)), so a delivery that skips it fails the build
  when its change is archived. Neither has yet been seen on a live run.

## Layout

```
.claude/
  agents/        spec-reader, independent-reviewer
  commands/      deliver, refine
  hooks/         read_only_bash.py and its tests
  skills/        links to OpenSpec's skills
  settings.json  permissions
.agents/skills/  OpenSpec's skills, shared by any AI tool (generated by openspec init and update)
docs/guide/      how to refine, deliver and set up
docs/adr/        why each decision was made
openspec/
  specs/         how the system works now, requirement by requirement
  changes/       approved changes still to deliver, and archive/ for delivered ones
.github/         the build check, the ready label and issue summary, and refinements and deliveries
                 started by a label
plugin/          a marketplace with one plugin, generated from .claude/
scripts/         agent.sh runs a delivery unattended; refinement.sh publishes a refinement;
                 headless-tools.txt and refine-tools.txt, what each may use on its own;
                 setup-machine.sh and adopt.sh set up a machine and another project
src/, test/      Ticketdesk, its tests, and the worked examples it shares
tools/           specs.mjs, links.mjs, issue-summary.mjs, package_plugin.py, and the stand-in claude
                 and gh for tests
build.sh         the gate
```
