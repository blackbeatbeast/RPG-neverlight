# Codex Skills catalog

Project Skills are checked into `.agents/skills/<name>/SKILL.md`. OpenAI’s Codex documentation describes a Skill as a directory containing a required `SKILL.md` with `name` and `description`, plus optional scripts/references/assets; repository-scoped skills can live under `$REPO_ROOT/.agents/skills`.

## Required Skills

### Day-one / core implementation

1. **product-vision-keeper** — protects pillars, non-goals, and acceptance language.
2. **historical-game-researcher** — translates public historical evidence into abstract mechanics without importing expression.
3. **clean-room-ip-guardian** — reviews naming, assets, copy, layouts, and claims for clean-room risk.
4. **browser-rpg-loop-designer** — designs route, encounter, command, result, and session loops.
5. **retro-modern-ui-designer** — creates one semantic UI with retro and modern themes.
6. **combat-and-loot-designer** — owns deterministic combat, affixes, drops, progression, salvage, and simulation.
7. **character-content-director** — develops original adult characters and R-15-safe content briefs.
8. **cloudflare-fullstack-engineer** — implements React/Vite/Hono/Workers/D1 boundaries and deployment.
9. **game-data-and-migrations** — owns schemas, D1 migrations, repositories, ledgers, and recovery notes.
10. **test-and-verification-engineer** — builds deterministic, integration, E2E, and acceptance evidence.
11. **security-and-abuse-guardian** — threat-models auth, replay, XSS, bots, moderation, duplication, and cost abuse.
12. **free-tier-ops-guardian** — budgets requests/reads/writes/storage and implements degradation/kill switches.

### Before collection/social/economy expansion

13. **card-collection-designer** — designs Memory Cards, duplicate sinks, boards, and non-gacha acquisition.
14. **trade-market-economist** — designs escrow, binding, fees, provenance, simulations, anti-RMT, and reversal.
15. **social-moderation-designer** — designs async social systems with report/block/mute and moderation evidence.
16. **content-pipeline-editor** — owns content schemas, validation, bundle activation, localization, and provenance.
17. **accessibility-performance-auditor** — audits 360 px/desktop, keyboard, screen reader, bandwidth, and reduced motion.

### Before any revenue work

18. **monetization-readiness-architect** — maintains disabled, isolated ad/supporter seams without pay-to-win coupling.

## Invocation principle

Use two to four Skills per task, not all eighteen. The backlog packet names the smallest expected set. `product-vision-keeper`, `clean-room-ip-guardian`, or `security-and-abuse-guardian` may be added when a change crosses their boundary.

## Skill quality standard

Every Skill specifies:

- when it should and should not trigger;
- required inputs;
- imperative workflow;
- concrete outputs;
- verification checks;
- stop/escalation conditions;
- handoff format.
