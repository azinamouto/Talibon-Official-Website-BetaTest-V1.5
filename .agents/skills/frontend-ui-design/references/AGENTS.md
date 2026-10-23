# AGENTS.md — CATZ Frontend Design Operating Rules

This repository is a living UI/UX knowledge base. Any AI agent working here should treat the material as **decision guidance**, not as a fixed theme.

## Non-negotiable rules

1. **Do not copy references mechanically.** Extract the principle and adapt it to the product.
2. **Do not default to generic AI UI.** Avoid gratuitous gradients, glassmorphism, excessive cards, oversized roundness, and equally loud sections.
3. **Design hierarchy first.** Decide what is primary, secondary, supportive, and quiet before adding decoration.
4. **Spacing must be systematic.** Use a consistent scale and proximity to communicate grouping.
5. **Typography must be intentional.** Display fonts are for expressive moments; functional UI must remain highly readable.
6. **Color must have a job.** Use accent color for hierarchy and action; preserve semantic colors for success/warning/error where possible.
7. **Interactive components require states.** Default, hover, press/active, focus, disabled; add selected/loading/error/success/read-only when needed.
8. **Forms favor clarity.** Persistent top labels are the default. Placeholders are hints, not labels.
9. **Destructive actions use explicit wording.** Prefer outcome-based labels such as “Keep account” and “Delete account.”
10. **Accessibility is part of quality.** Preserve focus visibility, contrast, touch targets, readable body text, and non-color-only state communication.
11. **Responsive design is adaptation, not shrinking.** Recompose, reflow, and adjust density intentionally.
12. **Every project should feel like its own brand.** Reuse principles, not visual sameness.

## Design decision order

When solving a UI task, decide in this order:

1. User goal and context
2. Information architecture
3. Priority and hierarchy
4. Layout and spacing
5. Typography
6. Color and semantic states
7. Component anatomy
8. Interaction feedback
9. Radius/elevation/surface treatment
10. Responsive/accessibility checks
11. Decorative polish

## Quality bar

A CATZ frontend should feel:
- clear before clever
- coherent before trendy
- intentional before decorative
- accessible before compact
- product-specific rather than template-like

## Reference-use rule

If a reference contains a specific value such as 16 px spacing, 24 px radius, or a given hex palette, treat it as a **starting reference** unless the project explicitly adopts that value as a token.
