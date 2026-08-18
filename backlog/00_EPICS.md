# Executable backlog

Each numbered Markdown file is designed to become one GitHub issue. Create issues in order with `scripts/create-github-issues.ps1` after the repository is published.

## Epic A — Foundation and vertical slice

- 001 Bootstrap monorepo and CI
- 002 Build semantic retro/modern shell
- 003 Establish content schemas and validation
- 004 Implement guest identity and player aggregate
- 005 Implement deterministic combat core
- 006 Implement exploration API vertical slice
- 007 Implement loot, inventory, equipment, salvage, and codex
- 008 Author the first region and adult cast integration
- 009 Deploy preview with free-tier guards
- 010 Harden for closed alpha

## Epic B — Collection and community

- 011 Memory Cards and crafting
- 012 Asynchronous BBS and guilds with moderation

## Epic C — Optional high-risk systems

- 013 Escrow market and trade
- 014 Opt-in asynchronous PvP
- 015 Disabled monetization boundaries

## Global definition of done

Every packet must satisfy `AGENTS.md`. A PR includes exact checks, cost/security/accessibility/content/economy impact, and stops before the next packet. Feature flags remain off unless the packet explicitly includes an approved enablement gate.
