#!/usr/bin/env bash
# Set another project up to refine and deliver changes the way this one does: everything README's "Using it
# in another project" says to copy in, done in one go. Run it from a clone of this repository, after
# scripts/setup-machine.sh.
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

echo "== OpenSpec in the project"
if [[ -d "$target/openspec" ]]; then
  echo "  same   openspec/ (already initialised)"
else
  (cd "$target" && openspec init --tools claude --no-animation >/dev/null) && echo "  added  openspec/, and OpenSpec's skills for Claude Code"
fi
# A config with no rules is the one openspec init writes; this project's rules take its place.
if [[ -f "$target/openspec/config.yaml" ]] && grep -q '^rules:' "$target/openspec/config.yaml"; then
  if cmp -s "$here/openspec/config.yaml" "$target/openspec/config.yaml"; then echo "  same   openspec/config.yaml"
  else echo "  KEPT   openspec/config.yaml (it has rules of its own; compare with $here/openspec/config.yaml)"; kept+=(openspec/config.yaml); fi
else
  cp "$here/openspec/config.yaml" "$target/openspec/config.yaml" && echo "  added  openspec/config.yaml (this project's rules)"
fi

echo "== OpenSpec pinned, for the build and the workflows (npm ci)"
if [[ -f "$target/package.json" ]] &&
  [[ "$(node -p 'require(process.argv[1]).devDependencies?.["@fission-ai/openspec"] ?? ""' "$target/package.json")" == "$pinned" ]]; then
  echo "  same   package.json pins OpenSpec $pinned"
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
  .github/workflows/revised.yml; do
  copy "$f"
done
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
added=0
for line in node_modules runs/ .build.lock/ .delivery/ .refine/; do
  grep -qxF "$line" "$target/.gitignore" || { echo "$line" >> "$target/.gitignore"; added=1; }
done
(( added )) && echo "  added  lines to .gitignore" || echo "  same   .gitignore"

cat <<EOF

Done. Nothing is committed: review it with  git -C "$target" diff  and  git -C "$target" status.

Fit these to the project by hand (README, "Using it in another project"):
  - openspec/config.yaml: the risk rule names what is risky for the example desk (a deadline, a priority).
    Name what is risky for this product.
  - build.sh: keep the OpenSpec, scenario, link and actionlint checks; put the project's own build and
    tests where it says so. scripts/ and the workflows assume ./build.sh is the whole gate.
  - Tests: tools/specs.mjs looks for tests in test/*.test.js, titled test('[capability] Scenario name').
    For tests in another language or place, change the line in it that reads them.
  - GitHub: the ruleset on main, the Claude GitHub app and the ANTHROPIC_API_KEY secret (README, "Setting
    it up on GitHub"). If the project has a general @claude workflow, keep it off refine/ pull requests.
  - Each developer: scripts/setup-machine.sh --plugin, from a clone of this repository, for /refine and
    /deliver.
EOF
if (( ${#kept[@]} )); then
  echo
  echo "Kept as they were, because the project already had them: ${kept[*]}"
fi
