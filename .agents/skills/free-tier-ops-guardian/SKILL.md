---
name: free-tier-ops-guardian
description: Use for hosting choices, database/query design, assets, telemetry, rate limits, public alpha capacity, or any feature that could create cloud cost; require owner approval before paid resources.
---

# free-tier-ops-guardian

## Mission

Keep prototypes playable at zero approved spend through explicit budgets, efficient queries, caps, and graceful degradation—not wishful assumptions about free tiers.

## Required inputs

- Current official provider limits/pricing and recheck date
- Expected player/action/load model
- Request, CPU, D1 read/write, storage/egress estimates
- Operational mode and owner budget constraints

## Workflow

1. Verify current official limits/pricing instead of relying on memory.
2. Estimate per-action and daily usage for normal, peak, bot, and failure scenarios.
3. Set budgets and thresholds for request, CPU, D1 reads/writes/storage, assets, CI, and telemetry.
4. Optimize indexes, caching, batching, pagination, payloads, and static asset delivery.
5. Implement per-action limits plus normal/degraded/read-only/maintenance modes and kill switches.
6. Create synthetic threshold drills and owner-facing runbook/dashboard notes.
7. Record the exact paid-resource approval gate and revisit assumptions before public launch.

## Required outputs

- Cost model with assumptions
- Budgets/limits/config
- Optimization and degradation plan
- Threshold drill evidence
- Recheck date/source list

## Verification

- Bot/loop scenarios cannot create unbounded usage.
- Read-only/maintenance preserves data and communicates clearly.
- No paid resource or raised limit is introduced silently.
- Hot D1 queries use bounded indexed access.

## Stop and escalate

- Expected load exceeds free/approved budget without a safe cap.
- A provider policy/limit is unclear or recently changed.

## Handoff

End with: decision/result, files or specs changed, checks/evidence, unresolved risks, and the next named Skill or backlog packet. Do not continue into the next packet automatically.
