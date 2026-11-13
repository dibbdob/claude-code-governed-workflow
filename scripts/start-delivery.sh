#!/usr/bin/env bash
# Start delivering an OpenSpec change: a folder and a branch of its own, made from the team's main, and a claim
# on its issue when GitHub can be reached (ADRs 0007 and 0008). It works offline; the claim can come later.
#
#   scripts/start-delivery.sh 57                 the change for issue #57 (openspec/changes/57-...)
#   scripts/start-delivery.sh 57-bank-holidays   or the change by name
#
# A change is ready once it is on the team's main: it only gets there through a reviewed pull request, which
# is its refinement. Prints the new folder on its last line.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
wanted="${1:?usage: scripts/start-delivery.sh <issue-number | change-name>}"
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

# Open changes on the team's main: openspec/changes/<name>/proposal.md, not archived.
open="$(git ls-tree -r --name-only "$base" openspec/changes/ 2>/dev/null |
  sed -n 's#^openspec/changes/\([^/]*\)/proposal\.md$#\1#p' | grep -v '^archive$' || true)"
if [[ "$wanted" =~ ^[0-9]+$ ]]; then
  change="$(grep -E "^${wanted}-" <<<"$open" | head -n1 || true)"
else
  change="$(grep -xF "$wanted" <<<"$open" || true)"
fi
[[ -n "$change" ]] || {
  echo "'${wanted}' is not an approved change on ${base}. A change is ready to deliver once its proposal has been reviewed and merged into the team's main." >&2
  exit 1
}

branch="deliver/${change}"
folder="${DELIVERY_DIR:-$(dirname "$root")/$(basename "$root")-deliveries}/${change}"
git worktree add --quiet -b "$branch" "$folder" "$base" >&2
# Share the project's installed tools (OpenSpec) with the new folder, so its build works offline too.
[[ -d "$root/node_modules" && ! -e "$folder/node_modules" ]] && ln -s "$root/node_modules" "$folder/node_modules"
echo "Started ${change} in ${folder}, on branch ${branch}." >&2

# Claiming is the one step that assigns. Starting tries it; whatever it finds, the work can go on.
(cd "$folder" && "$here/claim-delivery.sh" "$change") >&2 || true
echo "$folder"
