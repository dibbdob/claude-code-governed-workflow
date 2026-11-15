# 0010 Refinement is a command too

Status: accepted

## Context

ADR 0006 made refinement a pull request: a brief starts as an issue, its change is proposed on a branch with
OpenSpec's `openspec-propose`, and merging the reviewed pull request is the approval. Doing that took
knowing OpenSpec's skills, the naming rule (`<issue>-<what-it-does>`), Gherkin outlines with worked
examples, `./build.sh`, git and GitHub. The person who best knows what a change should do is often a
product or business person who knows Claude but none of those. Delivery already had one command that hid
its machinery (`/deliver`); refinement had none.

Two ways to run it were wanted, as for delivery. In a session the author answers as they go. On GitHub the
author needs only a browser, but nobody is there to answer, and the Claude Code action runs once per event
and remembers nothing between runs. By default it pushes only to its own branch and opens no pull requests.

Once a change is approved, the issue still shows only what was asked. People read the issue, not the change
folder.

## Decision

- **`/refine <issue>` wraps OpenSpec's own skills** as `/deliver` wraps its apply step: `openspec-explore` as
  the stance for the conversation, `openspec-propose` to write the change, `openspec-update-change` to
  revise it. Around them it adds the gates (the issue is not already approved), the interview (above all,
  the author's worked examples and the awkward case), the build, a plain-terms read-back, and the handover.
  It never writes code, approves or merges.
- **In a session, `scripts/refinement.sh` does the git and GitHub part.** `start` puts the session on main
  or on the issue's existing `refine/` branch; `publish` commits only the change folder, runs the build,
  pushes, and opens or updates the spec pull request. `.claude/settings.json` still denies `git push`; the
  script is the one way a refinement leaves the machine, and it refuses a working tree with anything else
  changed.
- **On GitHub, the `refine` label starts it and `@claude` comments carry it on.** The `refine` workflow runs
  the action in its standard tag mode. The first run drafts the change from the issue, with its
  assumptions written down and its questions numbered, and the workflow comments a link that opens the
  spec pull request, filled in, for the author to open, as a delivery does. Opening it with the workflow's
  token would need the repository to let GitHub Actions create and approve pull requests, one setting that
  would let any workflow approve one, and it is off by default. Each comment that mentions `@claude` on
  that pull request is another run on the same branch, which reads the thread and revises. The thread is
  the conversation's memory. Runs are capped at $1.00 and 40 turns on the default model.
- **The approval is unchanged.** A person reviews the spec pull request and merges it; `refined` labels the
  issue `ready`.
- **`refined` also writes a summary of the approved change on its issue,** below what was asked, between
  markers, from the change itself (`tools/issue-summary.mjs`): its plain terms, the worked examples, its
  risk, and links to the specification at the approving commit and to the spec pull request. Proposals now
  begin with `## In plain terms` (`openspec/config.yaml`) so there is something in the author's words to
  copy. Written again, it replaces itself.
- **`revised` adds one line to that summary** when a delivery's pull request lists requirements changed
  since approval, pointing at that pull request.

## Consequences

- An author needs Claude Code and a checkout for the session route, and write access to the repository for
  the GitHub route: the action answers only people with it, as it does by default. Widening that is the
  action's `allowed_non_write_users`, a deliberate choice this project has not made.
- Each `@claude` reply on GitHub is a paid run. A refinement with many rounds costs more than one done in a
  session, and the cap stops a long one part-way; its branch keeps what it pushed.
- The GitHub route opens a pull request for the author, where the deliver workflow leaves that to a person
  (ADR 0008). A spec pull request is where refinement happens, not a request to merge code, and merging it
  still needs a reviewer's approval.
- A repository that also has a general `@claude` workflow will run both on a spec pull request's comments.
  Limit that one to pull requests whose branch is not `refine/`.
- The summary on an issue is a copy, so it can go stale if the change is revised after approval. It says
  the specification is the authority, links to the approved version, and carries the delivery's revision
  note; it does not follow later changes to the main specs.
- Nothing checks `/refine`'s interview. The build checks the form of what it writes, and a person reviews
  the content.
