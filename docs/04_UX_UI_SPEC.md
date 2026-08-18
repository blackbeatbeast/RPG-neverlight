# 04 — UX/UI specification

## 1. Design thesis

Build one semantic interface with two visual modes:

- **Retro mode:** compact centered column, framed still image, small status strip, numbered command links, textured-but-readable borders.
- **Modern mode:** the same information architecture with more spacing, sticky action area, richer comparison/filter tools, and responsive cards.

Modes change presentation, never available information or game rules.

## 2. Canonical screen anatomy

1. Skip link and page title
2. Compact account/world status
3. Scene illustration with alt text
4. Location/encounter heading
5. Two-to-four sentence event text
6. Status deltas and telegraphs
7. Numbered command list (1–9, 0/back)
8. Secondary links: inventory, codex, log, settings
9. Footer: version, connection, report link

For combat, show the queued 1–3 commands before confirmation and render the result as ordered semantic events.

## 3. Navigation rules

- Browser back must not repeat economy mutations.
- GET renders state; POST mutates with CSRF and idempotency controls.
- After POST, use redirect/get or equivalent safe navigation.
- Persistent “Town/Home” escape unless a deliberate locked encounter explains otherwise.
- No hover-only information.
- Keyboard shortcuts never steal input focus from text fields.
- Touch targets at least 44 CSS px in modern mode; retro visual density may use larger invisible hit areas.

## 4. Retro authenticity without antique pain

Use:

- 360–430 px reading column on wider displays;
- framed 4:3 or 3:2 still illustrations;
- small bitmap-inspired headings paired with a highly readable body font;
- numbered links and tiny stamps/badges;
- compact horizontal rules, status meters, and monochrome icons;
- page transitions that feel like navigation, not an app carousel.

Do not use:

- tiny body text;
- blinking text, marquee, inaccessible image maps;
- fixed pixel layouts that overflow phones;
- low-contrast nostalgia filters;
- copied site chrome, logos, palettes, or page composition.

## 5. Responsive behavior

### 360–479 px

- single column;
- scene image full column width;
- commands stacked;
- sticky bottom command confirmation only when it does not cover content;
- inventory comparison as sequential panels.

### 480–899 px

- single reading column with optional side drawer;
- status and command queue can share a row.

### 900+ px

- centered game column plus optional right utility rail for log, compare, and codex;
- the primary experience must remain visually compact, not stretch edge-to-edge.

## 6. Inventory UX

Required before alpha:

- compare equipped vs selected;
- filter by slot, rarity, level, tags, trade/bind state;
- sort by recent, power estimate, rarity, name;
- favorite/lock items;
- bulk-select salvage with rare/unique confirmation;
- provenance detail;
- clear explanation of derived-stat changes;
- full keyboard operation.

“Power score” is advisory and cannot hide build-specific tradeoffs.

## 7. Accessibility

- WCAG 2.2 AA target for public alpha.
- Semantic headings, lists, buttons, links, forms, tables.
- Visible focus, logical focus order, no focus trap.
- Text alternatives for meaningful art; decorative art empty alt.
- Combat changes announced through a polite live region, with a full static log.
- Color is never the only status cue.
- Reduced motion respected; core experience works with all motion disabled.
- 200% zoom and reflow at 320 CSS px without horizontal page scrolling.
- Character allure must not depend on inaccessible image-only information.

## 8. R-15 presentation controls

- General-audience presentation is default.
- Optional suggestive variants require an explicit setting and an adult-account acknowledgement appropriate to deployment policy.
- The setting affects art/costume/flavor only, never stats, rewards, quests, or social status.
- Every optional image has a general fallback and provenance record.
- Public previews, social sharing images, login pages, and ad-adjacent placements use general-audience assets.

## 9. No-animation rule

No essential information may rely on animation. Tiny CSS feedback such as pressed state, focus transition, or loading indicator is allowed when it is brief, optional, and reduced-motion safe. Avoid autoplay, parallax, animated character rigs, or combat cinematics.

## 10. Required prototype pages

- Landing/login/guest start
- Town
- Route selection
- Exploration scene
- Encounter + command queue
- Combat result/log
- Loot decision
- Inventory/equipment compare
- Codex
- Settings including retro/modern and presentation preference
- Maintenance/read-only/capacity state
