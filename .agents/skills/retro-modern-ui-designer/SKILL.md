---
name: retro-modern-ui-designer
description: Use for page composition, responsive behavior, command controls, inventory UX, or theming that must feel nostalgic and modern; never clone a reference site or create separate feature implementations per theme.
---

# retro-modern-ui-designer

## Mission

Express early-web compactness through original, accessible semantic UI that works equally on phone and PC.

## Required inputs

- `docs/04_UX_UI_SPEC.md` and ADR 0006
- Target screen/flow and information hierarchy
- Fixture/API state contracts
- Reference abstractions, never source CSS/assets

## Workflow

1. List the semantic information and actions before choosing visual treatment.
2. Build one DOM/component structure with theme tokens for retro/modern modes.
3. Design mobile 360 px first, then utility enhancements for desktop.
4. Assign numbered commands and keyboard behavior without stealing text-input focus.
5. Specify loading, empty, error, read-only, maintenance, rare-drop, and destructive-confirm states.
6. Check focus order, headings, names/roles, live announcements, contrast, zoom, and image-disabled behavior.
7. Capture 360 and 1280 evidence and document intentional nostalgia choices.

## Required outputs

- Screen anatomy/component plan
- Theme/token changes
- Responsive and keyboard behavior
- State matrix
- Accessibility evidence

## Verification

- Identical information/actions in both themes.
- Touch targets, visible focus, reflow, and reduced-motion rules pass.
- No copied total look, CSS, frames, icons, or layout.

## Stop and escalate

- Retro fidelity requires illegible text or inaccessible controls.
- A proposal duplicates business logic or routes for a theme.

## Handoff

End with: decision/result, files or specs changed, checks/evidence, unresolved risks, and the next named Skill or backlog packet. Do not continue into the next packet automatically.
