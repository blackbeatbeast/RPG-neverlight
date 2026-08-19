# First region playtest notes

Status: internal rehearsal notes for Issue #8. These notes are a repeatable moderation script,
not a claim that a third-party moderated study has been completed.

## Target loop

`Rainbell Quay → dispatch → Glass Marsh route → fork → encounter/cache → equipment choice →
boss preparation → codex echo → safe exit`

The meaningful decision is whether to take the safer silt route or the shorter reed bridge, then
which item family to equip. The three intentionally readable build paths are:

1. **Tempo:** weapon/accessory speed and attack affixes; act before the telegraph resolves.
2. **Ward:** guard/body/ward items; absorb drainer and bulwark pressure.
3. **Signal reading:** focus/luck/relic items; inspect, predict, and improve cache/boss choices.

## Five-minute moderation script

1. Start at the town page and read the three-line region notice.
2. Accept the low-risk dispatch from Luca.
3. Inspect the route entry and choose the fork without a combat tutorial.
4. At the first encounter, ask the player to name the readable threat property before selecting
   one to three commands.
5. At the cache or first drop, ask the player to compare one item and choose whether to equip,
   keep, or salvage it.

Success observation: a first-time player can state what the route risks, what the item changes,
and how to return safely without relying on animation or audio.

## Twenty-minute moderation script

1. Repeat the first route with the opposite fork.
2. Inspect the codex records for the region, one enemy family, and one adult cast member.
3. Try two item paths and explain why a higher rarity is not automatically the correct choice.
4. Trigger a refresh/back/retry during a safe state and confirm the route and inventory do not
   duplicate or lose value.
5. Reach the boss approach and read the three-light telegraph before committing.

Success observation: the player uses a deliberate counterplay plan and can resume after closing
the page.

## Thirty-minute moderation script

1. Complete one route attempt, including a boss preparation and the echo node.
2. Compare tempo, ward, and signal-reading equipment paths.
3. Salvage a protected or rare item only after the explicit confirmation/unlock step.
4. Read all four character codex entries and describe each character's non-romantic job.
5. Explain the source, bind state, and provenance of one retained item.

Success observation: the player can describe a build identity, a content relationship, and a safe
economy action in under thirty minutes.

## Recorded internal rehearsal

- Bundle: `contentVersion 0.4.0`, route `route.glass-marsh`, 12 reachable nodes.
- Automated content smoke: `pnpm content:validate` passed with stable checksum recorded by the
  CLI; counts are 4 adult characters, 7 enemies including 1 boss, 20 item bases, and 20 affixes.
- Equipment-choice rehearsal: the existing desktop/mobile inventory E2E reaches equip → derived
  stats → unequip and remains overflow-free. This is a technical rehearsal, not a human study.
- Accessibility rehearsal: semantic buttons, text alternatives, no mandatory image/audio, and
  keyboard/touch paths remain covered by the existing shell and inventory browser suites.
- Human moderator sign-off: pending before Public Alpha.
