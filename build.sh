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
# The local forms pass on a machine set to UTC and fail everywhere else (ADR 0001): the get/set methods, and
# the ways a moment is made or shown in local time. new Date with more than one argument reads them as local
# time, as does a date and time written with no zone (new Date('2026-03-02T09:00'), and Date.parse, which reads
# text the same way), and the toLocale and toDate/TimeString forms show one. Text built at run time is beyond
# a grep: a date and time made from text must end in Z or an offset.
local_forms='\.(get|set)(Hours|Minutes|Seconds|Milliseconds|Day|Date|Month|FullYear|Year)\(|getTimezoneOffset\(|\.toLocale[A-Za-z]*String\(|\.to(Date|Time)String\(|Date\.parse\(|new Date\(([^()]|\([^()]*\))*,'
quote="['\"\`]"
text_with_no_zone="new Date\\(${quote}[^'\"\`]*[T ][0-9]{2}:[0-9]{2}(:[0-9]{2}(\\.[0-9]+)?)?${quote}"
if grep -rnE "${local_forms}|${text_with_no_zone}" src; then
  echo "Use the UTC forms: getUTC*/setUTC*, Date.UTC(...) for a moment from parts, and toISOString to show one." >&2
  exit 1
fi

# OpenSpec is pinned in package.json. Its usage reporting is off for every build (ADR 0006).
export OPENSPEC_TELEMETRY=0
[[ -x node_modules/.bin/openspec ]] || npm ci --silent --ignore-scripts

echo "== the specs and changes are well formed (openspec validate)"
node_modules/.bin/openspec validate --all --strict --no-interactive >/dev/null ||
  node_modules/.bin/openspec validate --all --strict --no-interactive

echo "== no change is archived with tasks left undone (openspec validate --archived)"
node_modules/.bin/openspec validate --archived --no-interactive >/dev/null ||
  node_modules/.bin/openspec validate --archived --no-interactive

echo "== OpenSpec's verify skill is installed (/deliver runs it before archiving)"
# `openspec update` matches a project's skills to the machine's profile, so a teammate on the default
# profile would remove it without knowing (README, "Setting it up for a team").
[[ -f .agents/skills/openspec-verify-change/SKILL.md ]] ||
  { echo "OpenSpec's verify skill is missing. Add 'verify' to your OpenSpec workflows, then run openspec update." >&2; exit 1; }

echo "== every scenario has a test"
node tools/specs.mjs check

echo "== tests"
node --test

echo "== the plugin is generated from .claude/"
python3 tools/package_plugin.py --check

echo "== every relative link in the Markdown leads somewhere"
node tools/links.mjs

echo "== the GitHub workflows (actionlint)"
# The workflows spend money, push branches and edit issues, and a mistake in one shows only when someone adds
# a label. actionlint checks their expressions, outputs and triggers, and shellcheck's view of each step. On
# GitHub it is installed, pinned, before the build, so a missing one fails there; on a laptop the build says
# it did not check them, rather than passing quietly.
if command -v actionlint >/dev/null; then
  actionlint
elif [[ -n "${CI:-}" ]]; then
  echo "actionlint is not installed, and on CI the workflows must be checked." >&2
  exit 1
else
  echo "   NOT CHECKED: actionlint is not installed (brew install actionlint, or see github.com/rhysd/actionlint). CI checks them."
fi

echo "== the read-only hook"
python3 .claude/hooks/test_read_only_bash.py 2>&1 | tail -n 1

echo "== build passed"
