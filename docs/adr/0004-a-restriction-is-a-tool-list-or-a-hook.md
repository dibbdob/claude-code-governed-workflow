# 0004 A restriction is a tool list, or a hook, never a sentence

Status: accepted

## Context

The spec-reader and the independent reviewer are meant to change nothing, and the reviewer is meant not to
read commit messages (ADR 0003). As sentences in their prompts, those are followed most of the time, and a
review that read the author's rationale once looks exactly like one that did not.

Frontmatter can withhold Write and Edit, but not narrow Bash: a redirect writes a file, `git log` prints the
messages the review must not see, and `git grep -O` starts a program. Narrowing a shell by parsing its
commands works only while the commands are few and fixed; once free options are allowed, the parser has to
model git's own rules (bundled short options, prefixes of long ones) and each release can move them.

## Decision

- **An agent that can do without a shell gets none.** The spec-reader has Read, Grep and Glob. What it would
  have used Bash for, the history since the change was approved, the coordinator runs and passes to it.
- **An agent that needs a shell gets a hook.** The reviewer reads a pinned commit through git, and must not
  have Read, which would open `.git/COMMIT_EDITMSG` and `.git/logs/HEAD`. It runs
  `.claude/hooks/read_only_bash.py reviewer` as a PreToolUse hook on Bash, in its own frontmatter, so the
  hook applies to that agent and not to the session that spawned it. The profile is a short list of fixed
  command shapes with no free options; anything else is refused with exit code 2, which blocks the call and
  returns the reason to the agent.
- **The hook fails closed.** `|| exit 2` follows the command, because a hook that cannot start exits with some
  other code and any other code lets the command run; a top-level handler turns a crash into exit 2; and
  every character is scanned against the quoting it sits in, so nothing chains, redirects, substitutes or
  expands, before any per-command rule is consulted.
- **A filter after a pipe reads only the pipe.** `head`, `tail`, `wc`, `nl`, `sed -n` and `grep` are allowed
  with listed options only: `grep -r` with no file reads the working directory and `grep -f` reads a file,
  and both look like any other short option.

The hook's tests run in `build.sh`, and the build checks the agents' frontmatter: the spec-reader has no Bash
and no hook; the reviewer has Bash alone, with its hook.

## Consequences

- What the spec-reader cannot do is decided by its tool list, which Claude Code enforces, rather than by a
  parser of shell and git.
- "Reads only" and "does not read commit messages" hold for the reviewer whatever it decides, as long as its
  profile stays free of options. Adding an option means checking it cannot name a file, a directory or a
  program.
- The hook reads words; it does not resolve them as git would. A word git takes as a path where the hook
  counted a revision is still a gap, and the reviewer's prompt holds that line.
- The spec-reader sees the history it is given and no more. It reads the files as they are now, which is
  what grounding needs.
