# 02 — Color Systems

Color should support hierarchy, meaning, and brand personality. Use a dominant base, supporting neutral or deep anchor, controlled accent, and semantic colors. Avoid making every component equally saturated.

## Reference pairs

- Night `#222222` + Kiwi `#89E900`: futuristic, energetic, sporty, gaming, tech. Use lime selectively for CTAs, active states, progress, and highlights.
- Ghost `#F7F7FF` + Persian `#27187E`: clean, trustworthy, premium, SaaS, finance, education, productivity.
- Night `#000F08` + Imperial `#FB3640`: dramatic, bold, cinematic, fashion, entertainment, sport. Keep destructive/error colors distinguishable.
- Cyprus `#004643` + Sand `#F0EDE5`: calm, sophisticated, natural, wellness, sustainability, hospitality, premium enterprise.
- Plum `#381932` + Milk `#FFF3E6`: warm, elegant, editorial, beauty, fashion, food, premium branding.

## Luxury palette references

### Modern premium
White `#F9F9F9`, Blue `#004E72`, Orange `#FF6E42`, Navy `#092634`.

### Warm earthy luxury
Ivory `#F5E6C5`, Apricot `#D78B30`, Natural `#9F886F`, Organic `#3F422E`.

### Botanical understated luxury
Alabaster `#F4F1EB`, Moss Green `#7AA05A`, Slate Green `#2D5A4A`, Dark Emerald `#0D4C3C`.

### Sustainable editorial luxury
Sustainable Linen `#FAF3E1`, Recycled Cotton `#F5E7C6`, Electric Tangerine `#FF6D1F`, Black Hole `#222222`.

### Heritage / rustic luxury
Candle `#EFE9D7`, Coral `#7D2826`, Leaf `#898861`, Juniper `#343723`.

## Luxury principles
Luxury often comes from restraint, warm off-whites, deep anchors, muted natural tones, controlled saturated accents, strong typography, and generous spacing—not from using black and gold by default.

## Semantic color
Useful defaults:
- green = success / available / completed
- amber or orange = warning / in progress / low stock
- red = error / destructive / critical / delayed
- gray = pending / inactive / secondary

If brand colors overlap semantic meanings, create separate semantic tokens.

## Build systems, not isolated hex codes
Define roles for surface, text, brand, borders, success, warning, danger, and information. Derive hover, pressed, disabled, chart, badge, and dark-mode variants from those roles.

## Rule
> Choose palettes for the product’s mood, audience, and task—not because a combination is trendy.
