# CATZ Frontend

A living frontend/UI knowledge base distilled from the **AI MODEL TRAINING** project.

This repository is not a single visual style, template, or component library. It is a set of reusable design principles, reference measurements, composition patterns, color systems, typography guidance, component-state rules, and UX heuristics for building polished interfaces across different products.

## Core doctrine

> **References are knowledge, not templates.** Understand why a design works, then adapt it to the project, audience, platform, density, and brand.

The goal is to avoid generic or repetitive “AI-generated UI” and instead produce interfaces with intentional hierarchy, spacing, typography, color, interaction states, accessibility, and domain fit.

## Knowledge map

- [`AGENTS.md`](AGENTS.md) — operating instructions for AI agents using this repository
- [`docs/00-foundations.md`](docs/00-foundations.md) — core design doctrine and decision framework
- [`docs/01-typography.md`](docs/01-typography.md) — typography hierarchy, expressive fonts, readable UI type
- [`docs/02-color-systems.md`](docs/02-color-systems.md) — color combinations, luxury palettes, semantic color, tokenization
- [`docs/03-spacing-and-layout.md`](docs/03-spacing-and-layout.md) — spacing scale, proximity, mobile rhythm, responsive layout
- [`docs/04-buttons-and-states.md`](docs/04-buttons-and-states.md) — button anatomy, sizing, interaction states
- [`docs/05-forms-and-dialogs.md`](docs/05-forms-and-dialogs.md) — labels, inputs, destructive modals, form clarity
- [`docs/06-radius-shadows-and-surfaces.md`](docs/06-radius-shadows-and-surfaces.md) — border-radius geometry, elevation, layered shadows
- [`docs/07-dashboards-and-operational-ui.md`](docs/07-dashboards-and-operational-ui.md) — finance, construction, HRIS/POS/admin, mobile operational patterns
- [`docs/08-landing-pages-and-heroes.md`](docs/08-landing-pages-and-heroes.md) — hero composition, minimal SaaS, product-led storytelling, human-centered visuals
- [`docs/09-mobile-commerce-and-cards.md`](docs/09-mobile-commerce-and-cards.md) — mobile commerce dimensions, card systems, responsive product layout
- [`docs/10-accessibility-and-quality.md`](docs/10-accessibility-and-quality.md) — accessibility, anti-patterns, quality checklist
- [`docs/11-reference-tokens.md`](docs/11-reference-tokens.md) — exact reference values, palettes, dimensions, and reusable starting points

## How to use this repository

Before designing or implementing a frontend:

1. Identify the product type, audience, and user goals.
2. Select the relevant design patterns from this repository.
3. Build a small visual system: typography, color, spacing, radius, elevation, states.
4. Prioritize information hierarchy before decoration.
5. Use references selectively; do not mix every trend or visual treatment together.
6. Validate readability, keyboard focus, touch target size, semantic status colors, and responsive behavior.
7. Keep the interface coherent: one design language, not a collage of unrelated inspiration.

## Product-fit examples

- **Government / LGU / HRIS / enterprise:** restrained visual system, persistent labels, semantic statuses, compact KPI hierarchy, low visual noise.
- **POS / inventory / operations:** speed, status, availability, next action, large interaction targets, quick scanning.
- **SaaS landing page:** concise positioning, strong product proof, clear CTA hierarchy, controlled section rhythm.
- **Luxury / premium brand:** restraint, warm neutrals, deep anchors, controlled accents, typography and spacing doing most of the work.
- **AI / education / nonprofit:** human-centered imagery can add warmth and trust while UI stays structured and calm.
- **E-commerce:** strong imagery, stable grids, clear price/action hierarchy, predictable cards, touch-friendly controls.

## Central rule

A beautiful interface is not created by adding more effects. It is created by making better decisions about **what deserves attention, what belongs together, what should remain quiet, and what the user needs next**.
