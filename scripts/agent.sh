#!/usr/bin/env bash
# Hand a ready specification to Claude Code, headless, on a branch of its own.
#
#   ./scripts/agent.sh 0002
#
# A specification is ready when its file says `Status: ready`. The run is unattended: Claude Code gets the
# spec, a short list of tools it may use, and a turn limit, and leaves its work as commits on
# agent/<number>-<slug>. The JSON it prints is kept in runs/ (ignored by git) so a run can be read later.
set -euo pipefail
cd "$(dirname "$0")/.."

number="${1:?usage: scripts/agent.sh <spec-number>}"
spec="$(ls docs/specs/"${number}"-*.md 2>/dev/null | head -n1 || true)"
[[ -n "$spec" ]] || { echo "No specification docs/specs/${number}-*.md" >&2; exit 1; }
grep -q '^Status: ready$' "$spec" || { echo "$spec is not marked 'Status: ready'" >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "The working tree has changes; commit or stash them first" >&2; exit 1; }

slug="$(basename "$spec" .md)"
git switch -q main

# Every command /deliver and its subagents run must be on this list: a headless run has nobody to approve
# anything else, so an unlisted command is refused. The reviewer's own hook narrows its share further;
# the spec-reader has no shell to list.
#
# The unattended run follows the same lifecycle as an attended one (.claude/commands/deliver.md), so there
# is one definition of how a specification gets built, not two. /deliver branches, numbers the criteria
# and marks the specification; this script only starts it and checks what it left.
prompt="/deliver ${number}"

mkdir -p runs
claude -p "$prompt" \
  --output-format json \
  --permission-mode acceptEdits \
  --allowedTools "Read,Edit,Write,Glob,Grep,Agent,Bash(./build.sh),Bash(node tools/criteria.mjs *),Bash(git switch *),Bash(git add *),Bash(git commit *),Bash(git status),Bash(git diff *),Bash(git log *),Bash(git branch *),Bash(git rev-parse *),Bash(git grep *),Bash(git show *),Bash(git ls-tree *)" \
  --max-turns 60 \
  > "runs/${slug}.json"
branch="$(git branch --show-current)"

node -e '
  const run = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  console.log(`turns: ${run.num_turns}  cost: $${(run.total_cost_usd ?? 0).toFixed(2)}  error: ${run.is_error}`);
  console.log(run.result);
  process.exit(run.is_error ? 1 : 0);
' "runs/${slug}.json"

# The run's own account of itself is a claim. The build on what it committed is the evidence.
[[ -z "$(git status --porcelain)" ]] || { echo "The run left uncommitted changes on $branch" >&2; exit 1; }
./build.sh
