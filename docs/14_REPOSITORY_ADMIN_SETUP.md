# 14 — Repository administration setup

## Initial settings

- Current repository visibility: `public` (owner-created); automation must not change visibility
- Before adding proprietary assets or secrets, explicitly decide whether development should remain public or move private
- Default branch: `main`
- Merge preference: squash or rebase; avoid unreviewed merge commits
- Delete head branches after merge: recommended
- Require pull requests before merging once collaborators join
- Draft PR by default for Codex work
- Never store Cloudflare/API secrets in variables visible to forks or client builds

## Suggested labels

- `epic`
- `foundation`
- `gameplay`
- `ui-accessibility`
- `content`
- `security-abuse`
- `economy-high-risk`
- `social-moderation`
- `ops-cost`
- `legal-ip-review`
- `decision-needed`
- `blocked`
- `codex-ready`

## Issue setup

Run `scripts/create-github-issues.ps1` or `.sh` to convert the 15 backlog packets into issues. Keep packet order in the title. Do not assign later-phase issues to Codex before prerequisite gates pass.

## Required checks after implementation bootstrap

- blueprint validation
- formatting/lint
- TypeScript typecheck
- unit/integration tests
- production build
- content validation
- migration test
- critical Playwright smoke test

Add checks only after their scripts exist; do not create permanently failing placeholder requirements.

## Secrets/environments later

- `preview`: isolated D1 and preview Worker
- `staging`: migration/content rehearsal
- `production`: protected/manual approval initially

Production secrets and database bindings must never be available to preview pull requests.
