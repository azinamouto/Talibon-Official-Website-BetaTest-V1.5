# 06 — Radius, Shadows, and Surfaces

## Border-radius relationships

When a rounded child sits inside a rounded parent with uniform padding, the curves should usually feel concentric.

Useful reference relationship:

`inner radius ≈ outer radius − padding`

Example from training:
- outer radius: 24 px
- padding: 8 px
- inner radius: 16 px

Using the same 24 px radius for both inner and outer shapes can make the corner geometry feel visually misaligned.

### Apply this to
- cards with inner panels
- images clipped inside cards
- nested content regions
- modal sections
- grouped inputs
- bordered containers

### Use optical judgment when
- padding differs per side
- shapes are asymmetric
- radii are extremely large
- the component is pill-shaped
- the child does not visually hug the parent edge

## Radius systems
Prefer a small radius scale rather than random per-component values, for example:
- small
- medium
- large
- full/pill

Exact values should follow the product’s visual character.

## Layered shadow reference
The shadow training reference demonstrated several very soft layers using black at about 5% opacity and progressively increasing Y offset and blur:

- x 0, y 0, blur 0, spread ~1
- x 0, y 1, blur 1, spread 0
- x 0, y 2, blur 2, spread 0
- x 0, y 4, blur 4, spread 0
- x 0, y 8, blur 8, spread 0
- x 0, y 16, blur 16, spread 0

The principle matters more than the exact stack: several subtle layers often feel more natural than one dark shadow.

## Shadow principles
1. Premium elevation should usually be felt more than seen.
2. Keep X offset near zero for neutral elevation.
3. Increase Y offset and blur as elevation increases.
4. Very low opacity often feels cleaner on light surfaces.
5. Use spread sparingly.
6. Do not combine heavy border + heavy shadow + strong surface contrast unless the product truly needs it.
7. Dense dashboards often benefit from near-flat cards.
8. Marketing and premium surfaces can tolerate richer elevation.
9. Dark mode needs different depth cues, often subtle borders, overlays, or lighter ambient separation.

## Surface hierarchy
Use surfaces intentionally:
- base canvas
- raised card
- floating panel
- modal/overlay

Each elevation step should earn its visual treatment.

## Rule
> Radius and shadow are structural cues, not decoration to apply everywhere.
