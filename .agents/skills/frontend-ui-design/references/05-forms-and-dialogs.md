# 05 — Forms and Dialogs

## Form labels

Use persistent labels above fields as the default pattern.

Why this is stronger than relying on floating labels or placeholders:
- the field name stays visible before, during, and after input
- users do not have to remember the field purpose
- long labels are easier to handle
- labels remain readable instead of shrinking
- forms scan faster because labels stay in a consistent position
- validation and error messages are easier to associate with the field
- less animation reduces distraction

### Placeholder rule
Placeholders are for examples or formatting hints such as `name@example.com`. They are not substitutes for labels.

### Floating labels
Floating labels can be used when vertical space is genuinely constrained, but they are a special-case pattern rather than the default. If used, keep them legible, unclipped, high-contrast, and understandable without relying on animation.

For government, finance, enterprise, healthcare, HRIS, or complex forms, persistent top labels should usually win.

## Input anatomy

A good input should have:
- visible label
- comfortable height
- clear active/focus state
- enough horizontal padding
- helper text when needed
- specific error message near the field
- optional leading/trailing icon only when useful

About 56 px control height is a strong mobile reference from the training set, but adapt by platform and density.

## Destructive dialogs

Avoid vague button labels such as:
- Yes
- No
- OK
- Confirm

Prefer outcome-based labels such as:
- `Keep account`
- `Delete account`
- `Cancel deletion`
- `Remove member`

### Good destructive modal structure
1. Clear title: `Delete account`
2. Short body copy explaining the consequence
3. Explicit irreversibility copy when relevant: `This action cannot be undone.`
4. Neutral safe action
5. Visually distinct destructive action

In left-to-right interfaces, the safe action can appear first and destructive action second unless platform conventions dictate otherwise.

## Safeguards
Additional friction may be justified for high-risk irreversible actions:
- type the resource name
- re-enter password
- second confirmation

Do not add friction automatically. Match the safeguard to the risk.

## General principle
> Form design should prioritize recognition, completion accuracy, and error prevention over clever interactions.
