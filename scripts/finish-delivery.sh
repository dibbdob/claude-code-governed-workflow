#!/usr/bin/env bash
# Hand a finished delivery to the team: check the change is archived and its issue is yours, run the build,
# push the branch, and open a draft pull request with the description /deliver wrote. It only looks at the
# issue; it never assigns one (ADRs 0007, 0008).
#
#   scripts/finish-delivery.sh                          from the delivery's folder
#   DELIVERY_FOR=<login> scripts/finish-delivery.sh     when a bot finishes for the person assigned
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
cd "$(git rev-parse --show-toplevel)"

branch="$(git branch --show-current)"
[[ "$branch" =~ ^deliver/(.+)$ ]] ||
  { echo "Run this from a delivery's folder, on a deliver/<change> branch, not '${branch}'." >&2; exit 1; }
change="${BASH_REMATCH[1]}"
# Archiving folds the change into openspec/specs, so the specs and the code that meets them merge together.
# OpenSpec says whether it is done: the change is no longer open, and an archived change carries its name.
openspec="$here/../node_modules/.bin/openspec"
[[ -x "$openspec" ]] || openspec=openspec
names() { OPENSPEC_TELEMETRY=0 "$openspec" list "$@" --json | node -e \
  'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).changes.map(c=>c.name).join("\n")))'; }
if names | grep -qxF "$change" || ! names --archived | grep -qE -- "-${change}\$"; then
  echo "Archive the change before finishing: openspec archive ${change} --yes (the last step of /deliver)." >&2
  exit 1
fi
description=.delivery/pull-request.md
[[ -s "$description" ]] || { echo "There is no ${description}. /deliver writes it as its last step." >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "There are uncommitted changes. Commit them first." >&2; exit 1; }

owner=()
[[ -n "${DELIVERY_FOR:-}" ]] && owner=(--owner "$DELIVERY_FOR")
"$here/claim-delivery.sh" --check "$change" ${owner[@]+"${owner[@]}"} || exit 1

./build.sh
git push --quiet -u origin HEAD

issue="${change%%-*}"
title="${change}: $(head -n1 "$description" | sed -E 's/^Merge [^:]+: //')"
body="$(mktemp)"
trap 'rm -f "$body"' EXIT
{ cat "$description"; printf '\nCloses #%s\n' "$issue"; } >"$body"
gh pr create --draft --title "$title" --body-file "$body"
