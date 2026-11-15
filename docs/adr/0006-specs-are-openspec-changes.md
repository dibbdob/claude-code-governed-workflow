# 0006 Specs are OpenSpec changes

Status: accepted

## Context

A delivery needs to know what to build: requirements, each with scenarios a test can be written against, and
a record of what the system already does so the next change starts from the truth. It also needs a
refinement step, where a brief becomes something a person has approved, and a way to tell an approved
change from a draft.

OpenSpec is an open-source framework for exactly this part: a change is a folder holding a proposal, a task
list, and the requirements it adds, alters or removes, each with scenarios; archiving a delivered change
folds its requirements into the project's main specs, so they describe the system as it now is. It comes
with skills for writing, applying, verifying and archiving changes. Common practice elsewhere (Kubernetes
enhancement proposals, Rust RFCs) is that a proposal is approved by merging its reviewed pull request, and
is numbered after its GitHub issue or pull request.

## Decision

- **OpenSpec holds what to build.** `openspec/specs/` describes the system as it is; `openspec/changes/`
  holds each change still to be delivered. OpenSpec's `openspec-propose` skill writes a change.
- **A change is named after its issue**, as `<issue-number>-<what-it-does>`, such as `57-bank-holidays`. The
  issue number comes from the name, so there is no separate numbering and nothing to clash.
- **Refinement is the change's pull request.** A brief starts in a GitHub issue. Its change is proposed on a
  branch and reviewed as a pull request. Merging it is the approval: **a change on main is ready to
  deliver**, and the `refined` workflow labels its issue `ready` so the status shows where people look.
  Readiness needs no field anyone could set by hand.
- **`/deliver` wraps OpenSpec's own apply step.** The building is OpenSpec's `openspec-apply-change` skill,
  which works through the change's tasks and hands over this project's build rules from
  `openspec/config.yaml` (test first, a test named after every scenario, the build before every commit, a
  defect reproduced before it is fixed). The spec-reader reads the documents `openspec instructions apply`
  lists. Around that, `/deliver` keeps what OpenSpec does not do: its gates, the spec-reader with no shell,
  the reviewer who is not told why, and the build as the judge. Its last steps archive the change and write
  the pull request description.
- **OpenSpec's own features come first; our own code only where it has nothing equivalent.** The build runs
  `openspec validate --all --strict` (well-formed specs and changes) and `openspec validate --archived` (no
  change archived with tasks left undone). `/deliver` runs OpenSpec's `verify` workflow before archiving, as
  a self-check of tasks, requirements and design; the reviewer stays the independent check. One check of
  our own, in `tools/specs.mjs`: every scenario in the main specs has a test that names it, as
  `[<capability>] <scenario name>`. OpenSpec's `verify` looks at scenario coverage too, but as the AI's
  judgement; this one fails the build.
- **A change may be revised during delivery, while its intent holds.** That is OpenSpec's view: a change is
  a living plan, revised with its `openspec-update-change` skill, and a new change only when the intent
  moves. Freezing a change's requirements once approved, and failing the build if they changed, would go
  against the framework. Instead, the project's rules in `openspec/config.yaml` make revisions visible: when
  a change is archived, each requirement that changed since approval is listed in plain words, with why,
  whether the intent is the same, and what could go wrong. A person is asked to confirm; in an unattended
  run the list goes first in the pull request, under "Changed since approval: please confirm the intent is
  the same". If the intent has changed, the change is not archived.
- **Risk is analysed at refinement, inside OpenSpec.** The same config's rules require every proposal to
  state a risk level (low, medium or high) and why, and every medium or high one to have a design whose
  "Risks / Trade-offs" pair each risk with a mitigation a test or the reviewer can check, with a task to put
  it in place. Reviewers of the proposal see the risk before approving it.
- **OpenSpec is pinned to an exact version** in `package.json`, installed without running install scripts,
  and run from the project's own copy. It follows OpenSpec's latest release: when one comes out, the pin
  moves, `openspec update` refreshes its skills, and the build shows what needs changing.
- **Its usage reporting is off** wherever this project runs it: `build.sh`, `scripts/agent.sh` and the
  GitHub workflows set `OPENSPEC_TELEMETRY=0`. By default it sends an anonymous id, the command name and the
  version. A person running it by hand chooses for themselves.

## Consequences

- The project maintains no spec format or numbering of its own. What it maintains is what makes it
  different: the review, the guards and the checks.
- The project has a dependency. `build.sh` installs it when it is missing.
- OpenSpec's `verify` workflow is not in its default profile. It is switched on per machine (`openspec
  config set profile custom`, with `verify` in `workflows`), and `openspec update` matches a project's
  skills to the machine's profile, so a teammate on the default profile would remove it. The build fails if
  it is missing, with the fix in the message.
- The flag for revised requirements and the risk notes are instructions to the AI, not checks: they make a
  problem visible to a person rather than impossible. That is the trade made for following OpenSpec's view.
- Main specs stay true only if changes are archived. `scripts/agent.sh` refuses a headless delivery whose
  change is not archived; on GitHub, the pull request's reviewer is what catches it (ADR 0008).
- OpenSpec's skill files (in `.agents/skills/`, linked from `.claude/skills/`) are generated by `openspec
  init`. They are not edited by hand, so that `openspec update` can refresh them.
