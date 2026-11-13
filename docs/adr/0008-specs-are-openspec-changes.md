# 0008 Specs are OpenSpec changes

Status: accepted. Replaces the parts of ADR 0007 about specification numbers and the `Issue:` line.

## Context

The project had built its own way of writing specifications: a `/write-spec` command, a file format with a
`Status:` line, numbered acceptance criteria, and a tool that numbered them, checked each had a test, and
stopped them being reworded. With a team came more: an `Issue:` line to link each specification to its
GitHub issue, and a check for two people taking the same number on the same day.

There was also no defined refinement step. A draft listed its open questions, and a person was trusted to
answer them before changing `Status: draft` to `ready`.

OpenSpec is an open-source framework for exactly this part: a change is a folder holding a proposal, a task
list, and the requirements it adds, alters or removes, each with scenarios; archiving a delivered change
folds its requirements into the project's main specs, so they describe the system as it now is. It comes with
Claude Code commands for writing and applying changes. Common practice elsewhere (Kubernetes enhancement
proposals, Rust RFCs) is that a proposal is approved by merging its reviewed pull request, and is numbered
after its GitHub issue or pull request.

## Decision

- **OpenSpec holds what to build.** `openspec/specs/` describes the system as it is; `openspec/changes/`
  holds each change still to be delivered. OpenSpec's `openspec-propose` skill writes a change. `/write-spec`, the old format and
  `tools/criteria.mjs` are gone.
- **A change is named after its issue**, as `<issue-number>-<what-it-does>`, such as `57-bank-holidays`. The
  issue number comes from the name, so there is no separate numbering and nothing to clash.
- **Refinement is the change's pull request.** A brief starts in a GitHub issue. Its change is proposed on a
  branch and reviewed as a pull request. Merging it is the approval: **a change on the team's main is ready
  to deliver**, and the `refined` workflow labels its issue `ready` so the status shows where people look.
  Readiness needs no field anyone could set by hand, and can be checked offline from the last fetched main.
- **`/deliver` wraps OpenSpec's own apply step.** The building is OpenSpec's `openspec-apply-change` skill,
  which works through the change's tasks and hands over this project's build rules from
  `openspec/config.yaml` (test first, a test named after every scenario, the build before every commit, a
  defect reproduced before it is fixed). The spec-reader reads the documents `openspec instructions apply`
  lists, not a list of our own. Around that, `/deliver` keeps what OpenSpec does not do: its gates, the
  spec-reader with no shell, the reviewer who is not told why, and the build as the judge. Its last steps archive the change and write the pull request description.
  `finish-delivery.sh` asks OpenSpec (`openspec list`) whether the change is archived, and refuses it until
  it is, so the specs and the code that meets them merge together.
- **OpenSpec's own features come first; our own code only where it has nothing equivalent.** The build runs
  `openspec validate --all --strict` (well-formed specs and changes) and `openspec validate --archived` (no
  change archived with tasks left undone). `/deliver` runs OpenSpec's `verify` workflow before archiving, as a
  self-check of tasks, requirements and design; the reviewer stays the independent check. One check of our
  own remains, in `tools/specs.mjs`: every scenario in the main specs has a test that names it, as
  `[<capability>] <scenario name>`. OpenSpec's `verify` looks at scenario coverage too, but as the AI's
  judgement; this one fails the build.
- **A change may be revised during delivery, while its intent holds.** That is OpenSpec's view: a change is a
  living plan, revised with its `openspec-update-change` skill, and a new change only when the intent moves.
  Freezing a change's requirements once approved, and failing the build if they changed, was considered
  and rejected: it goes against the framework. Instead, the project's rules in
  `openspec/config.yaml` make revisions visible: when a change is archived, each requirement that changed
  since approval is listed in plain words, with why, whether the intent is the same, and what could go wrong.
  A person is asked to confirm; in an unattended run the list goes first in the pull request, under
  "Changed since approval: please confirm the intent is the same". If the intent has changed, the change is
  not archived.
- **Risk is analysed at refinement, inside OpenSpec.** The same config's rules require every proposal to state
  a risk level (low, medium or high) and why, and every medium or high one to have a design whose "Risks /
  Trade-offs" pair each risk with a mitigation a test or the reviewer can check, with a task to put it in
  place. Reviewers of the proposal see the risk before approving it.
- **OpenSpec is pinned to an exact version** in `package.json`, installed without running install scripts,
  and run from the project's own copy. **It follows OpenSpec's latest release.** OpenSpec is evolving
  quickly, and keeping up is cheaper than catching up: when a release comes out, the pin moves, `openspec
  update` refreshes its skills, and the build shows what, if anything, needs fixing. This stage was first
  built on 1.16.0, and 2.0.0 came out while it was in progress; it moved to 2.0.0 before merging. 2.0
  replaced its `/opsx:*` commands with skills, moved them to a shared `.agents/skills/` folder, and needs
  Node 22.12, while the file formats and commands this repository's scripts rely on were unchanged.
- **Its usage reporting is off** wherever this project runs it: `build.sh`, `scripts/agent.sh` and the GitHub
  workflows set `OPENSPEC_TELEMETRY=0`. By default it sends an anonymous id, the command name and the
  version. A person running it by hand chooses for themselves.

## Consequences

- The project no longer maintains its own spec format or numbering. What it maintains is what makes it
  different: the review, the guards and the checks.
- The project now has a dependency. `build.sh` installs it when it is missing.
- OpenSpec's `verify` workflow is not in its default profile. It is switched on per machine (`openspec
  config set profile custom`, with `verify` in `workflows`), and `openspec update` matches a project's skills
  to the machine's profile, so a teammate on the default profile would remove it. The build fails if it is
  missing, with the fix in the message.
- The flag for revised requirements and the risk notes are instructions to the AI, not checks: they make a
  problem visible to a person rather than impossible. That is the trade made for following OpenSpec's view.
- The plugin carries only this project's command, agents and hook. A project gets OpenSpec's commands from
  OpenSpec itself, with `openspec init`.
- The repository no longer shows a forked skill; `/write-spec` was the example of one.
- OpenSpec's skills run the `openspec` command, so people install the pinned version for their machine
  (`npm install --global @fission-ai/openspec@<version in package.json>`); the unattended run uses the
  project's copy.
- Following the latest release means taking new releases before others have used them for long. The pin
  keeps that a deliberate step, and the build is what decides whether it worked.
- Main specs stay true only if changes are archived. Here that is enforced: a delivery cannot be finished
  without it.
- OpenSpec's skill files (in `.agents/skills/`, linked from `.claude/skills/`) are generated by `openspec
  init`. They are not edited by hand, so that `openspec update` can refresh them.
