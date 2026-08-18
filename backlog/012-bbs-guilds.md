# 012 — Add asynchronous BBS and guilds with moderation

- Status: Ready for issue
- Phase: Expansion / gated
- Required Skills: `social-moderation-designer`, `security-and-abuse-guardian`, `retro-modern-ui-designer`, `free-tier-ops-guardian`

## Objective

Create low-pressure asynchronous community features with block/mute/report, rate limits, evidence, moderation audit, and cost bounds before social exposure.

## In scope

- Public/town and guild board posts, profiles, guild membership/roles/projects.
- Plain-text/limited-markup sanitization, spam limits, cooldowns, pagination.
- Block, mute, report, moderator queue/actions/appeal notes/audit.
- Community guideline surfacing, RMT/contact-info rules, data retention.

## Out of scope

- Private messages
- Real-time chat
- Voice/images/uploads
- Automated permanent bans without human review

## Acceptance criteria

- Stored/reflected XSS tests pass.
- Blocked/muted content does not leak through feeds/notifications.
- Reports capture sufficient bounded evidence and preserve moderator audit.
- Posting abuse cannot cause unbounded writes/cost.
- Guild role changes are authorized and race-safe.

## Verification

Run and record the exact output/result of:

- `pnpm security:test -- --suite social`
- `pnpm test:e2e -- --grep moderation`
- `pnpm test:abuse -- --suite posting`
- `manual moderator workflow transcript`

## Required PR evidence

- Screenshots/transcript where UI or operations changed.
- Determinism/economy evidence where authoritative state changed.
- Security, abuse, privacy, accessibility, cost, content/IP, and migration impact.
- Known limitations and the next smallest packet.

## Stop and escalate when

- Social launch lacks a responsible moderator/response plan.
- Feature requires unreviewed user image uploads or private messaging.

Do not begin the next backlog packet in the same PR.
