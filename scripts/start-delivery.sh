#!/usr/bin/env bash
# Start delivering a specification: a folder and a branch of its own, made from the team's main, and a claim
# on its issue when GitHub can be reached (ADR 0007). It works offline; the claim can come later.
#
#   scripts/start-delivery.sh 0002      prints the new folder on its last line
#
# Each delivery gets its own folder, so two deliveries never share half-finished files, whoever runs them.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
number="${1:?usage: scripts/start-delivery.sh <spec-number>}"
root="$(git rev-parse --show-toplevel)"
cd "$root"

# The team's main, as fresh as the connection allows: fetched when online, as last fetched when not, and the
# local main in a repository with no remote at all.
if git remote get-url origin >/dev/null 2>&1; then
  git fetch --quiet origin main 2>/dev/null ||
    echo "Couldn't reach the team's repository; starting from its main as last fetched." >&2
fi
base=main
git rev-parse --verify --quiet origin/main >/dev/null && base=origin/main

spec="$(git ls-tree --name-only "$base" docs/specs/ | grep -E "^docs/specs/${number}-.*\.md$" | head -n1 || true)"
[[ -n "$spec" ]] || { echo "There is no specification ${number} on ${base}." >&2; exit 1; }
git show "${base}:${spec}" | grep -q '^Status: ready$' ||
  { echo "${spec} is not marked 'Status: ready' on ${base}." >&2; exit 1; }

slug="$(basename "$spec" .md)"
branch="deliver/${slug}"
folder="${DELIVERY_DIR:-$(dirname "$root")/$(basename "$root")-deliveries}/${slug}"
git worktree add --quiet -b "$branch" "$folder" "$base" >&2
echo "Started ${number} in ${folder}, on branch ${branch}." >&2

# Claiming is the one step that assigns. Starting tries it; whatever it finds, the work can go on.
(cd "$folder" && "$here/claim-delivery.sh" "$number") >&2 || true
echo "$folder"
