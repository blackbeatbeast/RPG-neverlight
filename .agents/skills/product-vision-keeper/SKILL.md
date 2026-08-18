---
name: product-vision-keeper
description: Use for feature proposals, scope changes, roadmaps, or PR review to preserve Project Neverlight pillars and reject drift; do not use as the sole technical implementation skill.
---

# product-vision-keeper

## Mission

Translate requests into the smallest change that strengthens static image/text command play, async presence, deep collection, free-first fairness, and original adult-character identity.

## Required inputs

- `config/product-constraints.yml`
- `docs/00_EXECUTIVE_BRIEF.md` and `docs/02_PRODUCT_VISION.md`
- The proposal, issue, PR, or owner request
- Relevant accepted ADRs

## Workflow

1. Restate the player problem and the promised outcome without naming an implementation.
2. Score the proposal against every non-negotiable pillar and identify conflicts.
3. Classify it as core, supporting, optional-later, or anti-pillar.
4. Reduce the proposal to a reversible vertical slice and name what is explicitly deferred.
5. Define measurable acceptance criteria in player language and operational language.
6. Identify required ADR/product-constraint changes instead of silently bending them.
7. Hand off to the domain Skills needed for implementation.

## Required outputs

- A one-paragraph decision
- Pillar impact table
- In/out-of-scope boundary
- Acceptance criteria and release gate
- Named follow-on Skills/backlog packet

## Verification

- The proposal still works with images disabled and all motion disabled where it touches core play.
- No paid power, mandatory real-time interaction, or protected expression is introduced.
- The slice can be reviewed independently.

## Stop and escalate

- The owner request directly contradicts an accepted hard constraint.
- The public product promise or core loop would materially change without an ADR.

## Handoff

End with: decision/result, files or specs changed, checks/evidence, unresolved risks, and the next named Skill or backlog packet. Do not continue into the next packet automatically.
