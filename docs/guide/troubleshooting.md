# When something goes wrong

| You see | Cause and fix |
|---|---|
| *No approved change on main is named after issue #n* | The issue has not been refined, or its spec pull request is not merged yet. A delivery of an unrefined issue stops here, before any model runs; the failure shows in the Actions tab, not on the issue. Refine it first. |
| *'57' is not an approved change on main*, from `agent.sh` | The same, locally. Also check your local `main` is up to date. |
| *Issue #n is already refined*, from `/refine` | Its change is on `main`. A change to an approved specification is a new issue. |
| *A refinement changes only its change folder* | `refinement.sh publish` found other files changed. Discard them, or commit them elsewhere. |
| No reply to an `@claude` comment | The commenter lacks write access, the pull request's branch does not start `refine/`, or the comment was edited rather than new. |
| `/deliver` stops because it is on `main` | Make a branch first: `git switch -c deliver/<change>`. `agent.sh` does this for you. |
| *Commit or stash your changes first* | `agent.sh` and `refinement.sh start` start from a clean checkout. |
| A GitHub run stops part-way | It reached the $1.50 cap or 60 turns. Read the branch, then re-label, or finish locally with `/deliver` on that branch. |
| *The change is not archived* | The run skipped the archive step. Run `/deliver` again on the branch, or archive in a session and rebuild. |
| A command was refused in an unattended run | `dontAsk` refuses anything not in `scripts/headless-tools.txt`, and the run carries on without it. Add a tool to the list only if every delivery needs it. |
| Two deliveries conflict at merge | Both started from the same `main` and touched the same places. Merge `main` into the second and keep both requirements. |
| The build says `verify` is missing | Run `scripts/setup-machine.sh`, then `openspec update`. |
| The build says the workflows were *NOT CHECKED* | actionlint is not installed on this machine. Run `scripts/setup-machine.sh`; GitHub checks them either way. |
| `refinement.sh publish` cannot open the pull request | The GitHub CLI is not signed in. Run `scripts/setup-machine.sh` or `gh auth login`, then publish again. |
| A run on your subscription billed the API | `ANTHROPIC_API_KEY` was set in the shell. Unset it. |
| A merged delivery left its issue open | Its pull request description lacked the `Closes #n` line, which `/deliver` writes first. Close the issue by hand, pointing at the pull request. |
