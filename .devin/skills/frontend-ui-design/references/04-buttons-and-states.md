# 04 — Buttons and Interaction States

## Button anatomy
A primary button should feel like a clear action area, not text squeezed inside a colored box.

The training references showed that very tight horizontal padding can feel cramped, while more generous padding creates a stronger action silhouette. About 32 px side padding was a good reference for a prominent CTA, but it is not a universal constant.

## Button size system

### Small
- height: ~32–36 px
- text: ~12 px semibold
- horizontal padding: ~16 px
- icon-text gap: ~4 px
- icon: ~20 px

Use for compact utility actions.

### Medium
- height: ~40–48 px
- text: ~14 px semibold
- horizontal padding: ~16 px
- icon-text gap: ~8 px
- icon: ~24 px

Use for standard product actions.

### Large
- height: ~52–56 px
- text: ~16 px semibold
- horizontal padding: ~24 px
- icon-text gap: ~8 px
- icon: ~24 px

Use for high-emphasis CTAs.

The key principle is that height, text size, icon size, padding, and spacing scale together.

## Touch targets
On touch interfaces, the visual button may be smaller than the effective hit area, but the target should still be comfortably large. Around 44–48 px is a strong minimum reference for touch interaction.

## Required component states

### Default
Normal interactive appearance.

### Hover
Pointer-over feedback. It should signal interactivity without moving or resizing the component.

### Press / Active
Immediate feedback while clicking/tapping. Can use a darker fill, subtle scale/compression, shadow reduction, or similar engaged state.

### Focus
Keyboard-navigation indicator. It must remain visible and clearly distinct from hover. Do not remove focus outlines for aesthetic reasons without replacing them with an equally strong focus treatment.

### Disabled
Clearly unavailable. Reduce emphasis and interaction response, but keep labels readable enough to understand the control.

## Extended states
Use as needed:
- selected
- checked
- expanded
- loading
- success
- error
- read-only

## State communication
Do not rely only on color. Combine color with one or more of:
- fill
- border
- outline
- shadow
- opacity
- icon change
- label/status text
- restrained motion

## Consistency
Apply the state model to buttons, links, tabs, inputs, cards, toggles, icon buttons, menu items, and other interactive elements.

## Rule
> If a component can be interacted with, its states should be intentionally designed.
