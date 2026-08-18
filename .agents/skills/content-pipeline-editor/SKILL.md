---
name: content-pipeline-editor
description: Use for content schemas, IDs, localization, route/content bundles, validation, activation/rollback, asset manifests, or authoring workflow; not for final legal approval or numeric balance alone.
---

# content-pipeline-editor

## Mission

Turn original writing, definitions, and assets into versioned, validated, reversible bundles that engine and reviewers can trust.

## Required inputs

- `docs/13_CONTENT_PIPELINE.md` and content schemas
- Source definitions/assets and provenance
- Ruleset compatibility and balance constraints
- Localization/review requirements

## Workflow

1. Assign stable namespaced IDs and localization keys; never use display names as keys.
2. Validate schema, references, duplicate IDs, route reachability, age, fallback, alt text, provenance, and banned patterns.
3. Coordinate balance validators/simulations for drops, affixes, recipes, and cards.
4. Build immutable bundle metadata with schema/content/ruleset compatibility and checksums.
5. Produce human review packets for narrative, originality, R-15, accessibility, and assets.
6. Activate in preview/staging; test and record rollback of activation.
7. Keep canonical source, generated delivery assets, reports, and production activation separate.

## Required outputs

- Validated content bundle
- Validation/simulation/review reports
- Asset manifest and checksums
- Activation/rollback plan

## Verification

- Invalid references/ages/fallback/provenance fail with actionable messages.
- Bundle is reproducible and checksum-stable.
- Bad content can be deactivated without code/database history rollback.

## Stop and escalate

- Source rights or adult-age metadata is missing.
- Content depends on copied names/data or runtime unreviewed AI generation.

## Handoff

End with: decision/result, files or specs changed, checks/evidence, unresolved risks, and the next named Skill or backlog packet. Do not continue into the next packet automatically.
