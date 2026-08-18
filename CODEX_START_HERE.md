# Codex start here

You are implementing a browser RPG from a design-controlled blueprint. Do not start by generating a giant application.

## First session objective

Complete only `backlog/001-bootstrap-monorepo.md` unless the owner explicitly selects another packet.

## Mandatory sequence

1. Read `AGENTS.md` and `config/product-constraints.yml`.
2. Read `docs/00_EXECUTIVE_BRIEF.md`, `docs/05_TECH_ARCHITECTURE.md`, and ADRs 0001–0003.
3. Read the selected backlog packet.
4. Load only the Skills named in that packet.
5. Restate scope, acceptance criteria, risks, and expected file changes.
6. Implement the smallest vertical boundary.
7. Run the packet’s verification commands.
8. Record evidence in the PR body.
9. Stop. Do not automatically begin the next packet.

## Definition of a good first implementation

A good first PR is boring and trustworthy: reproducible installs, strict TypeScript, deterministic unit test example, content-schema validation example, responsive semantic shell, local D1 setup, and CI. It is not a content dump and does not enable trade, PvP, ads, or payments.

## Source-of-truth priority

1. `config/product-constraints.yml`
2. Accepted ADRs
3. Product and technical specs under `docs/`
4. Selected backlog packet
5. Skill guidance
6. Example content

If these conflict, stop and propose an ADR update.

## How to use Skills

Project Skills live under `.agents/skills/<skill-name>/SKILL.md`. A Skill is a procedure, not a persona. Use the smallest set necessary. Do not load all Skills into every task.

## Forbidden shortcuts

- No direct client writes to D1.
- No `Math.random()` in authoritative game rules.
- No locally computed loot accepted as truth by the API.
- No UI copied from screenshots or historical pages.
- No “temporary” paid service without owner approval.
- No sexualized age ambiguity.
- No paid gacha or premium combat advantage.
