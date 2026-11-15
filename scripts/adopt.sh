#!/usr/bin/env bash
# Set another project up to refine and deliver changes the way this one does: the scripts, checks and
# workflows, and /refine and /deliver with their agents and hook, copied in in one go. Run it from a clone
# of this repository, after scripts/setup-machine.sh.
#
#   scripts/adopt.sh <path-to-the-other-project>
#
# It adds what is missing and never overwrites a file the project already has: a file that differs from
# this repository's is kept and listed, for you to compare. It merges permissions into the project's
# .claude/settings.json and lines into its .gitignore. It commits nothing, so `git diff` shows all it did.
# Running it again changes nothing that is already in place.
#
# What it cannot do is listed at the end: the parts that describe this project's own product (its risk
# rule, its build, where its tests are) have to be fitted to the other project by a person.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
target="${1:?usage: scripts/adopt.sh <path-to-the-other-project>}"
[[ -d "$target" ]] || { echo "No such folder: $target" >&2; exit 1; }
target="$(cd "$target" && pwd)"
[[ "$target" != "$here" ]] || { echo "That is this repository; adopt another project." >&2; exit 1; }
git -C "$target" rev-parse --git-dir >/dev/null 2>&1 || { echo "$target is not a git repository." >&2; exit 1; }
[[ -z "$(git -C "$target" status --porcelain)" ]] ||
  { echo "Commit or stash the changes in $target first, so that git diff shows only what this adds." >&2; exit 1; }
command -v openspec >/dev/null || { echo "OpenSpec is not installed; run scripts/setup-machine.sh first." >&2; exit 1; }
export OPENSPEC_TELEMETRY=0
pinned="$(node -p 'require(process.argv[1]).devDependencies["@fission-ai/openspec"]' "$here/package.json")"

kept=()
copy() { # <path>, the same in both repositories
  local from="$here/$1" to="$target/$1"
  if [[ ! -e "$to" ]]; then
    mkdir -p "$(dirname "$to")" && cp -p "$from" "$to" && echo "  added  $1"
  elif cmp -s "$from" "$to"; then
    echo "  same   $1"
  else
    echo "  KEPT   $1 (yours differs; compare with $from)"
    kept+=("$1")
  fi
}

# The commands and agents link to this repository's decision records, which the other project does not
# have. Their copies link to them on GitHub instead, as the plugin's do (tools/package_plugin.py).
docs_url="$(sed -n "s/^DOCS_URL = '\(.*\)'\$/\1/p" "$here/tools/package_plugin.py")"
[[ -n "$docs_url" ]] || { echo "tools/package_plugin.py no longer names DOCS_URL." >&2; exit 1; }
copy_claude() { # <path under .claude/>
  local from to="$target/$1"
  from="$(mktemp)"
  sed "s#](../../docs/#](${docs_url}#g" "$here/$1" > "$from"
  if [[ ! -e "$to" ]]; then
    mkdir -p "$(dirname "$to")" && cp "$from" "$to" && echo "  added  $1"
  elif cmp -s "$from" "$to"; then
    echo "  same   $1"
  else
    echo "  KEPT   $1 (yours differs; compare with $here/$1)"
    kept+=("$1")
  fi
  rm -f "$from"
}

echo "== OpenSpec in the project"
initialised=false
if [[ -d "$target/openspec" ]]; then
  echo "  same   openspec/ (already initialised)"
else
  (cd "$target" && openspec init --tools claude --no-animation >/dev/null) && echo "  added  openspec/, and OpenSpec's skills for Claude Code"
  initialised=true
fi
# The config openspec init has just written has no rules, and this project's take its place. A config the
# project had before is its own, rules or not, and is kept like any other file.
if $initialised || [[ ! -f "$target/openspec/config.yaml" ]]; then
  cp "$here/openspec/config.yaml" "$target/openspec/config.yaml" && echo "  added  openspec/config.yaml (this project's rules)"
elif cmp -s "$here/openspec/config.yaml" "$target/openspec/config.yaml"; then
  echo "  same   openspec/config.yaml"
else
  echo "  KEPT   openspec/config.yaml (yours differs; add this project's rules from $here/openspec/config.yaml)"
  kept+=(openspec/config.yaml)
fi

echo "== OpenSpec pinned, for the build and the workflows (npm ci)"
# The version the project already asks for, under either kind of dependency.
theirs="$( [[ -f "$target/package.json" ]] && node -p '
  const p = require(process.argv[1]);
  p.devDependencies?.["@fission-ai/openspec"] ?? p.dependencies?.["@fission-ai/openspec"] ?? ""' "$target/package.json" || true)"
if [[ "$theirs" == "$pinned" ]]; then
  echo "  same   package.json pins OpenSpec $pinned"
elif [[ -n "$theirs" ]]; then
  echo "  KEPT   package.json (it asks for OpenSpec $theirs; this workflow is built and tested on $pinned)"
  kept+=(package.json)
else
  [[ -f "$target/package.json" ]] || printf '{\n  "private": true\n}\n' > "$target/package.json"
  node -e '
    const fs = require("fs"); const [file, version] = process.argv.slice(1);
    const p = JSON.parse(fs.readFileSync(file, "utf8"));
    p.devDependencies = { ...(p.devDependencies ?? {}), "@fission-ai/openspec": version };
    fs.writeFileSync(file, JSON.stringify(p, null, 2) + "\n");
  ' "$target/package.json" "$pinned"
  (cd "$target" && npm install --package-lock-only --ignore-scripts --silent >/dev/null)
  echo "  added  OpenSpec $pinned to package.json, and package-lock.json"
