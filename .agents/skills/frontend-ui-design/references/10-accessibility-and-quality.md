# 10 — Accessibility and Quality

## Accessibility is part of visual quality
A polished interface is not successful if it becomes difficult to read, navigate, or understand.

## Core checks

### Contrast
- Maintain readable text/background contrast.
- Do not use low-contrast body copy merely to look minimal.
- Disabled states may be quieter but should remain understandable.

### Focus
- Keyboard focus must be clearly visible.
- Focus must be distinguishable from hover.
- Do not remove focus indication for aesthetics.

### Touch targets
- Use comfortably large hit areas.
- Around 44–48 px is a strong minimum reference for important touch targets.

### Labels
- Prefer persistent labels above inputs.
- Do not rely on placeholder text as the only field identifier.

### State communication
- Do not rely on color alone.
- Combine color with text, icons, border, outline, shape, or other cues.

### Typography
- Keep body text comfortably readable.
- Avoid tiny supporting copy.
- Use sufficient line-height.
- Keep long paragraphs at manageable line lengths.

### Motion
- Motion should explain or confirm interaction, not distract.
- Avoid unnecessary animation in critical forms or operational workflows.

## Quality checklist
Before calling a UI finished, verify:

### Hierarchy
- Is the primary task obvious?
- Are secondary elements visibly quieter?
- Are multiple areas competing for attention?

### Spacing
- Are related elements grouped?
- Is section spacing larger than component-internal spacing?
- Are alignment edges consistent?

### Typography
- Are text roles consistent?
- Is body copy readable?
- Are buttons proportionate to nearby text?

### Color
- Does every strong color have a purpose?
- Are status colors semantically consistent?
- Are brand and destructive/error colors distinguishable?

### Components
- Are radius, border, and shadow systems coherent?
- Are buttons using intentional size variants?
- Do interactive elements have states?

### Forms
- Are labels persistent?
- Are errors specific and near the related field?
- Are destructive actions explicitly worded?

### Responsive behavior
- Does the layout recompose rather than simply shrink?
- Are touch targets preserved?
- Does information priority remain intact?

### Product fit
- Does the visual language match the domain and audience?
- Would this UI still make sense if current design trends changed?

## Anti-slop checklist
Remove or reconsider:
- decorative gradients with no purpose
- too many cards
- excessive glass effects
- oversized border radii everywhere
- heavy shadows
- random neon colors
- repeated identical SaaS sections regardless of product
- generic illustrations when domain imagery would communicate better
- too many equal-priority dashboard widgets

## Rule
> Accessibility, clarity, and consistency are not constraints on good design; they are part of good design.
