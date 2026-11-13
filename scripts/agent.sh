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
branch="agent/${slug}"
git switch -c "$branch" main

sed -i.bak 's/^Status: ready$/Status: in progress/' "$spec" && rm "$spec.bak"
git commit -q -am "${number} Pick up the specification"

prompt="Implement the specification in ${spec}. Write the tests first, one per acceptance criterion, then
the code. Run ./build.sh until it passes, then commit your work with a message that starts '${number} '.
Finally set the specification's status line to 'Status: done' and commit that."

mkdir -p runs
claude -p "$prompt" \
  --output-format json \
  --permission-mode acceptEdits \
  --allowedTools "Read,Edit,Write,Glob,Grep,Bash(./build.sh),Bash(git add:*),Bash(git commit:*),Bash(git status),Bash(git diff:*)" \
  --max-turns 40 \
  > "runs/${slug}.json"

node -e '
  const run = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  console.log(`turns: ${run.num_turns}  cost: $${(run.total_cost_usd ?? 0).toFixed(2)}  error: ${run.is_error}`);
  console.log(run.result);
  process.exit(run.is_error ? 1 : 0);
' "runs/${slug}.json"
