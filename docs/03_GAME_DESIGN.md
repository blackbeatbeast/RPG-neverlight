# 03 — Game design specification

## 1. Core loop

```text
Town / personal page
  → choose route or dispatch
  → static scene + concise event text
  → choose/queue 1–3 commands
  → server resolves deterministic turn(s)
  → compact battle/event log
  → loot / card / recipe / codex progress
  → equip, compare, craft, salvage, or later list
  → async social trace and next route
```

Each loop should contain at least one meaningful decision among risk, command, reward, or inventory disposition.

## 2. Player state

- account and one primary Pathfinder at alpha;
- level, experience, vitality, focus, guard, speed, luck;
- discipline track and equipped skills;
- equipment slots: weapon, guard, head, body, accessory x2, relic;
- command deck: basic commands plus equipped skills;
- inventory, vault, currencies, crafting materials;
- codices, quest flags, route progress, reputation;
- feature/content preferences and moderation settings.

## 3. Exploration

A route is a directed graph of nodes. The server selects an event from a versioned encounter table using a recorded seed and the player’s route state.

Node types:

- scene: illustration + narrative choice;
- encounter: monster or hazard;
- cache: loot with trap/skill checks;
- rest: recover, repair, alter command deck;
- fork: explicit risk/reward choice;
- echo: asynchronous trace of another player;
- boss: telegraphed multi-phase encounter;
- exit: bank result and return.

Interrupting a route must be safe by default. A route can expire, but the player should not lose progress merely because the browser closed.

## 4. Combat

### Resolution model

- Turn-based, server-authoritative.
- Player queues 1–3 commands.
- Commands resolve in speed/priority order.
- Every authoritative resolution stores ruleset version, content version, seed, input state hash, commands, output events, and output state hash.
- The client renders events; it never calculates the authoritative result.

### Command vocabulary

- Strike: dependable damage.
- Guard: reduce/convert damage and build guard resource.
- Skill: cost, cooldown, tags, and target rules.
- Item: consume an owned stack through an idempotent mutation.
- Shift: change stance/row/targeting state.
- Flee: success based on encounter rules, not client timing.

### Tactical depth requirements

Each enemy family needs at least two readable properties that alter correct play:

- telegraphed heavy attack;
- armor/ward type;
- break or stagger threshold;
- retaliation tag;
- status vulnerability;
- target priority or summon behavior;
- environmental modifier.

The one-button replay command may exist for trivial farming, but it must show the queued plan and stop on configurable safety conditions such as low vitality, rare drop, inventory full, boss, or unknown enemy.

### Determinism

Authoritative randomness uses a stable seeded PRNG implementation in `packages/game-core`. Never use runtime-dependent iteration order or `Math.random()`. Golden tests must replay stored fixtures across versions.

## 5. Loot and hack-and-slash structure

An equipment instance is:

```text
base definition
+ item level
+ rarity tier
+ quality roll
+ 0..N affixes
+ optional unique rule
+ binding/trade state
+ provenance record
```

Rarity proposal:

1. Common — readable baseline
2. Uncommon — one build hint
3. Rare — multiple synergistic affixes
4. Unique — named original rule, constrained roll range
5. Relic — rare account story/provenance; not automatically best-in-slot

Rules:

- Affix power is budgeted and bounded by item level and rarity.
- Damage multipliers have explicit stacking groups and caps.
- A higher rarity must not be universally superior to a well-rolled build item.
- Duplicate/unwanted loot converts through salvage into useful deterministic materials.
- Every minted instance has a unique ID and mint ledger event.
- Drop rates are data, reviewable, simulated, and versioned.

## 6. Memory Cards

Memory Cards are collectible records recovered from the Lattice. They combine illustration, lore, codex value, and a constrained build modifier.

- acquired through play, milestones, discoveries, bosses, crafting, and events;
- no paid random acquisition;
- duplicates convert to Ink/Shards through a ledger event;
- cards may be slotted into a small board with tag interactions;
- “rare” can mean unusual condition or visual variant, not raw power;
- card text and effect schema are versioned separately;
- optional suggestive art has an equivalent general-audience image and never changes stats.

## 7. Crafting and salvage

- Salvage produces materials based on item definition, rarity, and affixes.
- Recipes are explicit, versioned, and discoverable.
- Crafting consumes through an atomic transaction and mints through the ledger.
- Repair should be a light sink, not a punishment for closing the browser.
- Reroll systems must have visible costs, hard bounds, and no premium bypass.

## 8. Codices and collection

Separate codices for enemies, locations, equipment bases, uniques, affixes, recipes, cards, and world records. A codex entry can reveal lore, source hints, and range information without exposing every surprise immediately.

## 9. Social systems

Prototype:

- anonymized/controlled player echoes;
- discovery feed;
- system-authored wanted notices.

Later alpha:

- asynchronous BBS and guild board;
- profile cards;
- guild projects;
- block, mute, report, moderator evidence capture, rate limits.

No real-time chat initially. Player text is plain text/limited markup, sanitized on write and escaped on render.

## 10. Trade and market (post-alpha gate)

Do not enable until the ledger, provenance, simulations, moderation, and recovery tooling pass review.

- escrow listing, not direct client-to-client transfer;
- list → reserve → purchase → settle/cancel state machine;
- unique idempotency key for each mutation;
- item lock while listed;
- bind states and category restrictions;
- listing fee and transaction sink;
- price/history limits to deter spam and laundering;
- immutable audit trail and admin reversal workflow;
- explicit prohibition on real-money trading;
- no premium currency convertible to market currency.

## 11. PvP (optional later)

Opt-in zones or asynchronous challenges only. Separate balance coefficients, level bands, rewards with weekly caps, anti-collusion checks, and no loss of irreplaceable items. PvP is not required for launch.

## 12. Progression pacing targets

- first command choice: < 2 minutes;
- first equipment comparison: < 8 minutes;
- first build interaction: < 20 minutes;
- first rare/unique pity-style discovery guarantee: defined through play, not purchase;
- first codex set: first session;
- first social trace: first 10 minutes;
- trade: not before the player understands binding and provenance.

Exact numbers require telemetry and simulation; they are targets, not promises.
