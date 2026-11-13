"""The read-only hook's own tests. build.sh runs them; nothing else exercises the hook outside a session."""

import json
import subprocess
import sys
import unittest
from pathlib import Path

HOOK = Path(__file__).with_name('read_only_bash.py')


def run(profile, command, agent_type=None):
    body = {'tool_name': 'Bash', 'tool_input': {'command': command}}
    if agent_type is not None:
        body['agent_type'] = agent_type
    payload = json.dumps(body)
    return subprocess.run([sys.executable, str(HOOK), profile], input=payload, capture_output=True, text=True)


class Reviewer(unittest.TestCase):
    allowed = [
        'git show abc123:src/sla.js',
        "git show abc123:src/sla.js | sed -n '1,120p'",
        'git diff main...abc123',
        'git diff main abc123 | head -n 40',
        "git grep -n '\\[0002-AC-' abc123 -- test",
        'git ls-tree --name-only abc123 docs/specs/',
        'git rev-parse HEAD',
        'git show abc123:src/sla.js | grep -n -C3 nextOpening',
    ]
    refused = [
        'git show abc123',                       # a bare commit prints its message
        'git log',                               # commit messages are what the review must not read
        'git show abc123:src/sla.js > out.txt',  # redirect
        'git rev-parse HEAD; rm -rf src',        # chaining
        'git rev-parse HEAD && touch x',
        'git show $(git rev-parse HEAD):src/sla.js',
        'git show "$REV:src/sla.js"',
        'cat src/sla.js',
        'node -e 1',
        'git show abc123:src/sla.js | tee copy.js',
        'git show abc123:src/sla.js | sed -i s/a/b/ src/sla.js',
        'git show abc123:src/sla.js | grep x src/sla.js',  # a filter reading a file of its own
        'git diff --output=x main...abc123',
        'git grep -n -Ovim abc123 -- src',       # -O runs a program on the results
        "git show 'abc123:src/sla.js",           # unterminated quote
        # Each of these passes the per-command rules; only the character scan stops the shell expanding it.
        'git grep -n x abc123 -- src/*',
        'git grep -n x abc123 -- ~/.ssh',
        'git grep -n $HOME abc123 -- src',
        'git grep -n x abc123 -- src#',
        'git rev-parse HEAD\nrm -rf src',
    ]

    def test_allowed(self):
        for command in self.allowed:
            with self.subTest(command=command):
                self.assertEqual(run('reviewer', command).returncode, 0, run('reviewer', command).stderr)

    def test_refused(self):
        for command in self.refused:
            with self.subTest(command=command):
                result = run('reviewer', command)
                self.assertEqual(result.returncode, 2)
                self.assertIn('Refused', result.stderr)


class SpecReader(unittest.TestCase):
    def test_reads_history_and_counts_lines(self):
        for command in ['git log --oneline -15 main', 'wc -l docs/specs/0002-public-holidays.md',
                        'git log --oneline -- docs/specs/0002-public-holidays.md | head -n 5']:
            with self.subTest(command=command):
                self.assertEqual(run('spec-reader', command).returncode, 0)

    def test_refuses_writes(self):
        for command in ['git commit -m x', 'git checkout main', 'git log --output=log.txt', 'touch x',
                        'git grep -Ovim x', 'git grep --open-files-in-pager=vim x']:
            with self.subTest(command=command):
                self.assertEqual(run('spec-reader', command).returncode, 2)


class ByAgentType(unittest.TestCase):
    def test_a_read_only_agent_is_held_to_its_profile_bare_or_namespaced(self):
        for agent_type in ['independent-reviewer', 'governed-delivery:independent-reviewer']:
            with self.subTest(agent_type=agent_type):
                self.assertEqual(run('--by-agent-type', 'git log', agent_type).returncode, 2)
                self.assertEqual(run('--by-agent-type', 'git rev-parse HEAD', agent_type).returncode, 0)
        self.assertEqual(run('--by-agent-type', 'touch x', 'governed-delivery:spec-reader').returncode, 2)

    def test_the_main_session_and_other_agents_are_not_restricted(self):
        self.assertEqual(run('--by-agent-type', 'touch x').returncode, 0)
        self.assertEqual(run('--by-agent-type', 'touch x', 'general-purpose').returncode, 0)


class Failures(unittest.TestCase):
    def test_an_unknown_profile_blocks(self):
        self.assertEqual(run('anyone', 'git rev-parse HEAD').returncode, 2)

    def test_malformed_input_blocks_rather_than_crashing_open(self):
        result = subprocess.run([sys.executable, str(HOOK), 'reviewer'], input='not json',
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)


if __name__ == '__main__':
    unittest.main()
