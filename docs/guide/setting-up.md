# Setting up

Two scripts do it. Both run from a clone of this repository, are safe to run again, and say what they did.

```bash
scripts/setup-machine.sh              # each person's machine, once
scripts/adopt.sh ../your-project      # each project, once, by one developer
cd ../your-project && git status      # review what it added; nothing is committed
```

## Each machine

[`setup-machine.sh`](../../scripts/setup-machine.sh) checks Node 22.12 or later, git, Python 3 and Claude Code,
and installs what the workflow needs: the pinned OpenSpec (with its `verify` workflow, which `/deliver`
needs), actionlint, and the GitHub CLI, signing you in if you are not. With `--check` it only says what is
missing. It asks for no passwords. It installs actionlint and the GitHub CLI with Homebrew; on a machine
without it, it tells you to install them yourself.

## Each project

[`adopt.sh`](../../scripts/adopt.sh) copies in `/refine` and `/deliver` with their agents and hook, the
scripts, the checks and the workflows. It sets up OpenSpec with this workflow's rules, or, in a project that
already has its own `openspec/config.yaml`, keeps that and says to add them. It keeps `git push` denied.
The commands live in the project, so a run on GitHub and every person's session use the same ones.
It never overwrites a file the project already has, and it commits nothing.

To pick up a newer version of the workflow later, pull this repository and run `adopt.sh` again. It adds
what is new and lists each file of yours that differs, for you to compare.

It ends by listing what to fit:

| File | What to change |
|---|---|
| `build.sh` | Put the project's own build and tests where the starting one says, such as `dotnet build` and `dotnet test`. A project that already had a `build.sh` keeps it: add the OpenSpec, scenario, link and actionlint checks to it. |
| `tools/specs.mjs` | Tests must put the scenario they cover in their title, such as `[response-deadline] A ticket opened late on a Friday`. It reads `test/*.test.js`; for tests elsewhere, change the line that reads them. |
| `openspec/config.yaml` | Rewrite the risk rule to name what is risky for this product, such as payments or permissions. If the project had a config of its own, it was kept: first add this workflow's `rules:` and `operations:` to it, or the build fails every change `/refine` writes, for having no Delivery tasks. |
| `.github/workflows/build.yml` | Add the project's toolchain before the build, such as `actions/setup-dotnet`. |

## On GitHub, once

1. A ruleset on `main` requiring a pull request, the `build` check, and branches up to date before merging.
   Add one approval once there is a second person.
2. To run Claude on GitHub with a label: the [Claude GitHub app](https://github.com/apps/claude) installed,
   the secret `ANTHROPIC_API_KEY`, and the labels `refine` and `deliver`. The `ready` label is made for you.
   Not needed if Claude only runs on your machine.

   ```bash
   gh label create refine --force && gh label create deliver --force
   ```
3. Write access for spec authors who refine on GitHub. The action answers `@claude` only from people with
   write access.
4. If the project already has a general `@claude` workflow, keep it off pull requests whose branch starts
   `refine/`, or both will answer.
