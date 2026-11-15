# governed-delivery

Refine a GitHub issue into an [OpenSpec](https://github.com/Fission-AI/OpenSpec) change, and deliver it end
to end, with Claude Code. OpenSpec says what to build: a change's proposal, its tasks and its requirements.
This plugin adds how it is written and delivered. `/refine` writes the change with the person who raised
the issue. `/deliver` reads it through a spec reader that has no shell and a parallel code survey, builds
test-first with a test named after every scenario, is reviewed by a reviewer who is pinned to one commit, is
not told why, and is held to read-only commands by a hook, and archives the change so the specs stay true.

Generated from the source repository's `.claude/` by `tools/package_plugin.py`; edit there, not here.

## Assumes

- OpenSpec 2 is set up in the project (`openspec init --tools claude`), which gives it OpenSpec's skills.
  Use `/refine` to write a change and `/deliver` to build it.
- `./build.sh` is the project's whole gate, and checks that every scenario has a test (the source
  repository's `tools/specs.mjs`) and that no change is archived half-done (`openspec validate --archived`).
- OpenSpec's `verify` workflow is switched on (it is not in OpenSpec's default profile).
- Changes are named after their GitHub issue (`57-bank-holidays`), and `/deliver` runs on a branch of its
  own. The source repository's `scripts/agent.sh` makes one and runs it headless; on GitHub, its `deliver`
  workflow runs it through Anthropic's Claude Code action.

## Try it locally

```bash
claude plugin marketplace add ./plugin
claude plugin install governed-delivery@governed-workflow
```

Or for one session only, without installing: `claude --plugin-dir ./plugin/plugins/governed-delivery`.
