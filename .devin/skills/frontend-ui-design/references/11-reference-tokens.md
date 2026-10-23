# 11 — Reference Tokens and Measurements

This file centralizes exact reference values learned during AI MODEL TRAINING. These are **starting points**, not universal defaults.

## Spacing scale
`4, 8, 16, 24, 32, 48, 64, 80, 120`

Suggested relationships:
- micro: 4–8
- component: 16
- roomy component/card: 24–32
- section: 48–64
- major section reset: 80–120

## Mobile form references
- back/navigation target: 44×44 px
- input/control height: ~56 px
- title/supporting text gap: ~8 px
- field/secondary text gap: ~16 px
- large top/content region spacing in the demonstrated composition: ~80–96 px

## Button size references

### Small
- height: 32–36 px
- text: 12 px semibold
- horizontal padding: 16 px
- icon gap: 4 px
- icon: ~20 px

### Medium
- height: 40–48 px
- text: 14 px semibold
- horizontal padding: 16 px
- icon gap: 8 px
- icon: ~24 px

### Large
- height: 52–56 px
- text: 16 px semibold
- horizontal padding: 24 px
- icon gap: 8 px
- icon: ~24 px

Touch target reference: ~44–48 px minimum where appropriate.

## Typography reference scale
- headline: ~24 px
- subheadline: ~16 px
- body: ~14 px
- button: ~16 px

Commerce-specific reference:
- heading: 20–24 px
- product name: 14 px
- price: 16 px
- body: 14 px
- caption: 12 px

## Mobile commerce references
- frame: 402×874 px
- side margins: 16 px
- banner: 370×150 px
- banner radius: 12–16 px
- product card width: 179 px
- grid gap: 12 px
- product image: 179×160 px
- card height: 240–280 px
- section spacing: 24 px
- card padding: 12 px
- button height: 48 px
- radius: 12–16 px

## Border radius relationship
Reference formula:

`inner radius ≈ outer radius − padding`

Example:
- outer radius: 24 px
- padding: 8 px
- inner radius: 16 px

## Layered shadow reference
Approximate low-opacity stack using black around 5%:
- 0 / 0 / 0 / spread ~1
- 0 / 1 / 1 / 0
- 0 / 2 / 2 / 0
- 0 / 4 / 4 / 0
- 0 / 8 / 8 / 0
- 0 / 16 / 16 / 0

Format: `x / y / blur / spread`.

## Expressive typeface references
- Richter — futuristic / geometric / tech
- Orcish — playful / organic / retro
- Mageline — elegant / editorial / luxury
- Wisteriano — decorative / artistic / premium
- Bevorden — bold / condensed / sporty / street-tech

## Color pair references
- Night `#222222` + Kiwi `#89E900`
- Ghost `#F7F7FF` + Persian `#27187E`
- Night `#000F08` + Imperial `#FB3640`
- Cyprus `#004643` + Sand `#F0EDE5`
- Plum `#381932` + Milk `#FFF3E6`

## Luxury palette references

### Modern premium
- White `#F9F9F9`
- Blue `#004E72`
- Orange `#FF6E42`
- Navy `#092634`

### Warm earthy
- Ivory `#F5E6C5`
- Apricot `#D78B30`
- Natural `#9F886F`
- Organic `#3F422E`

### Botanical
- Alabaster `#F4F1EB`
- Moss Green `#7AA05A`
- Slate Green `#2D5A4A`
- Dark Emerald `#0D4C3C`

### Sustainable editorial
- Sustainable Linen `#FAF3E1`
- Recycled Cotton `#F5E7C6`
- Electric Tangerine `#FF6D1F`
- Black Hole `#222222`

### Heritage / rustic
- Candle `#EFE9D7`
- Coral `#7D2826`
- Leaf `#898861`
- Juniper `#343723`

## Interaction states
Design at least:
- default
- hover
- press/active
- focus
- disabled

Add when needed:
- selected
- checked
- expanded
- loading
- success
- error
- read-only

## Reminder
These values are a shared reference library. Project-level design tokens should be selected and adapted intentionally rather than importing all values unchanged.
