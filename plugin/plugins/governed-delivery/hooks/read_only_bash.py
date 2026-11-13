#!/usr/bin/env python3
"""Hold a subagent's Bash to a short list of read-only commands (ADR 0004).

A subagent's `tools` field can grant or withhold Bash, but cannot narrow it to particular commands. The
agents in .claude/agents/ that must change nothing therefore run this as a PreToolUse hook on Bash,
naming their profile:

    python3 "$CLAUDE_PROJECT_DIR/.claude/hooks/read_only_bash.py" reviewer || exit 2

Claude Code passes the tool call as JSON on stdin. Exit 0 lets the command run; exit 2 blocks it and hands
stderr back to the agent as the reason. Any other exit is a hook error, after which the command runs
anyway: the `|| exit 2` covers a missing python3, and the handler at the bottom covers a crash here.

The scan reads quoting the way the shell does. Unquoted, a command may not contain anything that chains,
redirects, substitutes, expands or comments: ; & > < ` $ ( ) { } * ? [ ] ~ # or a newline. Inside double
quotes $ and ` are refused. Inside single quotes everything is literal. An unquoted | splits a pipeline:
the first part must be one of the profile's sources, and each later part a filter that reads only the
pipe.

    reviewer      git show <rev>:<path>  (a bare commit would print its message, which the review must
                                          not read)
                  git diff <a>...<b> | <a> <b>, git grep -n <pattern> <rev> -- <path>...,
                  git ls-tree [--name-only] <rev> [<path>], git rev-parse <rev>
    spec-reader   git log, git show, git grep, git ls-files, git rev-parse, wc -l <path>
    --by-agent-type   choose the profile from the hook input's agent_type instead: spec-reader and
                      independent-reviewer (bare or plugin-namespaced) get theirs, and any other
                      session, including the main one, is not restricted. This is the form a plugin
                      uses, from its hooks/hooks.json.

    filters       head and tail (-n N or -N), wc (-l, -w, -c), nl, grep (short options only, one
                  pattern, no file), sed -n '<from>,<to>p'
"""

import json
import re
import shlex
import sys

UNQUOTED_REFUSED = set(';&><`$(){}*?[]~#\n')
DOUBLE_QUOTED_REFUSED = set('$`')
REVISION = re.compile(r'^[A-Za-z0-9_./^~-]+$')
NUMBER_OPTION = re.compile(r'^-(n)?\d+$')


class Refused(Exception):
    pass


def split_pipeline(command):
    """The pipeline's parts, after checking every character against the quoting it sits in."""
    parts, current, quote = [], [], None
    for i, ch in enumerate(command):
        if quote == "'":
            quote = None if ch == "'" else quote
        elif quote == '"':
            if ch in DOUBLE_QUOTED_REFUSED:
                raise Refused(f'{ch!r} inside double quotes would be expanded by the shell')
            quote = None if ch == '"' else quote
        elif ch == '\\':
            raise Refused('a backslash outside quotes; quote the argument instead')
        elif ch in "'\"":
            quote = ch
        elif ch == '|':
            parts.append(''.join(current))
            current = []
            continue
        elif ch in UNQUOTED_REFUSED:
            raise Refused(f'{ch!r} outside quotes would chain, redirect or expand')
        current.append(ch)
    if quote:
        raise Refused('an unterminated quote')
    parts.append(''.join(current))
    words = [shlex.split(p) for p in parts]
    if any(not w for w in words):
        raise Refused('an empty command in the pipeline')
    return words


def is_revision(word):
    return bool(REVISION.match(word)) and not word.startswith('-')


def reviewer_source(w):
    if w[:2] == ['git', 'show']:
        rev, sep, path = (w[2] if len(w) == 3 else '').partition(':')
        return len(w) == 3 and sep == ':' and is_revision(rev) and bool(path)
    if w[:2] == ['git', 'diff']:
        args = w[2:]
        if len(args) == 1:
            a, sep, b = args[0].partition('...')
            return sep == '...' and is_revision(a) and is_revision(b)
        return len(args) == 2 and all(is_revision(a) for a in args)
    if w[:3] == ['git', 'grep', '-n']:
        rest = w[3:]
        return len(rest) >= 4 and not rest[0].startswith('-') and is_revision(rest[1]) and \
            rest[2] == '--' and all(not p.startswith('-') for p in rest[3:])
    if w[:2] == ['git', 'ls-tree']:
        args = [a for a in w[2:] if a != '--name-only']
        return 1 <= len(args) <= 2 and is_revision(args[0])
    if w[:2] == ['git', 'rev-parse']:
        return len(w) == 3 and is_revision(w[2])
    return False


def spec_reader_source(w):
    if w[:2] in (['git', 'log'], ['git', 'show'], ['git', 'grep'], ['git', 'ls-files'], ['git', 'rev-parse']):
        # No option that writes or runs something: --output sends git's output to a file, and grep's
        # -O / --open-files-in-pager starts a program of the caller's choosing.
        risky = ('--output', '--ext-diff', '--open-files-in-pager', '-O')
        return not any(a.startswith(risky) for a in w[2:])
    if w[:2] == ['wc', '-l']:
        return len(w) == 3 and not w[2].startswith('-')
    return False


def is_filter(w):
    name, args = w[0], w[1:]
    if name in ('head', 'tail'):
        return args == [] or (len(args) == 1 and NUMBER_OPTION.match(args[0]) is not None) or \
            (len(args) == 2 and args[0] == '-n' and args[1].isdigit())
    if name == 'wc':
        return all(a in ('-l', '-w', '-c') for a in args)
    if name == 'nl':
        return args == []
    if name == 'grep':
        options = [a for a in args if a.startswith('-')]
        patterns = [a for a in args if not a.startswith('-')]
        return len(patterns) == 1 and all(re.match(r'^-[A-Za-z]+\d*$', o) for o in options)
    if name == 'sed':
        return len(args) == 2 and args[0] == '-n' and re.match(r'^\d+,\d+p$', args[1]) is not None
    return False


PROFILES = {'reviewer': reviewer_source, 'spec-reader': spec_reader_source}
AGENT_PROFILES = {'independent-reviewer': 'reviewer', 'spec-reader': 'spec-reader'}


def profile_for_agent(agent_type):
    """The profile for a subagent, whether its type arrives bare or as <plugin>:<agent>."""
    return AGENT_PROFILES.get((agent_type or '').rpartition(':')[2])


def check(profile, command):
    source = PROFILES[profile]
    words = split_pipeline(command)
    if not source(words[0]):
        raise Refused(f'{" ".join(words[0])!r} is not one of the {profile} profile\'s read-only commands')
    for w in words[1:]:
        if not is_filter(w):
            raise Refused(f'{" ".join(w)!r} is not a filter that reads only the pipe')


def main():
    payload = json.load(sys.stdin)
    profile = sys.argv[1] if len(sys.argv) > 1 else ''
    if profile == '--by-agent-type':
        profile = profile_for_agent(payload.get('agent_type'))
        if profile is None:
            return 0
    if profile not in PROFILES:
        print(f'read_only_bash.py: unknown profile {profile!r}', file=sys.stderr)
        return 2
    command = payload.get('tool_input', {}).get('command', '')
    try:
        check(profile, command)
    except Refused as reason:
        print(f'Refused: {reason}. See the "What you can run" section of your instructions.', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as error:  # a crash must block, not fall through to running the command
        print(f'read_only_bash.py failed ({error}); refusing the command', file=sys.stderr)
        sys.exit(2)
