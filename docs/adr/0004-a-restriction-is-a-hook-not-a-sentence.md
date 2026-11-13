# 0004 A restriction is a hook, not a sentence

Status: accepted

## Context

The spec-reader and the independent reviewer are meant to change nothing, and the reviewer is meant not
to read commit messages (ADR 0003). Both were sentences in their prompts. Frontmatter could withhold
Write and Edit, but both agents need Bash to read git history, and Bash reaches everything: a redirect
writes a file, `git log` prints the messages the review must not see, and `git grep -O` starts a program.

A prompt instruction is followed most of the time, and a review that read the author's rationale once
looks exactly like one that did not.

## Decision

Each read-only agent runs `.claude/hooks/read_only_bash.py <profile>` as a PreToolUse hook on Bash, in its
own frontmatter, so the hook applies to that agent and not to the session that spawned it. The hook allows
a short list of commands per profile and refuses everything else with exit code 2, which blocks the call
and returns the reason to the agent.

The hook is written to fail closed:

- `|| exit 2` after the command, because a hook that cannot start (no python3) exits with some other code,
  and any exit other than 2 lets the command run;
- a top-level handler that turns a crash into exit 2;
- a scan of every character against the quoting it sits in, so nothing chains, redirects, substitutes or
  expands, before any per-command rule is consulted.

Its tests run in `build.sh`. They were shown failing with the character scan disabled, which first
revealed that no test depended on the scan at all; the cases that only the scan can stop were added then.

## Consequences

- "Reads only" and "does not read commit messages" hold whatever the agent decides.
- The agents' prompts list what they can run, so a refusal is a surprise only for a command they were
  told not to use.
- The hook reads words; it does not resolve them as git would. A word git takes as a path where the hook
  counted a revision is still a gap, and the prompt has to hold that line.
- The hook is code with its own maintenance cost, and a new read-only agent needs a new profile.
