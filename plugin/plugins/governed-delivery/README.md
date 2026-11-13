# governed-delivery

Deliver an approved [OpenSpec](https://github.com/Fission-AI/OpenSpec) change end to end with Claude Code.
OpenSpec says what to build: a change's proposal, its tasks and its requirements. This plugin adds how it is
delivered: `/deliver` reads through a spec reader that has no shell and a parallel code survey, builds
test-first with a test named after every scenario, is reviewed by a reviewer who is pinned to one commit, is
not told why, and is held to read-only commands by a hook, and archives the change so the specs stay true.

Generated from the source repository's `.claude/` by `tools/package_plugin.py`; edit there, not here.

## Assumes

- OpenSpec 2 is set up in the project (`openspec init --tools claude`), which gives it OpenSpec's skills.
  Use `/openspec-propose` to write a change and `/deliver` to build it.
- `./build.sh` is the project's whole gate, and checks that every scenario has a test (the source
  repository's `tools/specs.mjs`) and that no change is archived half-done (`openspec validate --archived`).
- OpenSpec's `verify` workflow is switched on (it is not in OpenSpec's default profile).
- Changes are named after their GitHub issue (`57-bank-holidays`), and the source repository's
  `scripts/start-delivery.sh`, `claim-delivery.sh` and `finish-delivery.sh` are copied in: `/deliver` runs in
  the folder `start-delivery.sh` makes, and leaves the pull request to `finish-delivery.sh`.

## Try it locally

```bash
claude plugin marketplace add ./plugin
claude plugin install governed-delivery@governed-workflow
```

Or for one session only, without installing: `claude --plugin-dir ./plugin/plugins/governed-delivery`.
