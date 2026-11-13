#!/usr/bin/env python3
"""Generate the governed-delivery plugin from this project's own .claude/ (ADR 0005).

    python3 tools/package_plugin.py                 # write plugin/plugins/governed-delivery
    python3 tools/package_plugin.py --check         # fail if what is committed differs from a fresh build

The project's .claude/ is the one source. The plugin is a copy with the changes a plugin needs:

- Only this project's own command and agents travel. OpenSpec's skills are not copied: a project gets them
  from OpenSpec itself, with `openspec init` (ADR 0008). (`opsx` is skipped too: OpenSpec 1 kept commands
  there, and a project that has not run `openspec update` may still have them.)

- Plugin subagents ignore the `hooks` frontmatter field, so an agent copied as it is would keep its
  "read-only" description and lose the hook that makes it true. The generator strips the field and the
  plugin registers the hook once, in hooks/hooks.json, choosing each agent's profile by agent_type.
- Paths to the hook point at the plugin root instead of the project.
- Links to the project's ADRs point at this repository on GitHub. An installed plugin has no docs/ beside
  it, and the relative links would break even here, one folder deeper (`tools/links.mjs` checks).
"""

import filecmp
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / 'plugin' / 'plugins' / 'governed-delivery'
GENERATED = ['agents', 'commands', 'hooks']
DOCS_URL = 'https://github.com/dibbdob/claude-code-governed-workflow/blob/main/docs/'

HOOKS_JSON = {
    'description': 'Hold the plugin\'s read-only subagents to read-only Bash commands.',
    'hooks': {
        'PreToolUse': [{
            'matcher': 'Bash',
            'hooks': [{
                'type': 'command',
                'command': 'python3 "${CLAUDE_PLUGIN_ROOT}/hooks/read_only_bash.py" --by-agent-type || exit 2',
            }],
        }],
    },
}


def strip_hooks_field(text):
    """Remove the `hooks:` block from an agent's frontmatter; plugin agents ignore it."""
    return re.sub(r'^hooks:\n(?:[ \t]+.*\n)+', '', text, count=1, flags=re.MULTILINE)


def link_docs_on_github(text):
    """Point links into the project's docs/ (two folders up from .claude/<kind>/) at GitHub."""
    return text.replace('](../../docs/', '](' + DOCS_URL)


def build(out):
    (out / 'agents').mkdir(parents=True)
    for agent in sorted((ROOT / '.claude' / 'agents').glob('*.md')):
        text = link_docs_on_github(strip_hooks_field(agent.read_text()))
        text = text.replace('`.claude/hooks/read_only_bash.py`', "the plugin's `hooks/read_only_bash.py`")
        (out / 'agents' / agent.name).write_text(text)

    shutil.copytree(ROOT / '.claude' / 'commands', out / 'commands', ignore=shutil.ignore_patterns('opsx'))
    for command in (out / 'commands').rglob('*.md'):
        command.write_text(link_docs_on_github(command.read_text()))

    (out / 'hooks').mkdir()
    shutil.copy2(ROOT / '.claude' / 'hooks' / 'read_only_bash.py', out / 'hooks' / 'read_only_bash.py')
    (out / 'hooks' / 'hooks.json').write_text(json.dumps(HOOKS_JSON, indent=2) + '\n')


def differences(a, b):
    comparison = filecmp.dircmp(a, b)
    found = [f'{a.name}/{n}' for n in comparison.left_only + comparison.right_only + comparison.diff_files]
    for sub in comparison.common_dirs:
        found += differences(a / sub, b / sub)
    return found


def main(argv):
    with tempfile.TemporaryDirectory() as tmp:
        fresh = Path(tmp) / 'governed-delivery'
        build(fresh)
        if '--check' in argv:
            stale = [d for name in GENERATED for d in
                     (differences(TARGET / name, fresh / name) if (TARGET / name).exists() else [name])]
            if stale:
                print('The plugin is out of date with .claude/: ' + ', '.join(stale), file=sys.stderr)
                print('Run python3 tools/package_plugin.py and commit the result.', file=sys.stderr)
                return 1
            return 0
        for name in GENERATED:
            shutil.rmtree(TARGET / name, ignore_errors=True)
            shutil.copytree(fresh / name, TARGET / name)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
