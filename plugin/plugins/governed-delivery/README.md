# governed-delivery

Deliver a specification end to end with Claude Code: `/write-spec` drafts it in a forked context,
`/deliver` grounds itself through a read-only spec reader and a parallel code survey, builds tests-first
against numbered acceptance criteria, and is reviewed by a reviewer who is pinned to one commit and not
told why. The spec reader has no shell; the reviewer's Bash is held to read-only commands by a hook.

Generated from the source repository's `.claude/` by `tools/package_plugin.py`; edit there, not here.

## Assumes

- `./build.sh` is the project's whole gate.
- `tools/criteria.mjs` numbers acceptance criteria and checks their coverage.
- Specifications live in `docs/specs/NNNN-<slug>.md` with a `Status:` line, and an `Issue: #<n>` line once
  ready.
- The source repository's `scripts/start-delivery.sh`, `claim-delivery.sh` and `finish-delivery.sh` are
  copied in: `/deliver` runs in the folder `start-delivery.sh` makes, and leaves the pull request to
  `finish-delivery.sh`.

## Try it locally

```bash
claude plugin marketplace add ./plugin
claude plugin install governed-delivery@governed-workflow
```

Or for one session only, without installing: `claude --plugin-dir ./plugin/plugins/governed-delivery`.
