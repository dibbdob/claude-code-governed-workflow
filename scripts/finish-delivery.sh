#!/usr/bin/env bash
# Hand a finished delivery to the team: check its issue is yours, run the build, push the branch, and open a
# draft pull request with the description /deliver wrote. It only looks at the issue; it never assigns one
# (ADR 0007).
#
#   scripts/finish-delivery.sh                          from the delivery's folder
#   DELIVERY_FOR=<login> scripts/finish-delivery.sh     when a bot finishes for the person assigned
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
cd "$(git rev-parse --show-toplevel)"

branch="$(git branch --show-current)"
[[ "$branch" =~ ^deliver/([0-9]{4})- ]] ||
  { echo "Run this from a delivery's folder, on a deliver/<number>-... branch, not '${branch}'." >&2; exit 1; }
number="${BASH_REMATCH[1]}"
description=.delivery/pull-request.md
[[ -s "$description" ]] || { echo "There is no ${description}. /deliver writes it as its last step." >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "There are uncommitted changes. Commit them first." >&2; exit 1; }

owner=()
[[ -n "${DELIVERY_FOR:-}" ]] && owner=(--owner "$DELIVERY_FOR")
"$here/claim-delivery.sh" --check "$number" ${owner[@]+"${owner[@]}"} || exit 1

./build.sh
git push --quiet -u origin HEAD

issue="$(sed -n 's/^Issue: #\([0-9][0-9]*\)$/\1/p' docs/specs/"${number}"-*.md | head -n1)"
title="${number}: $(head -n1 "$description" | sed -E 's/^Merge [^:]+: //')"
body="$(mktemp)"
trap 'rm -f "$body"' EXIT
{ cat "$description"; printf '\nCloses #%s\n' "$issue"; } >"$body"
gh pr create --draft --title "$title" --body-file "$body"
