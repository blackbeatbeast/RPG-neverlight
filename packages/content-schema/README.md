# packages/content-schema

Strict, versioned content contracts for Project Neverlight.

The package covers characters, asset manifests, zones, routes, nodes, enemies,
commands, items, affixes, Memory Cards, recipes, codex entries, drop tables,
localization keys, and bundle compatibility metadata. `validateContentBundle`
adds cross-reference, reachability, adult-age, general-fallback, provenance,
affix-budget, and drop-probability checks on top of the Zod shapes.

Run the repository-level report with:

```text
pnpm content:validate
```

The CLI builds this package, validates `content/examples/bundle.json`, and
prints a canonical SHA-256 checksum. Canonical serialization sorts object keys
and definition arrays by stable ID so reordering source files does not change
the checksum.

Suggestive assets remain optional and disabled by product policy. They require
an explicit general fallback, provenance, and review metadata; the validator
does not activate or publish any asset.
