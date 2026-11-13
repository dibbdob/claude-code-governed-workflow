#!/usr/bin/env bash
# The whole gate. A change is done when this passes, not when the tests you happened to run pass.
set -euo pipefail
cd "$(dirname "$0")"

# One build at a time in a checkout. Two at once share node's test output and the working tree, and
# whichever finishes second reports on a tree the first one may have changed. mkdir is atomic.
lock=.build.lock
if ! mkdir "$lock" 2>/dev/null; then
  echo "Another build is running in this checkout. If none is, remove $lock." >&2
  exit 1
fi
trap 'rmdir "$lock"' EXIT

echo "== syntax"
find src test tools -name '*.js' -o -name '*.mjs' | xargs -n1 node --check

echo "== dates are read in UTC"
# The local forms pass on a machine set to UTC and fail everywhere else (ADR 0001).
if grep -rnE '\.(get|set)(Hours|Minutes|Seconds|Day|Date|Month|FullYear)\(' src; then
  echo "Use the getUTC*/setUTC* form of these Date methods." >&2
  exit 1
fi

echo "== every finished criterion has a test"
node tools/criteria.mjs check

echo "== tests"
node --test

echo "== the plugin is generated from .claude/"
python3 tools/package_plugin.py --check

echo "== the read-only hook"
python3 .claude/hooks/test_read_only_bash.py 2>&1 | tail -n 1

echo "== build passed"
