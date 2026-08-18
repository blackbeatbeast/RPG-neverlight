# 07 — Character, R-15, and content safety specification

## Purpose

The game may have adult charm, flirtation, stylish costumes, and mildly suggestive character art. It must remain non-explicit, distribution-friendly, and unmistakably adult. This document is a production boundary, not a legal age-rating determination.

## Hard rules

- Every named or depicted humanoid character has a documented age of 20 or older.
- No “actually 500 years old” workaround for childlike design.
- No sexualized minors, students coded as minors, age-regression, incest, coercion, trafficking, or non-consensual sexual framing.
- No explicit nudity, visible genitals, sexual acts, fetish acts, or pornographic camera focus.
- No gameplay reward depends on enabling suggestive presentation.
- General-audience art and text are complete first and remain the default.
- Optional variants must preserve pose readability, identity, role, and all mechanical information.
- Public landing pages, social preview cards, store listings, advertising placements, and moderation surfaces use general-audience assets.

## Allowed tonal range

Examples that can fit after review:

- adult characters in fashionable or fantasy outfits with modest cleavage/legs;
- flirtatious banter without explicit sexual description;
- implied adult romance, dates, jealousy, or innuendo;
- pin-up-like but non-explicit optional card art;
- damaged clothing that is dramatic rather than exposing explicit anatomy;
- sensual confidence as one trait among a full character identity.

## Not allowed

- nudity hidden only by tiny objects or transparent fabric;
- explicit focus on breasts, buttocks, crotch, underwear, arousal, or sexual fluids;
- sexual violence or humiliation;
- suggestive presentation of petite/young-looking characters without unmistakable adult design;
- “reward stripping,” clothing destruction loops, or affection purchases;
- monetization that sells access to more explicit versions;
- user-uploaded erotic images.

## Character design template

Each character file must include:

- canonical age (20+);
- occupation and social role;
- goals, fears, contradiction, and non-romantic relationship hooks;
- silhouette, color notes, accessibility description;
- gameplay function;
- general-audience visual brief;
- optional suggestive brief, if any;
- prohibited motifs and age-coding risks;
- asset provenance and reviewer sign-off.

## Consent and romance writing

Adult romantic or flirtatious scenes must show agency and mutuality. Dialogue choices cannot punish a player for declining flirtation. Character progression must not equate gifts/currency with sexual access.

## Presentation preference

Recommended setting values:

- `general` — default, suitable for public preview;
- `suggestive` — optional adult non-explicit variants;
- no higher tier in this project.

The server may store the preference, but response payloads should include only the selected asset reference. Shared links must resolve to general assets unless the viewer has already opted in.

## Content review gate

Before merging suggestive content, reviewers check:

1. age documentation and visual adult coding;
2. non-explicit boundary;
3. consent and context;
4. general fallback parity;
5. platform/ad implications;
6. alt text and accessibility;
7. asset license/provenance;
8. no mechanical advantage;
9. no copied/traced reference expression.

## Advertising separation

If ads are ever enabled, ad inventory and suggestive art must be separated by policy-aware placement. The system must be capable of serving only general assets on ad-supported pages or disabling ads around restricted content. Actual eligibility depends on the chosen network’s current policy and must be rechecked immediately before launch.
