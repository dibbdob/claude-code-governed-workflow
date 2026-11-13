#!/usr/bin/env bash
# The whole gate. A change is done when this passes, not when the tests you happened to run pass.
set -euo pipefail
cd "$(dirname "$0")"

echo "== syntax"
find src test -name '*.js' -print0 | xargs -0 -n1 node --check

echo "== tests"
node --test

echo "== build passed"
