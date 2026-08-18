---
name: social-moderation-designer
description: Use for BBS, guilds, profiles, feeds, reports, blocks, mutes, community rules, moderator tooling, retention, or appeals; avoid private/realtime/image chat in initial scope.
---

# social-moderation-designer

## Mission

Create warm asynchronous presence with enforceable boundaries, user control, auditability, and a realistic moderation workload.

## Required inputs

- Social use case and audience
- `CODE_OF_CONDUCT.md`, R-15/content policy, privacy/security constraints
- Expected moderator capacity and data retention
- Cost/rate-limit assumptions

## Workflow

1. Define the smallest social object and why it improves the core loop.
2. Specify visibility, identity, roles, permissions, lifecycle, pagination, and deletion behavior.
3. Limit markup/input; sanitize on write and escape on render.
4. Design block, mute, report, evidence snapshot, moderator queue/action/reason/audit, and appeal notes before launch.
5. Set posting/edit/delete cooldowns, rate limits, spam/RMT/contact rules, and cost caps.
6. Test XSS, evasion, block leakage, role races, report abuse, and moderator access.
7. Write community copy and an operational response path.

## Required outputs

- Social state/permission model
- Moderation/report/block flows
- Abuse/rate/retention policy
- Moderator runbook and tests

## Verification

- Blocked/muted content does not leak.
- Every moderator action is authorized and audited.
- Stored/reflected XSS and spam/cost tests pass.
- Feature can be disabled without losing core play.

## Stop and escalate

- No responsible moderation path exists.
- The request adds private messages, realtime chat, or image uploads without a new threat/privacy plan.

## Handoff

End with: decision/result, files or specs changed, checks/evidence, unresolved risks, and the next named Skill or backlog packet. Do not continue into the next packet automatically.
