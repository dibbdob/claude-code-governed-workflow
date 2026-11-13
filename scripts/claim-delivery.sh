#!/usr/bin/env bash
# Make sure a specification's issue is yours. This is the only step that ever assigns an issue (ADR 0007);
# starting runs it when GitHub can be reached, and finishing and the pull-request check only look.
#
#   scripts/claim-delivery.sh 0002                      claim it: assign you, if nobody has it
#   scripts/claim-delivery.sh --check 0002              only look: is it yours, and only yours?
#   scripts/claim-delivery.sh --check 0002 --owner ben  only look: is it ben's, and only ben's?
#   scripts/claim-delivery.sh --check 0002 --any-owner  only look: is exactly one person on it? (for a
#                                                       pull request a delivery bot opened for them)
#
# Exit status: 0 it is yours (or the owner's); 1 it is someone else's, nobody's yet, or shared; 2 GitHub
# could not be reached; 3 you may not assign issues; 4 the specification names no issue.
set -uo pipefail

check=0
any=0
owner=""
args=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --check) check=1 ;;
    --owner) owner="${2:?--owner needs a GitHub login}"; shift ;;
    --any-owner) any=1 ;;
    *) args+=("$1") ;;
  esac
  shift
done
number="${args[0]:?usage: scripts/claim-delivery.sh [--check] <spec-number> [--owner <login>]}"

spec="$(ls docs/specs/"${number}"-*.md 2>/dev/null | head -n1)"
[[ -n "$spec" ]] || { echo "There is no specification docs/specs/${number}-*.md here." >&2; exit 4; }
issue="$(sed -n 's/^Issue: #\([0-9][0-9]*\)$/\1/p' "$spec" | head -n1)"
[[ -n "$issue" ]] || { echo "${spec} has no issue. A person adds the line 'Issue: #<number>' when marking it ready." >&2; exit 4; }

unreachable() {
  echo "Couldn't reach GitHub to check issue #${issue}. When you are connected, run: scripts/claim-delivery.sh ${number}" >&2
  exit 2
}
assignees() { gh issue view "$issue" --json assignees --jq '.assignees[].login'; }
count() { grep -c . <<<"$1"; }
names() { tr '\n' ' ' <<<"$1" | sed 's/ $//'; }

if [[ -z "$owner" && $any == 0 ]]; then
  owner="$(gh api user --jq .login 2>/dev/null)" || unreachable
fi
who="$(assignees 2>/dev/null)" || unreachable
[[ $any == 1 && "$(count "$who")" == 1 ]] && owner="$who"

# Only looking.
if [[ $check == 1 ]]; then
  # An issue with nobody on it is nobody's, even when no particular owner was asked for.
  if [[ -n "$who" && "$who" == "$owner" ]]; then
    echo "Issue #${issue} for ${number} is ${owner}'s, and only theirs."
    exit 0
  fi
  case "$(count "$who")" in
    0) echo "Issue #${issue} for ${number} is not assigned to anyone yet. Claim it first: scripts/claim-delivery.sh ${number}" ;;
    1) echo "Issue #${issue} for ${number} is assigned to ${who}, not ${owner}." ;;
    *) echo "Issue #${issue} for ${number} has more than one person on it ($(names "$who")); all but one step back." ;;
  esac >&2
  exit 1
fi

# Claiming.
if ! grep -qxF "$owner" <<<"$who"; then
  if [[ "$(count "$who")" -gt 0 ]]; then
    echo "Issue #${issue} for ${number} is assigned to $(names "$who"). Talk to them before going further; nothing was changed." >&2
    exit 1
  fi
  if ! gh issue edit "$issue" --add-assignee @me >/dev/null 2>&1; then
    echo "You may not assign issue #${issue}. Ask someone who can assign issues (your lead, perhaps) to assign it to you; your work can carry on meanwhile." >&2
    exit 3
  fi
  who="$(assignees 2>/dev/null)" || unreachable
fi

# Two claims in the same second can both land. Claim does not decide between them; the pull request check
# refuses to merge until one person is left.
if [[ "$(count "$who")" -gt 1 ]]; then
  echo "$(names "$who" | sed 's/ / and /g') are both on issue #${issue} for ${number}. One of you steps back before going further." >&2
  exit 1
fi

echo "Issue #${issue} for ${number} is yours."
