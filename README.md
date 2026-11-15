# Governed delivery with Claude Code

A way to have Claude Code build changes while people stay in charge of what is built. A brief starts as a
GitHub issue. `/refine` turns it into a specification with the person who raised it, and a pull request
approves it. `/deliver` then builds it test first, has it reviewed independently, and hands back a pull
request for a person to merge.

Nothing is built until its specification is merged, and a person merges the result. The project lives on
GitHub, which holds the issues and pull requests. Claude does its part either there, started by a label, or
on your own machine under your Claude subscription.

## Getting started

**1. Install.** Needs a project on GitHub, a Claude subscription or API key, and on your machine a bash
shell, Node 22.12 or later, git, Python 3 and Claude Code.

```bash
git clone https://github.com/dibbdob/claude-code-governed-workflow.git
cd claude-code-governed-workflow
scripts/setup-machine.sh              # this machine: the tools
scripts/adopt.sh ../your-project      # your project: everything else, nothing committed
```

**2. Fit the project.** `adopt.sh` lists what to change. The essentials:

- Put the project's own build and tests in `build.sh`. It is the whole gate, and the workflow runs it before
  every commit.
- Have each test name the scenario it covers in its title, such as `[response-deadline] A ticket opened
  late on a Friday`.
- Rewrite the risk rule in `openspec/config.yaml` to name what is risky for your product.

Then commit what it added and push it.

**3. Set up GitHub.**

- A ruleset on `main` requiring a pull request and the `build` check.
- To start `/refine` and `/deliver` with a label, the [Claude GitHub app](https://github.com/apps/claude)
  installed, the secret `ANTHROPIC_API_KEY`, and two labels, `refine` and `deliver`. Not needed if Claude
  only runs on your machine.

[Setting up](docs/guide/setting-up.md) has the detail: what each script does, the full list to fit, and
the GitHub settings in full.

## Your first change

Two people take part, and one person can be both: the **author**, who raised the issue and knows the
product, and the **developer**, who reviews and merges. Commands run in your project.

1. Write the issue in plain words. Add the `refine` label, or run `/refine 57` in a session. The change it
   writes is named after the issue, such as `57-bank-holidays`.
2. Answer Claude's questions, review the spec pull request, and merge it. The issue is now `ready`.
3. Add the `deliver` label and open the pull request it links to. Or run `./scripts/agent.sh 57`, push the
   branch and open the pull request yourself.
4. Read the pull request, starting with anything marked *Changed since approval*, and merge it.

To see one from start to finish: [the issue](https://github.com/dibbdob/claude-code-governed-workflow/issues/35),
[its specification](https://github.com/dibbdob/claude-code-governed-workflow/pull/36) and
[the delivery](https://github.com/dibbdob/claude-code-governed-workflow/pull/37).

## More

- [Refining](docs/guide/refining.md) and [delivering](docs/guide/delivering.md): the steps, and what to check
- [Reference](docs/guide/reference.md): labels, models and switching, troubleshooting
- [How it works](docs/how-it-works.md): what you can rely on, what each step does, and how it is tested
- [Working on this repository](docs/developing.md): the build, and the layout
- [Decision records](docs/adr): why each part is built as it is

Released under the [MIT licence](LICENSE).
