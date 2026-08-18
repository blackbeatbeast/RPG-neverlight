#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
OWNER="${1:-blackbeatbeast}"
REPO="${2:-RPG-neverlight}"
FULL="$OWNER/$REPO"
command -v gh >/dev/null || { echo "GitHub CLI is required" >&2; exit 1; }
gh auth status
existing="$(gh issue list --repo "$FULL" --state all --limit 200 --json title --jq '.[].title')"
for file in backlog/[0-9][0-9][0-9]-*.md; do
  title="$(head -n 1 "$file" | sed 's/^# *//')"
  if grep -Fxq "$title" <<<"$existing"; then
    echo "Skip existing: $title"
  else
    gh issue create --repo "$FULL" --title "$title" --body-file "$file"
  fi
done
