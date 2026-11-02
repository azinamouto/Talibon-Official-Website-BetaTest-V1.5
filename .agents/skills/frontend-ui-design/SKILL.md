---
name: frontend-ui-design
description: >-
  Use this skill whenever designing, building, or refining frontend user interfaces, UI components, styling, typography, color palettes, layout, forms, dashboards, landing pages, mobile commerce, or responsive design. Enforces high-craft UI principles and provides reference tokens to prevent generic AI-generated aesthetics.
---

# Frontend UI & Design System Skill

A high-craft frontend/UI knowledge base and decision framework distilled from the **CATZ Frontend** system. Use this skill to create purposeful, accessible, and domain-appropriate user interfaces while strictly avoiding generic "AI-generated" aesthetics (such as gratuitous glowing cards, neon accents, floating glassmorphism, or repetitive templates).

---

## Non-Negotiable Core Doctrine

> **References are knowledge, not templates.** Understand why a design works, then adapt it to the project, audience, platform, density, and brand.

1. **Avoid generic AI UI**: Never default to purple/cyan neon gradients, random glassmorphism, cards inside cards inside cards, or glowing buttons unless explicitly justified by the brand.
2. **Design hierarchy first**: Determine primary, secondary, supportive, and quiet elements before adding visual decoration.
3. **Spacing must be systematic**: Use a fixed spacing scale (`4, 8, 16, 24, 32, 48, 64, 80, 120`) and proximity to convey logical relationships.
4. **Typography must be intentional**: Expressive display fonts for headlines/hero moments; clean, high-legibility sans-serif fonts for dense UI and data.
5. **Color must have a job**: Reserve accent colors for primary actions and focal points; preserve semantic colors (`success`, `warning`, `error`, `info`) strictly for state feedback.
6. **Every interactive component requires states**: Default, hover, active/press, focus-visible, disabled, and loading.
7. **Forms favor clarity**: Persistent top labels are default. Placeholders are hints, never substitutes for labels.
8. **Destructive actions use explicit outcomes**: Use labels like "Keep Account" vs "Delete Account" rather than ambiguous "OK / Cancel".
9. **Accessibility is quality**: WCAG AA contrast (4.5:1 text, 3:1 controls), 44x44px touch targets, visible focus rings, screen-reader semantics.
10. **Responsive adaptation over shrinking**: Recompose, reflow, and adjust density intentionally instead of simply shrinking containers.

---

## Decision Order for Any UI Task

When designing or implementing a UI feature, proceed in this exact sequence:
1. **User Goal & Context**: Audience type (e.g. government portal, enterprise admin, SaaS landing, mobile commerce).
2. **Information Architecture & Scannability**: What does the user look for first?
3. **Priority & Hierarchy**: Primary vs secondary actions and content zones.
4. **Layout & Spacing**: Grid, flex rhythm, padding, margins, whitespace breaks.
5. **Typography Scale**: Display, heading, subhead, body, caption.
6. **Color System & Semantic Tokens**: Neutral base, accent role, status indications.
7. **Component Anatomy**: Padding, borders, icons, text alignment.
8. **Interaction States**: Hover, focus, active, loading, disabled.
9. **Surface Treatment**: Subtle radius, elevation shadows, border contrast.
10. **Accessibility & Responsive Review**: Keyboard navigation, touch targets, small screens.
11. **Decorative Polish**: Micro-interactions, restrained accents, brand-specific nuance.

---

## Reference Guide & Module Map

Detailed guides are located in the [`references/`](./references/) folder:

| Module | Topic | Key Focus |
| :--- | :--- | :--- |
| [00 — Foundations](./references/00-foundations.md) | Core Doctrine | Hierarchy, proximity, anti-patterns, decision framework |
| [01 — Typography](./references/01-typography.md) | Type Systems | Expressive headlines vs readable body, sizing scales, pairing |
| [02 — Color Systems](./references/02-color-systems.md) | Color Tokens | Neutral anchors, luxury palettes, semantic states, contrast |
| [03 — Spacing & Layout](./references/03-spacing-and-layout.md) | Layout Scales | 4/8/16/24/32/48/64/80 scale, proximity rules, mobile rhythm |
| [04 — Buttons & States](./references/04-buttons-and-states.md) | Button Systems | Anatomy, sizing (S/M/L), touch targets, full state matrix |
| [05 — Forms & Dialogs](./references/05-forms-and-dialogs.md) | Input & Modals | Persistent labels, inline validation, destructive modal patterns |
| [06 — Radius & Shadows](./references/06-radius-shadows-and-surfaces.md) | Surfaces | Radius nesting geometry, layered elevation shadows, borders |
| [07 — Dashboards & Ops](./references/07-dashboards-and-operational-ui.md) | Complex UI | High density, KPI hierarchy, tables, filters, admin & POS |
| [08 — Landing Pages](./references/08-landing-pages-and-heroes.md) | Marketing & Hero | Product-led storytelling, hero composition, proof & trust |
| [09 — Mobile & Cards](./references/09-mobile-commerce-and-cards.md) | Mobile Layouts | Bottom sheets, swipe gestures, card anatomy, price hierarchy |
| [10 — Accessibility](./references/10-accessibility-and-quality.md) | Quality Bar | Contrast ratios, focus states, screen reader cues, checklist |
| [11 — Reference Tokens](./references/11-reference-tokens.md) | Exact Values | Dimension tokens, starting hex codes, standard measurements |
| [AGENTS Operating Guide](./references/AGENTS.md) | Operating Rules | Non-negotiable operating rules for AI coding agents |

---

## Quick Reference Tokens

- **Spacing Scale**: `4, 8, 16, 24, 32, 48, 64, 80, 120` px
- **Button Heights**:
  - Small: `32–36 px` (12px text, 16px h-padding)
  - Medium: `40–48 px` (14px text, 16px h-padding)
  - Large: `52–56 px` (16px text, 24px h-padding)
- **Minimum Touch Target**: `44×44 px`
- **Inputs**: Height `40–48 px` (desktop) or `~56 px` (mobile), border `1px solid`, focus ring `2–3px offset`.
- **Card Nesting Radius**: Child radius = Parent radius - Parent padding (`r_inner = r_outer - padding`).
- **Surface Elevation**: Avoid harsh dark shadows. Use multi-layered soft shadows with low opacity (e.g. `rgba(0, 0, 0, 0.04)` to `0.08`).

---

## Quality Checklist Before Shipping Any UI

- [ ] Does the page have a clear visual hierarchy?
- [ ] Are primary actions immediately distinguishable from secondary actions?
- [ ] Is spacing consistent and derived from the 4/8px scale?
- [ ] Are form labels visible above inputs rather than hidden in placeholders?
- [ ] Do all interactive elements have visible hover, active, and focus states?
- [ ] Does text contrast pass WCAG AA (4.5:1 minimum)?
- [ ] Are touch targets at least 44×44px on mobile viewports?
- [ ] Did you avoid generic "AI UI" tropes (excessive glow, glassmorphism, redundant nested cards)?
- [ ] Is layout responsive with intentional reflow rather than awkward shrinkage?
