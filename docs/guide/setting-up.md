# Setting up

Two scripts do the setting up. Both run from a clone of this repository, are safe to run again, and say what
they did.

```bash
# Each person's machine, once: developers, and spec authors who refine in a session
git clone https://github.com/dibbdob/claude-code-governed-workflow.git
cd claude-code-governed-workflow
scripts/setup-machine.sh --plugin

# Each project, once, by one developer
scripts/adopt.sh ../your-project
cd ../your-project && git status        # review what it added; nothing is committed
```

The plugin carries the part that is Claude Code: `/refine`, `/deliver`, the spec-reader, the independent
reviewer, and the hook that holds the reviewer to read-only commands. Everything else belongs to the project,
and is copied in.

## Each machine: `setup-machine.sh`

[`setup-machine.sh`](../../scripts/setup-machine.sh):

- **checks** Node 22.12 or later, git, Python 3 and Claude Code, and says how to get any that are missing;
- **installs** the OpenSpec version this repository pins, and turns on its `verify` workflow, which `/deliver`
  needs and OpenSpec's default profile leaves out (`openspec update` would remove it again);
- **installs** actionlint and the GitHub CLI with Homebrew where it can, and starts `gh auth login` if you are
  not signed in, which `/refine` publishes through;
- with **`--plugin`**, installs the governed-delivery plugin for your user, which brings `/refine` and
  `/deliver` into every project;
- with **`--check`**, only says what is missing, and changes nothing.

It signs you in to nothing itself and asks for no passwords. On Linux, or Windows through WSL, anything
Homebrew would have installed is listed for you to install.

To install the plugin by hand instead:

```bash
claude plugin marketplace add ./plugin
claude plugin install governed-delivery@governed-workflow
```

## Each project: `adopt.sh`

[`adopt.sh`](../../scripts/adopt.sh) never overwrites a file the project already has: one that differs is
kept and listed for you to compare. It commits nothing, so `git status` and `git diff` show everything it did,
and running it again changes nothing. It:

- initialises OpenSpec for Claude Code, with this workflow's rules in `openspec/config.yaml`;
- pins OpenSpec in the project's `package.json`, with its lock file;
- copies in the scripts, the checks and the workflows: `refine`, `refined`, `revised` and `deliver`;
- merges the permissions into `.claude/settings.json`, keeping `git push` denied, and adds lines to
  `.gitignore`;
- writes a starting `build.sh` and build workflow if the project has none, with the checks already in.

## Fitting it to the project

Some of what is copied describes this repository's example, a support desk's rules. `adopt.sh` ends by
listing what to fit. Most of it needs nothing.

| File | What to change |
|---|---|
| `scripts/` | Usually nothing, as long as `./build.sh` is the project's whole gate and changes are named after issues. If the build command differs, change it in the scripts and the tool lists. |
| `tools/specs.mjs` | Tests must put the scenario they cover in their title, such as `[response-deadline] A ticket opened late on a Friday`: that is how the build checks every scenario has a test. It reads `test/*.test.js`; for tests in another language or place, change the line that reads them. |
| `tools/links.mjs`, `tools/issue-summary.mjs` | Nothing. |
| `.claude/settings.json` | Already merged with the project's own. Keep `git push` denied, so `refinement.sh` stays the one way a refinement leaves a machine. |
| `openspec/config.yaml` | Rewrite the risk rule. It rates a change medium or high when it touches "a deadline, a priority, stored data"; name what is risky for this product, such as payments or permissions. |
| `build.sh` | Keep the OpenSpec, scenario, link and actionlint checks, and put the project's own build and tests where the starting one says, such as `dotnet build` and `dotnet test`. A project that already had a `build.sh` keeps it; add those checks to it. |
| `.github/workflows/build.yml` | Add the project's toolchain before the build, such as `actions/setup-dotnet`. A project with its own build workflow adds the [actionlint step](../../.github/actions/install-actionlint/action.yml) to it. |

## On GitHub, once

1. A ruleset on `main` requiring a pull request, one approval, the `build` check, and branches up to date
   before merging. On a private repository that needs GitHub Pro or a team plan. With one person, set
   approvals to 0 until there is a second.
2. The [Claude GitHub app](https://github.com/apps/claude) installed on the repository, and the secret
   `ANTHROPIC_API_KEY`, from an account with a spend limit.
   [`deliver.yml`](../../.github/workflows/deliver.yml) says why each is needed.
3. Write access for spec authors who refine on GitHub. The action answers `@claude` only from people with
   write access.
4. If the project already has a general `@claude` workflow, keep it off pull requests whose branch starts
   `refine/`, or both will answer.

Then start every piece of work as an issue with a brief, and follow the path in the
[guide's overview](README.md#how-a-change-gets-made).
