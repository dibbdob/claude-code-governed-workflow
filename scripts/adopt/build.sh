#!/usr/bin/env bash
# The whole gate. A change is done when this passes, not when the tests you happened to run pass.
# Started by the governed workflow's scripts/adopt.sh: its checks are the part /refine and /deliver rely on.
# Put the project's own build and tests where it says so below.
set -euo pipefail
cd "$(dirname "$0")"

# One build at a time in a checkout. mkdir is atomic.
lock=.build.lock
if ! mkdir "$lock" 2>/dev/null; then
  echo "Another build is running in this checkout. If none is, remove $lock." >&2
  exit 1
fi
trap 'rmdir "$lock"' EXIT

# OpenSpec is pinned in package.json, with its usage reporting off.
export OPENSPEC_TELEMETRY=0
[[ -x node_modules/.bin/openspec ]] || npm ci --silent --ignore-scripts

echo "== the specs and changes are well formed (openspec validate)"
node_modules/.bin/openspec validate --all --strict --no-interactive

echo "== no change is archived with tasks left undone (openspec validate --archived)"
node_modules/.bin/openspec validate --archived --no-interactive

echo "== OpenSpec's verify skill is installed (/deliver runs it before archiving)"
[[ -f .agents/skills/openspec-verify-change/SKILL.md ]] ||
  { echo "OpenSpec's verify skill is missing. Run scripts/setup-machine.sh, then openspec update." >&2; exit 1; }

echo "== every scenario has a test, with worked examples, and every change ends with the delivery steps"
node tools/specs.mjs check

echo "== every relative link in the Markdown leads somewhere"
node tools/links.mjs

echo "== the GitHub workflows (actionlint)"
if command -v actionlint >/dev/null; then
  actionlint
elif [[ -n "${CI:-}" ]]; then
  echo "actionlint is not installed, and on CI the workflows must be checked." >&2
  exit 1
else
  echo "   NOT CHECKED: actionlint is not installed (brew install actionlint). CI checks them."
fi

echo "== the project's own build and tests"
# Put them here, for example:  dotnet build && dotnet test   or   npm test
echo "   none yet"

echo "== build passed"
