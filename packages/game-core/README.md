# packages/game-core

Pure deterministic game rules. No I/O, wall clock, database, network, filesystem, environment
variable, or global randomness dependency.

## Combat contract

`resolveCombat` accepts a versioned ruleset, an unsigned seed, a normalized combat state, and a
queue of one to three commands. It returns a structured event log plus input-state, output-state,
and resolution hashes. The authoritative rules use integer arithmetic, a fixed xorshift32 PRNG,
stable key ordering for hashes, bounded status/proc/event counts, and server-owned state transitions.

The three foundation enemy patterns are deliberately counterplay-oriented:

- `heavy-telegraph`: readable heavy charge; Guard or Flee is the safe answer.
- `warded-guardian`: high ward; piercing-lunge or ward-break is the intended answer.
- `retaliator`: reacts to direct attacks; Guard or Shift avoids predictable retaliation.

`scripts/combat-replay.mjs` reads golden fixtures under `fixtures/combat/`, while
`scripts/combat-simulate.mjs` runs fixed-seed distribution checks. Both scripts use filesystem I/O
only at the CLI boundary; the package itself remains pure.
