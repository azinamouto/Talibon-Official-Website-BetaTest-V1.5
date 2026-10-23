# 00 — Frontend Foundations

## Design doctrine

Good UI is not a pile of fashionable effects. It is a sequence of decisions that makes the interface easy to understand, pleasant to use, visually coherent, and appropriate for its domain.

### The central rule

> References are knowledge, not templates.

Every reference should be analyzed for why it works: hierarchy, spacing, typography, color relationships, composition, imagery, interaction feedback, or information architecture. Reuse the principle only when it fits the product.

## What to optimize for

- Clear visual hierarchy
- Fast scanning and low cognitive load
- Consistent spacing and alignment
- Readable typography
- Strong action hierarchy
- Domain-appropriate color and imagery
- Predictable interaction states
- Accessible controls and labels
- Responsive behavior that preserves intent
- A distinct product identity rather than generic AI aesthetics

## Avoid generic AI UI

Do not automatically add:
- gradients everywhere
- glassmorphism everywhere
- large rounded cards for every section
- excessive shadows
- five equally emphasized KPI cards
- glowing buttons without reason
- random neon accents
- card-inside-card-inside-card layouts
- giant hero text that harms usability
- overly decorative dashboards

Effects are allowed when they reinforce brand, hierarchy, or product meaning.

## Visual hierarchy

The user should understand the page before reading everything.

Hierarchy can be created with:
- size
- weight
- contrast
- color
- position
- whitespace
- grouping
- imagery
- motion/state change

Not every element deserves equal emphasis. Primary actions and critical information should be strongest; support content should become progressively quieter.

## Proximity and grouping

Elements that belong together should sit closer together. Separate concepts need more space.

Internal component spacing should usually be smaller than spacing between components and sections. This creates understandable boundaries without excessive borders.

## Progressive disclosure

Operational systems should not expose every field and action simultaneously. Show:
1. status
2. priority
3. progress
4. next action
5. deeper detail on demand

Useful for HRIS, POS, inventory, logistics, government, admin, and complex SaaS.

## Product-specific design

### Government / enterprise
Prefer restraint, readable forms, clear status language, low visual noise, audit-friendly information architecture.

### POS / operations
Prioritize speed, availability, status, error prevention, large targets, and common actions.

### SaaS
Lead with value proposition and product proof. Reduce copy where a screenshot or demo can explain the product.

### Luxury / premium
Use restraint, whitespace, strong typography, warm neutrals or deep anchors, controlled accent color, and subtle elevation.

### AI / education / nonprofit
Human imagery can reduce coldness and increase trust. Keep the UI structured so the emotional visual is not competing with chrome.

### E-commerce
Prioritize product imagery, price, availability, ratings/discounts when meaningful, and a clear purchase action.

## Decision framework

Before designing, answer:
- Who is the user?
- What is their primary task?
- What needs to be seen immediately?
- What can wait?
- What is the risk of a mistake?
- How dense should the interface be?
- Which platform is this for?
- What personality should the brand communicate?

Then define a small system for type, color, spacing, radius, elevation, controls, and states.
