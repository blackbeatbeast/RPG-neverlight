---
name: monetization-readiness-architect
description: Use only to design disabled, isolated supporter entitlements or ad placement seams and their policy/privacy gates; never integrate payments, ads, premium power, or enable revenue without a new approved ADR.
---

# monetization-readiness-architect

## Mission

Preserve future sustainability options while proving normal gameplay, combat, loot, cards, crafting, and trade cannot depend on money.

## Required inputs

- `docs/09_MONETIZATION_READINESS.md` and ADR 0005
- Current architecture/import graph and feature flags
- Current provider/ad/payment policies when an actual integration is proposed
- Privacy, refund, content, and owner approval constraints

## Workflow

1. Restate the proposed revenue value and fairness argument.
2. Classify it as direct cosmetic/supporter, sponsor/donation, advertising, or prohibited.
3. Design an entitlement boundary that exposes presentation-only capabilities and is absent from game-core/economy decisions.
4. Keep all feature flags false; design collapsed empty slots and general-only ad classification.
5. Specify processor-hosted flow, idempotent grant, refund/revocation, audit, privacy/consent, and policy recheck gates without implementing providers.
6. Add architecture tests banning imports/calls from combat, loot, drop, crafting power, market, and PvP.
7. Require a new ADR and explicit owner approval before provider integration or enablement.

## Required outputs

- Fairness/policy assessment
- Dormant entitlement/ad-slot interface
- Architecture tests and flag proof
- Enablement checklist and unresolved provider decisions

## Verification

- Normal build/UI/API exposes no monetization when flags are false.
- No money-related module can influence authoritative progression or tradeable value.
- Disabled slots have no gap, focus target, tracking, or network request.

## Stop and escalate

- Request includes paid power, paid random rewards, premium trade currency, sexual-content upsell, or deceptive ads.
- Current provider/policy acceptance or legal/privacy decision is required.

## Handoff

End with: decision/result, files or specs changed, checks/evidence, unresolved risks, and the next named Skill or backlog packet. Do not continue into the next packet automatically.
