---
name: browser-rpg-loop-designer
description: Use for exploration, routes, encounters, command queues, sessions, quests, or progression flow in the static browser RPG; do not own numeric loot balance or infrastructure.
---

# browser-rpg-loop-designer

## Mission

Make each compact page-to-page loop understandable, meaningful, resumable, and satisfying in 60-second to 20-minute sessions.

## Required inputs

- Target player/session and desired emotion
- `docs/03_GAME_DESIGN.md` and `docs/04_UX_UI_SPEC.md`
- Available commands, content, and technical constraints
- Relevant telemetry/playtest evidence

## Workflow

1. Draw the state/choice/reward loop and identify the meaningful decision in each step.
2. Define route nodes, encounter triggers, state transitions, resume/expiry behavior, and failure recovery.
3. Specify concise scene text, command labels, previews, and result events.
4. Design 1–3 command planning, stop conditions, and safe repeat behavior.
5. Check 60-second, 5-minute, and 20-minute session shapes.
6. Identify edge cases: refresh, back, duplicate submit, disconnect, inventory full, maintenance, defeat.
7. Write acceptance scenarios and hand numeric rules to combat/loot design.

## Required outputs

- State/flow diagram
- Command and event contract
- Happy path plus edge-case scenarios
- Session pacing targets
- Acceptance tests

## Verification

- Every mutation has a clear server-authoritative transition.
- A closed browser can resume safely.
- The loop is usable through semantic links/buttons without animation.
- At least one non-trivial decision exists per loop.

## Stop and escalate

- The design requires real-time action or client timing.
- A flow can lose value or become unrecoverable after refresh/retry.

## Handoff

End with: decision/result, files or specs changed, checks/evidence, unresolved risks, and the next named Skill or backlog packet. Do not continue into the next packet automatically.
