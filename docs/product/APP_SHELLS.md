# Approved TrialAgents app shells — 7 November 2026

Four visual shell options and a shared component vocabulary are now part of the server-returned `read_app_design` kit (`src/shared/app-shells.ts`). These are **optional recipes for custom apps**, not new template IDs, an app runtime, or a replacement for the existing 23+ catalog templates. They do not retrofit or migrate any saved app.

## Selection order

1. When the user specifies an existing template, read its exact catalog ID/version/digest, preserve its styling and configure it.
2. For revisions, preserve the saved app's shell and behavior by default.
3. For a new custom app, choose the dominant repeated business action: **analytics** for metrics and trends, **portfolio** for project/milestone oversight, **records** for tracker/CRM data entry, or **decision** for evidence-based comparison and human approvals.
4. Combine components from the other shells only when a real workflow requires them. A request for a simple report does not justify empty tabs.

## Required behavior

**Navigation:** Tabs or rail sit in one coherent aligned area; Settings is a full structured page, not a dropdown in the top corner. Refresh is an action, not a competing top-level nav destination.

**Charts:** Restrained colors, legible labels, hover and keyboard detail, working per-series legend, and a genuine data view. Use only controls supported by the QuickJS/host event contract. An SVG screenshot is not an interactive chart.

**Records:** Search/filter/sort the entire authorized set before pagination. Keep Search / Filters / Add on one desktop row and use a disclosure on narrow layouts. Provide details, authorized create/edit/duplicate/archive where relevant and preserve draft values and original versions for review.

**Settings:** Useful business preferences, native supported layout configuration, reviewed Save/Ignore when applicable. Never simulate persistence with localStorage, invented APIs or display-only Save buttons. Do not add user account, credential, connector or automation management inside app Settings.

**Decision:** Never rank absent/inaccessible evidence as zero or silently approve a supplier; decisions need complete authorized coverage and trusted human review.

**Access:** Existing app/database/column permissions, audit and version controls remain the sole authority. Sample demo figures never become workspace data.

## Design and spacing

The approved CSS reference uses card gaps of 20–24px desktop, 14–18px mobile; 18–24px card padding; 8–12px action/control gaps; 16–20px chart legend/plot separation; and sufficient vertical spacing between headings, helper text and controls. The low-priority `ta-*` CSS classes are opt-in and never restyle canonical templates. One page vertical scroll, horizontal overflow isolated to tables/matrices, a 390px extension-width acceptance view, and reserved space for hosted attribution remain required.

## Source of visual approval

`docs/design-reference/TrialAgents_Shells_Interactive_Review.html` is the complete **browser-only approved gallery**, with four shell demos plus shared component examples. Its fictional data and in-memory interactions are *not* a deployable frontend-js app. The production implementation is the versioned shell selection/component design kit plus the existing platform data/runtime review paths.

## Release verification

Check `read_app_design` returns four distinct shells and the shared components; its optional CSS must contain `.ta-card-grid`, `.ta-settings` and usable responsive breakpoints. Run the app quality/template tests and full build. Smoke-test selection of a matching catalog template (no styling change) and a custom analytics app (working navigation, chart legends, data details, and settings) in the real ChatGPT extension before claiming end-to-end host acceptance.

No automatic migration, seeded demo records, new permission grants, new automations, or design changes to existing saved apps.
