#!/usr/bin/env bash
# Deliver an approved OpenSpec change headless, on this machine (ADRs 0006 and 0008). On GitHub, the `deliver`
# label does the same through Anthropic's Claude Code action (.github/workflows/deliver.yml).
#
#   ./scripts/agent.sh 57                  the change for issue #57, or name it: 57-bank-holidays
#   ./scripts/agent.sh 57 --model claude-opus-5-5
#                                          the same on another model, for a change the default cannot do
#
# It runs as the deliver workflow on GitHub does: the same tools (headless-tools.txt), the same default model
# (delivery-model.txt), the same turn limit. Two things differ: on a laptop it runs under the person's own
# Claude Code login, and the model can be chosen for one run. There is no dollar cap here; the person's plan
# has its own limits, and the cap on GitHub would stop a stronger model before it finished.
#
# Makes the delivery's branch from main, runs /deliver headless on it, and checks what it left: no
# uncommitted changes, the change archived, and the build passing. The work stays on its branch for a person
# to push and open as a pull request, with the description /deliver wrote in .delivery/pull-request.md. The
# run's JSON is kept in runs/ (ignored by git) so it can be read later.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(git rev-parse --show-toplevel)"
usage='usage: scripts/agent.sh <issue-number | change-name> [--model <model>]'
wanted="${1:?$usage}"
default_model="$(tr -d '[:space:]' < "$here/delivery-model.txt")"
model="$default_model"
if (( $# > 1 )); then
  [[ "$2" == "--model" && $# -eq 3 ]] || { echo "$usage" >&2; exit 1; }
  model="$3"
fi
# A model is a name such as claude-opus-5-5: nothing a shell or Claude Code's arguments would read as more.
[[ "$model" =~ ^[a-z0-9][a-z0-9.-]*$ ]] || { echo "Not a model name: '${model}'." >&2; exit 1; }
runs="${RUNS_DIR:-$root/runs}"
# OpenSpec from the project's own pinned copy, with its usage reporting off.
export PATH="$root/node_modules/.bin:$PATH" OPENSPEC_TELEMETRY=0
cd "$root"

[[ -z "$(git status --porcelain)" ]] || { echo "Commit or stash your changes first; the delivery starts from main." >&2; exit 1; }

# An approved change is one on main: it only gets there through a reviewed pull request. It is a folder of its
# own in openspec/changes/ with a proposal, so neither the archive nor a path inside a change counts.
if [[ "$wanted" =~ ^[0-9]+$ ]]; then
  candidates="$(git ls-tree --name-only main openspec/changes/ | sed -n "s#^openspec/changes/\(${wanted}-[^/]*\)\$#\1#p")"
  (( $(grep -c . <<< "$candidates") <= 1 )) ||
    { echo "More than one change is named after issue #${wanted}; name the one to deliver:" $candidates >&2; exit 1; }
  change="$candidates"
elif [[ "$wanted" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ && "$wanted" != archive ]]; then
  change="$wanted"
else
  change=
fi
[[ -n "$change" ]] && git cat-file -e "main:openspec/changes/${change}/proposal.md" 2>/dev/null ||
  { echo "'${wanted}' is not an approved change on main." >&2; exit 1; }
git switch --quiet -c "deliver/${change}" main
started="$(git rev-parse HEAD)"

# A run that fails before it commits anything (an expired login, say) goes back to main and removes its empty
# branch, so that running it again simply works. One that has committed keeps its branch: that work is worth
# reading.
tidy() {
  local status=$?
  if (( status != 0 )) && [[ "$(git rev-parse HEAD)" == "$started" && -z "$(git status --porcelain)" ]]; then
    git switch --quiet main && git branch --quiet -D "deliver/${change}" &&
      echo "Nothing was delivered, so its branch is removed. Run it again when the cause is fixed." >&2
  fi
  return "$status"
}
trap tidy EXIT

# The commands /deliver and its subagents may run are in scripts/headless-tools.txt, which the deliver
# workflow on GitHub reads too, and dontAsk refuses the rest: a headless run has nobody to approve them. It is
# tighter than acceptEdits, which also lets unlisted file commands through (rm among them), but not airtight:
# Claude Code still runs an in-place `sed -i` unlisted. The build and the review check what it leaves. The reviewer's own hook narrows its share further; the spec-reader has no
# shell to list.
#
# The unattended run follows the same lifecycle as an attended one (.claude/commands/deliver.md), so there
# is one definition of how a specification gets built, not two.
mkdir -p "$runs"
status=0
claude -p "/deliver ${change}" \
  --output-format json \
  --model "$model" \
  --permission-mode dontAsk \
  --allowedTools "$(paste -sd, "$here/headless-tools.txt")" \
  --max-turns 60 \
  > "$runs/${change}.json" || status=$?

node -e '
  const run = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  console.log(`turns: ${run.num_turns}  cost: $${(run.total_cost_usd ?? 0).toFixed(2)}  error: ${run.is_error}`);
  console.log(run.result);
  process.exit(run.is_error ? 1 : 0);
' "$runs/${change}.json"
(( status == 0 )) || exit "$status"

# The run's own account of itself is a claim. What it committed, and the build on it, are the evidence.
[[ -z "$(git status --porcelain)" ]] || { echo "The run left uncommitted changes on deliver/${change}." >&2; exit 1; }
[[ ! -e "openspec/changes/${change}" ]] ||
  { echo "The change is not archived; /deliver's last step is openspec archive ${change} --yes." >&2; exit 1; }
./build.sh

# The pull request says which model delivered it, so a reviewer can see when a change needed more than the
# default, and the default can be changed when that keeps happening. The title line stays first.
if [[ -f .delivery/pull-request.md ]]; then
  if [[ "$model" == "$default_model" ]]; then
    note="Delivered by \`scripts/agent.sh\` on ${model}, the default in \`scripts/delivery-model.txt\`."
  else
    note="Delivered by \`scripts/agent.sh\` on ${model}, chosen for this run in place of the default, ${default_model}."
  fi
  { head -n 1 .delivery/pull-request.md; printf '\n%s\n' "$note"; tail -n +2 .delivery/pull-request.md; } > .delivery/pull-request.md.new
  mv .delivery/pull-request.md.new .delivery/pull-request.md
fi
echo "Delivered on deliver/${change}, on ${model}. Push it and open a pull request with .delivery/pull-request.md." >&2
