#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
SOURCE_ROOT="$PWD"
OWNER="${1:-blackbeatbeast}"
REPO="${2:-RPG-neverlight}"
SKIP_ISSUES="${SKIP_ISSUES:-0}"
FULL="$OWNER/$REPO"
KNOWN_INITIAL_README_BLOB="0f80ce68aa2a1e82541375461f476e21b862de75"

step() { printf '\n==> %s\n' "$1"; }
die() { printf 'ERROR: %s\n' "$1" >&2; exit 1; }
command -v git >/dev/null || die "git is required."
command -v gh >/dev/null || die "GitHub CLI (gh) is required."

step "Check GitHub authentication"
if ! gh auth status --hostname github.com >/dev/null 2>&1; then
  gh auth login --hostname github.com --git-protocol https --web
fi
gh auth setup-git
[[ "$(gh api user --jq .login)" == "$OWNER" ]] || die "Authenticate as $OWNER before publishing."

step "Validate blueprint"
if command -v node >/dev/null; then
  node scripts/validate-blueprint.mjs
else
  for file in README.md AGENTS.md CODEX_START_HERE.md PROJECT_PLAN_JA.md \
    backlog/001-bootstrap-monorepo.md \
    .agents/skills/product-vision-keeper/SKILL.md; do
    [[ -f "$file" ]] || die "Missing required file: $file"
  done
  echo "Node.js not found; completed the fallback file check."
fi

gh repo view "$FULL" --json nameWithOwner,defaultBranchRef,visibility >/dev/null \
  || die "Repository $FULL is not accessible."

TMP="$(mktemp -d "${TMPDIR:-/tmp}/RPG-neverlight-publish.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

step "Clone GitHub main branch"
gh repo clone "$FULL" "$TMP" -- --branch main --single-branch

if [[ -f "$TMP/AGENTS.md" && -f "$TMP/CODEX_START_HERE.md" \
   && -f "$TMP/backlog/001-bootstrap-monorepo.md" \
   && -f "$TMP/.agents/skills/product-vision-keeper/SKILL.md" ]]; then
  echo "Blueprint is already present; no duplicate commit was created."
else
  tracked_count="$(git -C "$TMP" ls-tree -r --name-only HEAD | wc -l | tr -d '[:space:]')"
  first_tracked="$(git -C "$TMP" ls-tree -r --name-only HEAD | sed -n '1p')"
  if [[ "$tracked_count" == "1" && "$first_tracked" == "README.md" ]]; then
    remote_blob="$(git -C "$TMP" rev-parse 'HEAD:README.md')"
    if [[ "$remote_blob" != "$KNOWN_INITIAL_README_BLOB" ]] && ! cmp -s "$SOURCE_ROOT/README.md" "$TMP/README.md"; then
      die "Remote README.md differs from the known initializer. Nothing was overwritten."
    fi
  elif [[ "$tracked_count" != "0" ]]; then
    die "Remote contains files other than the matching README.md. Nothing was overwritten."
  fi

  step "Copy blueprint"
  tar --exclude='./.git' --exclude='./node_modules' --exclude='./.publish-work' -cf - . | tar -C "$TMP" -xf -

  login="$(gh api user --jq .login)"
  user_id="$(gh api user --jq .id)"
  git -C "$TMP" config user.name "$login"
  git -C "$TMP" config user.email "$user_id+$login@users.noreply.github.com"
  git -C "$TMP" add --all
  for shell_script in scripts/create-github-issues.sh scripts/publish-to-github.sh; do
    [[ -f "$TMP/$shell_script" ]] && git -C "$TMP" update-index --chmod=+x -- "$shell_script"
  done

  if git -C "$TMP" diff --cached --quiet; then
    echo "No changes to commit."
  else
    git -C "$TMP" commit -m "docs: add Project Neverlight blueprint and Codex skills"
    step "Push main"
    git -C "$TMP" push origin main
  fi
fi

if [[ "$SKIP_ISSUES" != "1" ]]; then
  step "Create Codex backlog issues"
  "$SOURCE_ROOT/scripts/create-github-issues.sh" "$OWNER" "$REPO"
fi

printf '\nPublished: https://github.com/%s\n' "$FULL"
