# 13 — Content and asset pipeline

## Content-as-data flow

1. Author/edit source JSON/YAML in a content workspace.
2. Validate schema, IDs, references, localization keys, age fields, asset provenance, and banned terms.
3. Run balance simulations and route reachability checks.
4. Produce an immutable content bundle with checksum and reports.
5. Review narrative, IP similarity, R-15 boundary, accessibility, and balance.
6. Activate bundle in preview/staging.
7. Run smoke tests and deterministic fixtures.
8. Activate in production behind a version pointer.
9. Roll back activation—not history—if defects appear.

## Definition categories

- characters and dialogue nodes;
- locations, routes, and encounter tables;
- enemies and behavior tags;
- commands, skills, statuses;
- item bases, affixes, uniques, drop tables;
- Memory Cards and card-board modifiers;
- recipes and salvage rules;
- quests, dispatches, codex entries;
- UI copy/localization;
- asset manifests.

## ID convention

```text
char.mireia-voss
zone.glass-marsh
enemy.rust-mantis
item.weapon.signal-knife
affix.focus.echoing
card.first-signal
recipe.signal-knife.mk1
```

IDs are lowercase ASCII, stable, and never recycled. Display names may change.

## Narrative format

Keep default page text compact:

- scene setup: 40–140 Japanese characters;
- command label: ideally 4–14 characters;
- command consequence preview: one short line;
- combat event: one clause plus structured values;
- expandable lore may be longer.

Writing should be vivid, not verbose. Avoid live AI generation for canonical content.

## Art manifest minimum

- asset ID and file path;
- character/location/content linkage;
- creator/provider;
- creation date;
- license/contract reference;
- model/tool and model/license where generated;
- source inputs and proof of rights;
- general/suggestive classification;
- canonical character age and reviewer;
- dimensions, crop variants, alt text;
- checksum and replacement history.

## Image targets

Initial targets are deliberately static and bandwidth-conscious:

- scene master: 1536×1024 or equivalent 3:2;
- delivery variants: AVIF/WebP at roughly 768 and 384 widths;
- character portrait: 768×1024 master with responsive crop notes;
- card art: 768×1080 master;
- no embedded text unless a localized alternative exists.

Exact formats require browser/support tests. Always keep source masters outside public delivery paths.

## Content QA

Automated:

- schema/references/duplicate IDs;
- route reachability and dead-end intent;
- drop table validity;
- power-budget and cap checks;
- age >= 20 for named depicted humans;
- optional asset has general fallback;
- alt text present;
- provenance entry present;
- no external URL/hotlink in production definitions.

Human:

- tone and clarity;
- originality and confusing similarity;
- character agency/adult coding;
- R-15 boundary;
- accessibility description;
- build usefulness and exploit potential.