fi

echo "== scripts, checks and workflows"
for f in scripts/agent.sh scripts/refinement.sh scripts/approved-issues.sh scripts/headless-tools.txt \
  scripts/refine-tools.txt scripts/delivery-model.txt tools/specs.mjs tools/links.mjs tools/issue-summary.mjs \
  .github/workflows/deliver.yml .github/workflows/refine.yml .github/workflows/refined.yml \
  .github/workflows/revised.yml .github/actions/install-actionlint/action.yml; do
  copy "$f"
done
if [[ -e "$target/scripts/test-citations.json" ]]; then
  echo "  same   scripts/test-citations.json (the project's own)"
else
  mkdir -p "$target/scripts" && cp -p "$here/scripts/test-citations.json" "$target/scripts/test-citations.json"
  echo "  added  scripts/test-citations.json (a starting point: say where the project's tests are)"
fi
for f in build.sh .github/workflows/build.yml; do
  if [[ -e "$target/$f" ]]; then
    echo "  KEPT   $f (the project's own; add the checks listed below)"
    kept+=("$f")
  else
    mkdir -p "$(dirname "$target/$f")"
    cp -p "$here/scripts/adopt/$(basename "$f")" "$target/$f"
    echo "  added  $f (a starting point: add the project's own build and tests)"
  fi
done

# In the project, not only in each person's plugin: a run started by a label on GitHub has the checkout
# and nothing else, and its workflow runs these.
echo "== /refine and /deliver, their agents and the reviewer's hook"
for f in .claude/commands/refine.md .claude/commands/deliver.md .claude/agents/spec-reader.md \
  .claude/agents/independent-reviewer.md; do
  copy_claude "$f"
done
copy .claude/hooks/read_only_bash.py

echo "== permissions and ignored files"
node -e '
  const fs = require("fs"); const [ours, theirs] = process.argv.slice(1);
  const o = JSON.parse(fs.readFileSync(ours, "utf8")).permissions;
  const t = fs.existsSync(theirs) ? JSON.parse(fs.readFileSync(theirs, "utf8")) : {};
  const before = JSON.stringify(t);
  t.permissions ??= {};
  for (const kind of ["allow", "deny"]) {
    const have = t.permissions[kind] ?? [];
    t.permissions[kind] = [...have, ...o[kind].filter((rule) => !have.includes(rule))];
  }
  if (JSON.stringify(t) === before) { console.log("  same   .claude/settings.json"); process.exit(0); }
  fs.mkdirSync(require("path").dirname(theirs), { recursive: true });
  fs.writeFileSync(theirs, JSON.stringify(t, null, 2) + "\n");
  console.log("  added  permissions to .claude/settings.json (git push stays denied; refinement.sh is allowed)");
' "$here/.claude/settings.json" "$target/.claude/settings.json"
touch "$target/.gitignore"
# A last line with no newline would have the first line added joined onto it, and both would stop working.
[[ ! -s "$target/.gitignore" || -z "$(tail -c 1 "$target/.gitignore")" ]] || echo >> "$target/.gitignore"
added=0
for line in node_modules runs/ .build.lock/ .delivery/ .refine/; do
  grep -qxF "$line" "$target/.gitignore" || { echo "$line" >> "$target/.gitignore"; added=1; }
done
(( added )) && echo "  added  lines to .gitignore" || echo "  same   .gitignore"

# A config the project kept has rules of its own, or none. Without this workflow's, OpenSpec never ends a
# change's tasks with the Delivery group, and the build fails every change /refine writes.
if grep -q 'Grounding:' "$target/openspec/config.yaml" 2>/dev/null; then
  config_fit="openspec/config.yaml: the risk rule names what is risky for the example desk (a deadline, a
    priority). Name what is risky for this product."
else
  config_fit="openspec/config.yaml is the project's own, kept, and has none of this workflow's rules. Add the
    rules: and operations: from $here/openspec/config.yaml to it first: until it has the tasks rule, the
    build fails every change /refine writes, for having no Delivery group."
fi

cat <<EOF

Done. Nothing is committed: review it with  git -C "$target" diff  and  git -C "$target" status.

Fit these to the project by hand (docs/guide/setting-up.md has the detail):
  - ${config_fit}
  - build.sh: keep the OpenSpec, scenario, link and actionlint checks; put the project's own build and
    tests where it says so. scripts/ and the workflows assume ./build.sh is the whole gate.
  - scripts/test-citations.json: where the tests are and how their titles cite a scenario. It starts as
    test/*.test.js with test('[capability] Scenario name'); for xUnit, Go, pytest and most others, set
    "dirs" and "suffixes" and use "style": "quoted".
  - GitHub: the ruleset on main and, to start runs with a label, the Claude GitHub app and the
    ANTHROPIC_API_KEY secret. If the project has a general @claude workflow, keep it off refine/ pull
    requests.
  - Each developer: scripts/setup-machine.sh, from a clone of this repository, for the tools. /refine and
    /deliver now come with the project, so the plugin is not needed here.
EOF
if (( ${#kept[@]} )); then
  echo
  echo "Kept as they were, because the project already had them: ${kept[*]}"
fi
