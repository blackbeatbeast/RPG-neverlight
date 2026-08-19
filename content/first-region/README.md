# First region bundle

`bundle.json` is the versioned, original-content candidate for the internal Alpha first region.
It is intentionally data-only: no production art, external URLs, runtime AI generation, trade,
PvP, premium currency, or suggestive asset is included.

## Activation and rollback

1. Validate the bundle and record its canonical checksum:
   `pnpm content:validate content/first-region/bundle.json`.
2. Run the clean-room checklist:
   `pnpm content:similarity-review`.
3. Run the bounded content economy rehearsal:
   `pnpm economy:simulate -- --bundle first-region`.
4. Activate only by changing a version pointer in preview/staging; do not mutate historical
   definitions or production data in place.
5. Roll back by moving the pointer to the previous content version and re-running validation.

The current CI command `pnpm content:validate` targets this bundle. The small
`content/examples/bundle.json` remains as a schema regression fixture.

## Asset gate

Portrait and scene paths are written provenance placeholders. They are not approved production
assets and must not be copied into a public delivery directory. A future art pass must supply
creator/provider/license/checksum records and preserve the general-audience alt text and fallback
contract before activation.
