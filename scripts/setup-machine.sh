#!/usr/bin/env bash
# Everything a machine needs once, for developers and for spec authors who refine in a session. Run it from
# a clone of this repository. It is safe to run again: it changes only what is missing or out of date, and
# says what it did.
#
#   scripts/setup-machine.sh            set the machine up
#   scripts/setup-machine.sh --check    say what is missing, and change nothing
#   scripts/setup-machine.sh --plugin   also install the governed-delivery plugin for your user, for working
#                                       in another project that uses /refine and /deliver (not needed here,
#                                       where .claude/ already has them)
#
# It installs with npm and, where it is available, Homebrew. It does not sign you in to anything: where a
# login is needed it says so, and `gh auth login` is started for you only when you run it in a terminal.
# ok, did and todo only print and count, so `A && ok || todo` cannot run both.
# shellcheck disable=SC2015
set -uo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
check=false plugin=false
for arg in "$@"; do
  case "$arg" in
    --check) check=true ;;
    --plugin) plugin=true ;;
    *) echo "usage: scripts/setup-machine.sh [--check] [--plugin]" >&2; exit 1 ;;
  esac
done

missing=0
ok()   { printf '  ok    %s\n' "$1"; }
did()  { printf '  done  %s\n' "$1"; }
todo() { printf '  TODO  %s\n' "$1"; missing=$((missing + 1)); }
has()  { command -v "$1" >/dev/null 2>&1; }
brew_install() { # <formula> <what>: install with Homebrew if this machine has it
  if $check; then todo "$2 is not installed"; return; fi
  if has brew; then
    brew install --quiet "$1" >/dev/null && did "installed $2 with Homebrew" || todo "brew install $1 failed"
  else
    todo "install $2 (no Homebrew here; see its own install page)"
  fi
}

echo "== tools this workflow runs"
if has node && node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=12)?0:1)'; then
  ok "Node $(node --version)"
else
  todo "Node 22.12 or later (https://nodejs.org)"
fi
has git && ok "git" || todo "git"
has python3 && ok "Python 3" || todo "Python 3 (the hook and the plugin generator)"
has claude && ok "Claude Code" || todo "Claude Code (https://claude.com/claude-code), then sign in by running claude"

echo "== OpenSpec"
want="$(node -p 'require(process.argv[1]).devDependencies["@fission-ai/openspec"]' "$root/package.json" 2>/dev/null)"
have="$(OPENSPEC_TELEMETRY=0 openspec --version 2>/dev/null | tr -d '[:space:]')"
if [[ -n "$want" && "$have" == "$want" ]]; then
  ok "OpenSpec $have"
elif $check; then
  todo "OpenSpec ${want:-?} (this machine has ${have:-none})"
elif npm install --global --ignore-scripts --silent "@fission-ai/openspec@${want}" >/dev/null 2>&1; then
  did "installed OpenSpec $want"
else
  todo "npm install --global @fission-ai/openspec@${want} failed"
fi
workflows='["propose","explore","apply","update","sync","archive","verify"]'
current="$(OPENSPEC_TELEMETRY=0 openspec config get workflows 2>/dev/null | tr -d '[:space:]')"
profile="$(OPENSPEC_TELEMETRY=0 openspec config get profile 2>/dev/null | tr -d '[:space:]')"
if [[ "$current" == "$workflows" && "$profile" == custom ]]; then
  ok "OpenSpec's workflows include verify"
elif $check; then
  todo "OpenSpec's workflows do not include verify, which /deliver runs"
else
  OPENSPEC_TELEMETRY=0 openspec config set workflows "$workflows" >/dev/null &&
    OPENSPEC_TELEMETRY=0 openspec config set profile custom >/dev/null &&
    did "set OpenSpec's workflows to include verify" || todo "could not set OpenSpec's workflows"
fi

echo "== checks and GitHub"
has actionlint && ok "actionlint (checks the GitHub workflows)" || brew_install actionlint "actionlint"
has gh && ok "GitHub CLI" || brew_install gh "the GitHub CLI"
if has gh && gh auth status >/dev/null 2>&1; then
  ok "GitHub CLI signed in"
elif has gh && ! $check && [[ -t 0 ]]; then
  echo "  The GitHub CLI is not signed in; /refine publishes through it. Starting gh auth login:"
  gh auth login && did "signed in to GitHub" || todo "gh auth login"
else
  todo "sign in to GitHub: gh auth login"
fi

if $plugin; then
  echo "== the governed-delivery plugin, for your user"
  if ! has claude; then
    todo "the plugin needs Claude Code first"
  elif claude plugin list 2>/dev/null | grep -q 'governed-delivery'; then
    ok "governed-delivery is installed"
  elif $check; then
    todo "governed-delivery is not installed"
  else
    claude plugin marketplace add "$root/plugin" >/dev/null 2>&1
    claude plugin install governed-delivery@governed-workflow >/dev/null &&
      did "installed governed-delivery" || todo "claude plugin install governed-delivery@governed-workflow failed"
  fi
fi

echo
if (( missing == 0 )); then
  echo "This machine is ready."
else
  echo "${missing} thing(s) still to do, marked TODO above."
  exit 1
fi
