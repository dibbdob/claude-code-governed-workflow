#!/usr/bin/env bash
# The issues whose changes were approved between two commits on main: a change named after its issue,
# openspec/changes/<issue>-<what-it-does>/proposal.md, that is in AFTER and was not in BEFORE, however it
# got there. Comparing what exists, not what git calls an addition, also catches a change renamed to its
# issue number. BEFORE is all zeros on a branch's first push, as GitHub sends it. (ADR 0008)
#
#   scripts/approved-issues.sh <before> <after>     prints one issue number per line
set -euo pipefail
before="${1:?usage: scripts/approved-issues.sh <before> <after>}"
after="${2:?usage: scripts/approved-issues.sh <before> <after>}"

issues() {
  git ls-tree -r --name-only "$1" openspec/changes/ |
    sed -n 's#^openspec/changes/\([0-9][0-9]*\)-[^/]*/proposal\.md$#\1#p' | sort -u
}

if [[ "$before" =~ ^0+$ ]]; then
  issues "$after"
else
  comm -13 <(issues "$before") <(issues "$after")
fi
