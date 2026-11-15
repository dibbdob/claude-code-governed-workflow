# Setting up

Two scripts do it. Both run from a clone of this repository, are safe to run again, and say what they did.

```bash
scripts/setup-machine.sh --plugin     # each person's machine, once
scripts/adopt.sh ../your-project      # each project, once, by one developer
cd ../your-project && git status      # review what it added; nothing is committed
```

## Each machine

[`setup-machine.sh`](../../scripts/setup-machine.sh) checks Node 22.12 or later, git, Python 3 and Claude Code,
and installs what the workflow needs: the pinned OpenSpec (with its `verify` workflow, which `/deliver`
needs), actionlint, and the GitHub CLI, signing you in if you are not. With `--plugin` it installs the
plugin, which brings `/refine` and `/deliver` into every project. With `--check` it only says what is
missing. It asks for no passwords.

## Each project

[`adopt.sh`](../../scripts/adopt.sh) copies in the scripts, the checks and the workflows, sets up OpenSpec
with this workflow's rules, and keeps `git push` denied. It never overwrites a file the project already has,
and it commits nothing.

It ends by listing what to fit. Most of it needs nothing:

| File | What to change |
|---|---|
| `build.sh` | Put the project's own build and tests where the starting one says, such as `dotnet build` and `dotnet test`. A project that already had a `build.sh` keeps it: add the OpenSpec, scenario, link and actionlint checks to it. |
| `tools/specs.mjs` | Tests must put the scenario they cover in their title, such as `[response-deadline] A ticket opened late on a Friday`. It reads `test/*.test.js`; for tests elsewhere, change the line that reads them. |
| `openspec/config.yaml` | Rewrite the risk rule to name what is risky for this product, such as payments or permissions. |
| `.github/workflows/build.yml` | Add the project's toolchain before the build, such as `actions/setup-dotnet`. |

## On GitHub, once

1. A ruleset on `main` requiring a pull request, the `build` check, and branches up to date before merging.
   Add one approval once there is a second person.
2. The [Claude GitHub app](https://github.com/apps/claude) installed, and the secret `ANTHROPIC_API_KEY`.
3. Write access for spec authors who refine on GitHub. The action answers `@claude` only from people with
   write access.
4. If the project already has a general `@claude` workflow, keep it off pull requests whose branch starts
   `refine/`, or both will answer.
