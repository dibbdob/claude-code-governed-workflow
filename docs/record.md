# What has been run, and what has not

The record of how far the workflow has been tested: by the build, against stand-ins, and on live runs with
their costs. Each live run is listed as it happened, faults included. The summary is in the
[README](../README.md#how-well-it-is-tested); what each run cost is also in the guide's
[models and costs](guide/models-and-costs.md).

- **Verified by the build:** every gate, each shown failing on a planted breach before it was trusted;
  the hook's allow and refuse lists, its agent-type mode and its failure handling; each read-only agent's
  tool list; the plugin matching a fresh build of `.claude/`; the desk's rules against every worked example
  in `test/fixtures/desk-rules.json`.
- **Verified against a stand-in model:** `scripts/agent.sh` on a throwaway repository with a pretend
  `claude` ([`tools/agent.test.js`](../tools/agent.test.js)): a delivery on its own branch, a change not
  approved, uncommitted work, a run that claims success without archiving, and runs that fail before and
  after committing.
- **Verified against OpenSpec 2.0.0 itself:** the specs pass `openspec validate --strict`; archiving a change
  with tasks undone makes `validate --archived` fail; `openspec instructions` returns the project's risk
  rules and its build and archive guidance.
- **Verified by `claude plugin validate --strict`:** the marketplace and plugin manifests.
- **Run on GitHub:** `./build.sh`, by the `build` workflow on every pull request and every push to `main`,
  which main's ruleset requires before a merge.
- **Run against a live model, on 2026-11-15:** the first six changes, each from a GitHub issue to a merged
  pull request.
  - Issues 1 and 2 were proposed with `/openspec-propose` in an attended session, as pull requests whose build checked
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
  `openspec init` and npm ([tests](../tools/adopt.test.js)), and once for real with OpenSpec 2.0.0 and npm,
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
  ([tests](../tools/refinement.test.js)); the summary on an issue, written, replaced and noted
  ([tests](../tools/issue-summary.test.js)); and every workflow checked by actionlint, shown failing on a
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
  ([ADR 0011](adr/0011-grounding-is-a-delivery-task.md)), so a delivery that skips it fails the build
  when its change is archived. Both were seen working on issue 35's delivery, which ran the shared actionlint
  step and ticked its Grounding task.
