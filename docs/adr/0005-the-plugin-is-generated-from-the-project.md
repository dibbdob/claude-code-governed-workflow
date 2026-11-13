# 0005 The plugin is generated from the project

Status: accepted. Since ADR 0008 the plugin carries `/deliver`, the agents and the hook; `/write-spec` is
gone, and OpenSpec's own commands come from OpenSpec.

## Context

The delivery workflow (the `/deliver` command, its two subagents, the read-only hook and `/write-spec`)
is worth using in other repositories, and a Claude Code plugin is how it travels. But the project keeps
using its own `.claude/`, and two hand-kept copies drift: a fix lands in one and not the other.

The copy also cannot be exact. Plugin subagents ignore the `hooks`, `mcpServers` and `permissionMode`
frontmatter fields, for security reasons. An agent file copied into a plugin unchanged still describes
itself as read-only, still lists what it can run, and has no hook. The packaged reviewer would be the
same prompt with the guarantee removed, and nothing would say so.

## Decision

`.claude/` is the one source. `tools/package_plugin.py` generates `plugin/plugins/governed-delivery` from
it, making the changes a plugin needs:

- it strips the `hooks` field from each agent, since it would be ignored;
- it registers the read-only hook once, in the plugin's `hooks/hooks.json`, with `--by-agent-type`, so the
  hook chooses a profile from the `agent_type` in its input. The reviewer gets its profile whether the
  name arrives bare or prefixed with the plugin's name (since ADR 0006 the spec-reader has no shell to
  hold); every other session, including the main one,
  is left alone;
- it points the agents' prose at the plugin's copy of the hook.

`build.sh` regenerates the plugin into a temporary folder and fails if it differs from what is committed.
`claude plugin validate plugin --strict` passes on the marketplace.

## Consequences

- A change to the workflow is made once, in `.claude/`, and the build says when the plugin needs
  regenerating.
- The plugin's hook fires on every Bash call in a session that has the plugin enabled, and returns at once
  for anything that is not one of its agents.
- Whether `agent_type` carries the plugin's prefix is not stated in the documentation, which is why both
  forms are matched. That the hook fires for the plugin's agents in a live session is still to be seen in
  one.
- The plugin assumes the project conventions it was built for: `./build.sh` as the gate and
  `tools/criteria.mjs` for criteria. Its README says so.
