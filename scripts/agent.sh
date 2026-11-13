#!/usr/bin/env bash
# Deliver an approved OpenSpec change with nobody watching, in a folder of its own (ADRs 0007, 0008).
#
#   ./scripts/agent.sh 57                         the change for issue #57, or name it: 57-bank-holidays
#   DELIVERY_FOR=<login> ./scripts/agent.sh 57    run for the person the issue is assigned to (CI)
#
# Starts the delivery (its own folder and branch, and a claim when GitHub can be reached), runs /deliver
# headless in that folder, and checks what it left. Then, with a team repository, finish-delivery.sh checks
# the issue, runs the build, pushes and opens a draft pull request; without one, the build runs here and
# the work stays on its branch. The run's JSON is kept in runs/ (ignored by git) so it can be read later.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/.." && pwd)"
wanted="${1:?usage: scripts/agent.sh <issue-number | change-name>}"
runs="${RUNS_DIR:-$root/runs}"
# OpenSpec from the project's own pinned copy, with its usage reporting off.
export PATH="$root/node_modules/.bin:$PATH" OPENSPEC_TELEMETRY=0

folder="$("$here/start-delivery.sh" "$wanted" | tail -n1)"
change="$(basename "$folder")"
cd "$folder"
started="$(git rev-parse HEAD)"

# A run that fails before it commits anything (an expired login, say) removes its empty folder and branch,
# so that running it again simply works. One that has committed keeps both: that work is worth reading. The
# claim on the issue stays either way.
tidy() {
  local status=$?
  if (( status != 0 )) && [[ "$(git rev-parse HEAD)" == "$started" && -z "$(git status --porcelain)" ]]; then
    local repo; repo="$(git rev-parse --path-format=absolute --git-common-dir)"
    cd "$(dirname "$folder")"
    git --git-dir="$repo" worktree remove "$folder" && git --git-dir="$repo" branch --quiet -D "deliver/${change}" &&
      echo "Nothing was delivered, so its folder and branch are removed. Run it again when the cause is fixed." >&2
  fi
  return "$status"
}
trap tidy EXIT

# The commands /deliver and its subagents may run are on this list, and dontAsk refuses the rest: a headless
# run has nobody to approve them. It is tighter than acceptEdits, which also lets unlisted file commands
# through (rm among them), but not airtight: Claude Code still runs an in-place `sed -i` unlisted, as it was
# seen to on 2026-11-13. The run works in a folder of its own, and the build and the review check what it
# leaves. The reviewer's own hook narrows its share further; the spec-reader has no shell to list.
#
# The unattended run follows the same lifecycle as an attended one (.claude/commands/deliver.md), so there
# is one definition of how a specification gets built, not two.
mkdir -p "$runs"
claude -p "/deliver ${change}" \
  --output-format json \
  --permission-mode dontAsk \
  --allowedTools "Read,Edit,Write,Glob,Grep,Agent,Skill,Bash(./build.sh),Bash(openspec *),Bash(git add *),Bash(git commit *),Bash(git status),Bash(git diff *),Bash(git log *),Bash(git branch *),Bash(git rev-parse *),Bash(git grep *),Bash(git show *),Bash(git ls-tree *)" \
  --max-turns 60 \
  > "$runs/${change}.json"

node -e '
  const run = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  console.log(`turns: ${run.num_turns}  cost: $${(run.total_cost_usd ?? 0).toFixed(2)}  error: ${run.is_error}`);
  console.log(run.result);
  process.exit(run.is_error ? 1 : 0);
' "$runs/${change}.json"

# The run's own account of itself is a claim. The build on what it committed is the evidence.
[[ -z "$(git status --porcelain)" ]] || { echo "The run left uncommitted changes in $folder" >&2; exit 1; }
if git remote get-url origin >/dev/null 2>&1; then
  "$here/finish-delivery.sh"
else
  ./build.sh
  echo "There is no team repository, so the delivery stays on $(git branch --show-current), in $folder." >&2
fi
