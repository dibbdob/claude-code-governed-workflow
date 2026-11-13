#!/usr/bin/env python3
"""Generate the governed-delivery plugin from this project's own .claude/ (ADR 0005).

    python3 tools/package_plugin.py                 # write plugin/plugins/governed-delivery
    python3 tools/package_plugin.py --check         # fail if what is committed differs from a fresh build

The project's .claude/ is the one source. The plugin is a copy with the changes a plugin needs:

- Plugin subagents ignore the `hooks` frontmatter field, so an agent copied as it is would keep its
  "read-only" description and lose the hook that makes it true. The generator strips the field and the
  plugin registers the hook once, in hooks/hooks.json, choosing each agent's profile by agent_type.
- Paths to the hook point at the plugin root instead of the project.
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
GENERATED = ['agents', 'commands', 'skills', 'hooks']

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


def build(out):
    (out / 'agents').mkdir(parents=True)
    for agent in sorted((ROOT / '.claude' / 'agents').glob('*.md')):
        text = strip_hooks_field(agent.read_text())
        text = text.replace('`.claude/hooks/read_only_bash.py`', "the plugin's `hooks/read_only_bash.py`")
        (out / 'agents' / agent.name).write_text(text)

    shutil.copytree(ROOT / '.claude' / 'commands', out / 'commands')
    shutil.copytree(ROOT / '.claude' / 'skills', out / 'skills')

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
