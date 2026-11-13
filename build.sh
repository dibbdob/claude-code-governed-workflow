#!/usr/bin/env bash
# The whole gate. A change is done when this passes, not when the tests you happened to run pass.
set -euo pipefail
cd "$(dirname "$0")"

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

echo "== build passed"
