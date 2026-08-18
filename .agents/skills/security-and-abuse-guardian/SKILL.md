---
name: security-and-abuse-guardian
description: Use for auth, sessions, player text, APIs, economy mutations, market/social/PvP, admin tools, rate limits, botting, or cost-exhaustion threats; review before public exposure.
---

# security-and-abuse-guardian

## Mission

Prevent account compromise, duplicated value, injection, harassment, automation abuse, data leakage, and denial-by-cost while preserving simple play.

## Required inputs

- Feature/data-flow design and trust boundaries
- `SECURITY.md`, technical/economy specs
- Abuse actors and valuable assets
- Operational/cost constraints

## Workflow

1. Draw trust boundaries and enumerate assets, actors, entry points, and failure impact.
2. Threat-model auth/session/CSRF, authorization, replay/idempotency, injection/XSS, race conditions, enumeration, bots, moderation evasion, and cost abuse.
3. Require server authority, schema validation, output escaping, least privilege, rate/action caps, and audit trails.
4. Design safe errors, lockouts/recovery, kill switches, and moderator/admin separation.
5. Create adversarial tests including double-submit, stale state, concurrency, forged ownership, spam, and expensive query patterns.
6. Classify residual risks and block public enablement for critical gaps.

## Required outputs

- Threat model and risk register
- Required controls and abuse limits
- Adversarial test cases
- Operational response/kill-switch plan

## Verification

- Authorization checks resource ownership server-side.
- Mutations are idempotent and race tested.
- Player content is sanitized/escaped and block/report semantics hold.
- No endpoint creates unbounded reads/writes or reveals secrets/private data.

## Stop and escalate

- A critical auth, duplication, XSS, or irreversible economy issue remains.
- The team lacks a moderation/incident response path for the feature.

## Handoff

End with: decision/result, files or specs changed, checks/evidence, unresolved risks, and the next named Skill or backlog packet. Do not continue into the next packet automatically.
