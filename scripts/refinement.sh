#!/usr/bin/env bash
# The git and GitHub half of /refine in a session (ADR 0010), so that the person refining never runs a git
# command and the session never pushes on its own: .claude/settings.json still denies `git push`, and this
# script is the one way a refinement reaches GitHub. On GitHub, the refine workflow does the same with the
# Claude Code action's own push.
#
#   scripts/refinement.sh start <issue>     main for a new refinement, or the issue's refine/ branch to revise
#   scripts/refinement.sh publish <issue>   commit the change folder, build, push, open or update the spec PR
#
# A refinement changes only its change folder, openspec/changes/<issue>-<what-it-does>/. Publishing refuses
# anything else in the working tree, so nothing but a specification goes up for review this way.
set -euo pipefail
usage='usage: scripts/refinement.sh start|publish <issue-number>'
action="${1:?$usage}"
issue="${2:?$usage}"
[[ "$issue" =~ ^[0-9]+$ ]] || { echo "Not an issue number: '${issue}'." >&2; exit 1; }
cd "$(git rev-parse --show-toplevel)"

if git remote get-url origin >/dev/null 2>&1; then remote=origin; main=origin/main; else remote=; main=main; fi

# A change for the issue that is on main has been approved; one archived has been delivered.
approved() {
  git ls-tree --name-only "$main" openspec/changes/ openspec/changes/archive/ 2>/dev/null |
    grep -E "^openspec/changes/(archive/[0-9-]+-)?${issue}-[^/]+$" || true
}

# The issue's refine/ branch, here or on the remote, if a refinement of it has been published before: named
# refine/<change> by this script, or refine/issue-<issue>-<when> by the refine workflow on GitHub.
existing_branch() {
  { git for-each-ref --format='%(refname:short)' "refs/heads/refine/${issue}-*" "refs/heads/refine/issue-${issue}-*"
    [[ -n "$remote" ]] && git for-each-ref --format='%(refname:short)' \
      "refs/remotes/${remote}/refine/${issue}-*" "refs/remotes/${remote}/refine/issue-${issue}-*" | sed "s#^${remote}/##"
  } | sort -u | head -n1
}

case "$action" in
start)
  [[ -z "$(git status --porcelain)" ]] ||
    { echo "Commit or stash your changes first; a refinement starts from a clean checkout." >&2; exit 1; }
  [[ -n "$remote" ]] && git fetch --quiet "$remote"
  if [[ -n "$(approved)" ]]; then
    echo "Issue #${issue} is already refined: its change is on main ($(approved | head -n1)). A change to it is a new issue." >&2
    exit 1
  fi
  branch="$(existing_branch)"
  if [[ -n "$branch" ]]; then
    git switch --quiet "$branch"
    [[ -n "$remote" ]] && git merge --quiet --ff-only "${remote}/${branch}" 2>/dev/null || true
    pr="$(gh pr list --head "$branch" --state open --json url --jq '.[0].url' 2>/dev/null || true)"
    echo "Revising the refinement of issue #${issue} on ${branch}.${pr:+ Its spec pull request: ${pr}}"
  else
    git switch --quiet main
    [[ -n "$remote" ]] && git merge --quiet --ff-only "$main"
    echo "A new refinement of issue #${issue}, starting from main."
  fi
  ;;

publish)
  [[ -n "$remote" ]] || { echo "There is no remote to publish to." >&2; exit 1; }
  changes=("openspec/changes/${issue}-"*/)
  [[ -d "${changes[0]}" ]] || { echo "There is no change for issue #${issue} (openspec/changes/${issue}-...)." >&2; exit 1; }
  (( ${#changes[@]} == 1 )) || { echo "More than one change is named after issue #${issue}: ${changes[*]}" >&2; exit 1; }
  change="$(basename "${changes[0]}")"

  others="$(git status --porcelain --untracked-files=all | cut -c4- | grep -v "^openspec/changes/${change}/" || true)"
  [[ -z "$others" ]] || { printf 'A refinement changes only its change folder. Also changed:\n%s\n' "$others" >&2; exit 1; }

  branch="$(git branch --show-current)"
  if [[ "$branch" == main ]]; then
    branch="refine/${change}"
    git switch --quiet -c "$branch"
  elif [[ "$branch" != "refine/${issue}-"* && "$branch" != "refine/issue-${issue}-"* ]]; then
    echo "On ${branch}; a refinement is published from main or from its refine/${issue}-... branch." >&2
    exit 1
  fi

  ./build.sh

  if [[ -n "$(git status --porcelain)" ]]; then
    if git merge-base --is-ancestor HEAD "$main"; then verb=Propose; else verb=Revise; fi
    git add -A -- "openspec/changes/${change}"
    git commit --quiet -m "${change}: ${verb}" -m "Refines #${issue}."
  fi
  git push --quiet -u "$remote" "HEAD:refs/heads/${branch}"

  description=.refine/pull-request.md
  pr="$(gh pr list --head "$branch" --state open --json url --jq '.[0].url')"
  if [[ -z "$pr" ]]; then
    [[ -f "$description" ]] || { echo "Write the spec pull request's description to ${description} first." >&2; exit 1; }
    pr="$(gh pr create --base main --head "$branch" --title "$(head -n1 "$description")" \
      --body "$(tail -n +2 "$description")")"
    gh issue comment "$issue" --body "Spec pull request for this issue: ${pr}. Review it there; mention @claude in a comment to have it revised."
  else
    [[ -f "$description" ]] && gh pr edit "$pr" --body "$(tail -n +2 "$description")" >/dev/null
    gh pr comment "$pr" --body "Revised: $(git log -1 --format=%s)."
  fi
  echo "Published ${change} on ${branch}: ${pr}"
  ;;

*)
  echo "$usage" >&2
  exit 1
  ;;
esac
