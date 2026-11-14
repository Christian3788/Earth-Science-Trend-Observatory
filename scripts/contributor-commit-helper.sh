#!/usr/bin/env bash
set -euo pipefail

# Safe helper for contributors: commits currently staged changes using YOUR local Git identity.
# This script intentionally does NOT set GIT_AUTHOR_NAME/EMAIL for anyone else.

usage() {
  cat <<'EOF'
Usage:
  scripts/contributor-commit-helper.sh "type: commit message" [--coauthor "Full Name <email@example.com>"]...

Examples:
  scripts/contributor-commit-helper.sh "feat: add location search debounce"
  scripts/contributor-commit-helper.sh "feat: improve anomaly grid sampling" \
    --coauthor "Hellen Onyango <hellenonyango340@gmail.com>"

Notes:
- Configure your own identity first:
    git config user.name "Your Name"
    git config user.email "you@example.com"
- Stage only the relevant changes before running:
    git add -p   # or git add <files>
- Do not impersonate other contributors.
EOF
}

if [[ ${1:-} == "-h" || ${1:-} == "--help" || $# -lt 1 ]]; then
  usage
  exit $([[ $# -lt 1 ]] && echo 1 || echo 0)
fi

msg="$1"
shift

name="$(git config --get user.name || true)"
email="$(git config --get user.email || true)"

if [[ -z "$name" || -z "$email" ]]; then
  echo "Error: git user.name/user.email not configured for this repository." >&2
  echo "Run:" >&2
  echo "  git config user.name \"Your Name\"" >&2
  echo "  git config user.email \"you@example.com\"" >&2
  exit 1
fi

if git diff --cached --quiet; then
  echo "No staged changes. Stage files/hunks first (e.g. git add -p)." >&2
  exit 1
fi

coauthors=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --coauthor)
      if [[ $# -lt 2 ]]; then
        echo "Error: --coauthor requires a value like \"Full Name <email@example.com>\"" >&2
        exit 1
      fi
      coauthors+=("$2")
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

tmpfile="$(mktemp)"
{
  echo "$msg"
  if [[ ${#coauthors[@]} -gt 0 ]]; then
    echo
    for c in "${coauthors[@]}"; do
      echo "Co-authored-by: $c"
    done
  fi
} > "$tmpfile"

echo "Committing as: $name <$email>"
git commit -F "$tmpfile"
rm -f "$tmpfile"
