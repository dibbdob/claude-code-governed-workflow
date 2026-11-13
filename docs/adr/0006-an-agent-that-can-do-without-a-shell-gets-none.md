# 0006 An agent that can do without a shell gets none

Status: accepted

## Context

ADR 0004 gave both read-only agents Bash, held to a list of commands by a hook. For the spec-reader that
list needed more and more of git's own parsing: `git grep -O` starts a program, then `-iOvim` and `--open`
turned out to be other spellings of it, then refusing every capital O refused harmless searches. Each fix
was correct, and each made the hook model more of git.

The spec-reader used Bash for two things: `git log`, to see what had changed since the specification was
written, and `wc -l`, to know how long a file was before reading it. It already had Read, Grep and Glob.
It is not kept from anything the coordinator knows, so the coordinator can run `git log` and pass the
output, and Read reports where a file stops.

The reviewer is different. It reads a pinned commit through git and is kept from commit messages
(ADR 0003). Given Read instead, it could open `.git/COMMIT_EDITMSG` or `.git/logs/HEAD`, which hold the
author's words. Its profile is also made of fixed command shapes with no free options, and no bypass has
been found in it.

## Decision

The spec-reader gets Read, Grep and Glob and no shell. `/deliver` runs the two `git log` commands itself
and passes their output with the specification number. The hook keeps only the reviewer's profile.

The build checks the agents' frontmatter: the spec-reader has no Bash and no hook; the reviewer has Bash
alone, with its hook.

## Consequences

- What the spec-reader cannot do is decided by its tool list, which Claude Code enforces, rather than by a
  parser of shell and git. There is no command line for it to get wrong.
- The hook is a third shorter, and the option parsing it had grown is gone.
- The spec-reader sees the history it is given and no more. It can no longer look at a commit's diff; it
  reads the files as they are now, which is what grounding needs.
- The reviewer still depends on the hook, and on its profile staying free of options.
