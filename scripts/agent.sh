#!/usr/bin/env bash
# Deliver a ready specification with nobody watching, in a folder of its own (ADR 0007).
#
#   ./scripts/agent.sh 0002
#   DELIVERY_FOR=<login> ./scripts/agent.sh 0002    run for the person the issue is assigned to (CI)
#
# Starts the delivery (its own folder and branch, and a claim when GitHub can be reached), runs /deliver
# headless in that folder, and checks what it left. Then, with a team repository, finish-delivery.sh checks
# the issue, runs the build, pushes and opens a draft pull request; without one, the build runs here and
# the work stays on its branch. The run's JSON is kept in runs/ (ignored by git) so it can be read later.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/.." && pwd)"
number="${1:?usage: scripts/agent.sh <spec-number>}"
runs="${RUNS_DIR:-$root/runs}"

folder="$("$here/start-delivery.sh" "$number" | tail -n1)"
slug="$(basename "$folder")"
cd "$folder"

# Every command /deliver and its subagents run must be on this list: a headless run has nobody to approve
# anything else, so an unlisted command is refused. The reviewer's own hook narrows its share further; the
# spec-reader has no shell to list.
#
# The unattended run follows the same lifecycle as an attended one (.claude/commands/deliver.md), so there
# is one definition of how a specification gets built, not two.
mkdir -p "$runs"
claude -p "/deliver ${number}" \
  --output-format json \
  --permission-mode acceptEdits \
  --allowedTools "Read,Edit,Write,Glob,Grep,Agent,Bash(./build.sh),Bash(node tools/criteria.mjs *),Bash(git add *),Bash(git commit *),Bash(git status),Bash(git diff *),Bash(git log *),Bash(git branch *),Bash(git rev-parse *),Bash(git grep *),Bash(git show *),Bash(git ls-tree *)" \
  --max-turns 60 \
  > "$runs/${slug}.json"

node -e '
  const run = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  console.log(`turns: ${run.num_turns}  cost: $${(run.total_cost_usd ?? 0).toFixed(2)}  error: ${run.is_error}`);
  console.log(run.result);
  process.exit(run.is_error ? 1 : 0);
' "$runs/${slug}.json"

# The run's own account of itself is a claim. The build on what it committed is the evidence.
[[ -z "$(git status --porcelain)" ]] || { echo "The run left uncommitted changes in $folder" >&2; exit 1; }
if git remote get-url origin >/dev/null 2>&1; then
  "$here/finish-delivery.sh"
else
  ./build.sh
  echo "There is no team repository, so the delivery stays on $(git branch --show-current), in $folder." >&2
fi
