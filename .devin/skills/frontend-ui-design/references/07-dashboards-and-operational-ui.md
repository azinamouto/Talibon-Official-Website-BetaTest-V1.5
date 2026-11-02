# 07 — Dashboards and Operational UI

## Core principle
Dashboards should separate **what is happening** from **what the user can do next**.

Use the main canvas for overview, KPIs, trends, status, and analysis. Keep immediate actions grouped in a predictable area such as a side rail, action bar, or top utility region.

## Finance dashboard reference
The learned finance concept used:
- compact left icon rail for navigation
- top navigation for major modules
- main canvas for wallet/balance KPIs and cash-flow analysis
- right utility rail for quick send, card preview, deposit/transfer, quick actions, and upgrade
- restrained lime accent for actions/highlights
- quiet cards with subtle borders and low elevation
- one dominant chart with a single highlighted data point

### Lessons
- prioritize user-relevant information rather than equal widget sizes
- compact KPIs should emphasize the number first and context second
- quick actions should be grouped and easy to find
- promotional modules should not compete with core financial information
- use one strong chart when one trend is the real decision signal

## Driver/mobile dashboard reference
The stronger redesign taught:
- contextual profile/status header
- top placement for high-frequency tasks
- visually distinct primary actions for ride/delivery work
- grouped performance summary
- incentives separated from history
- persistent, simple bottom navigation
- restrained use of color so importance remains legible

The improvement came from hierarchy and grouping, not merely adding gradients.

## Construction/operations app reference
Useful patterns:
- dashboard surfaces project progress, budget, workers, issues, and today’s tasks
- project list combines thumbnail, progress %, status chip, metadata, and progress bar
- project details use tabs and timeline/milestone views
- tasks use segmented filters and semantic status rows
- material inventory shows overview first, then item quantity/status
- reports translate operations into compact KPI cards and simple charts
- bottom navigation stays limited to core modules

### Semantic operational states
Useful examples:
- green = completed / available
- amber = in progress / low stock
- red = delayed / critical
- gray = pending

## Information architecture for complex systems
For HRIS, POS, inventory, government, logistics, and admin tools, surface:
1. current status
2. priority
3. progress
4. exceptions/issues
5. next action
6. deeper details only when needed

## Visual density
Operational interfaces can be dense, but should remain calm:
- strong alignment
- compact card heights
- limited accent color
- clear group spacing
- subtle borders
- minimal decorative effects

## Rule
> Operational UI should reduce cognitive load by making status, priority, progress, and next action obvious before detail.
