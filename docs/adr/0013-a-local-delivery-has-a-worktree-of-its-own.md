# 0013 A local delivery has a worktree of its own

Status: accepted

## Context

`scripts/agent.sh` ran a delivery in the person's own checkout ([ADR 0008](0008-deliveries-run-on-the-standard-action.md)).
It refused to start over uncommitted work, switched the checkout to the delivery's branch, and kept it there
for the length of the run, which is most of an hour. The person could not work in the meantime, and two
deliveries at once needed two clones.

## Decision

- **Each delivery runs in a git worktree of its own**, made from main on its `deliver/<change>` branch, at
  `<checkout>-deliveries/<change>` beside the checkout. The person's checkout is not touched: its branch and
  any uncommitted work stay as they were, so `agent.sh` no longer asks for a clean one.
- **A worktree lasts as long as its run.** It is removed when the run ends with nothing uncommitted in it,
  since what was committed is on the branch, and kept when something was left uncommitted, for a person to
  read. A run that committed nothing also removes its branch, as before.
- **The pull request description is kept with the run's record**, as `runs/<change>.md` beside
  `runs/<change>.json`, since the worktree it was written in is gone.
- **A branch that exists is refused.** One delivery of a change at a time: a second run of the same change
  stops before it makes anything, rather than sharing the first one's branch.
- **The worktree shares the checkout's `node_modules`** when both lock the same versions; otherwise the build
  installs its own.

## Consequences

- Deliveries of different changes run at once from separate terminals. Each build has its own `.build.lock`,
  since the lock is per checkout.
- They are limited by the person's plan and their attention for review, not by the repository.
- Delivering a change again means deleting its branch first. That is deliberate: the branch may hold the only
  copy of the last attempt.
- A folder beside the checkout appears while a delivery runs. `DELIVERIES_DIR` moves it.
