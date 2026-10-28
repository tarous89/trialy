---
name: trialy-tracker-design
description: Build or revise Trialy trackers, forms and contained views using the fixed Vivid component template. Adapt content and authorized bindings without recreating HTML, colors, icons or layout. Use for tracker creation and targeted changes, not the whole application shell.
---

# Reuse the Vivid template

Read [TEMPLATE_REUSE.md](references/TEMPLATE_REUSE.md) and [CONFIGURATION.md](references/CONFIGURATION.md). The user-supplied HTML is the visual authority; its records and business workflow are examples only. The reusable source is `assets/vivid-template/`: exact stylesheet, fixed component trees, original SVG icons, manifest, and neutral visual catalog. Do not redesign from prose or copy sample business logic.

## Standard workflow

1. Establish the user's job from context. Inspect relevant authorized schemas and the saved configuration when revising. Reuse suitable tables and fields; preserve their identity, type and cardinality. Available data is not automatically relevant data.
2. Call `prepare_tracker` or `prepare_tracker_revision` with `templateId:"trialy.standard.v1"`. Supply content and bindings only. Trialy renders the fixed components. Do not submit HTML, CSS, SVG or source code for standard tools.
3. Use all relevant columns by default. Hide fields only when requested. Keep categorical filters unless the user asks to hide them. Badges and icons are choices from the closed template catalog, not generated styles.
4. Include newTables definitions only when required schemas are missing. They remain temporary until the reviewed save creates them atomically with the tracker. New editable fields may be multi-value; reused field cardinality must stay unchanged.
5. Show the prepared preview. Keep examples explicitly fictional, unsaved and excluded from metrics; omit them if requested. Never populate unrelated information from the HTML.
6. Follow [Trialy workspace workflow](../trialy-workspace/SKILL.md) for persistence and opening. Use a clearly matching project from context, otherwise Tools. Reuse existing save authorization; do not ask for it again. A valid preview stays reopenable until expiry, and a saved preview resolves to the saved tool.
7. For targeted changes, alter only requested configuration properties. Preserve bindings, existing content and the template.

## What is fixed

Typography, spacing, geometry, colors, responsive rules, icon paths, badges, tabs, overview stat composition, table structure, detail fields and Settings component structure come from the HTML. The server owns the renderer. More fields, another domain, new labels or different data are never reasons to regenerate the UI. Use tab.icon from people/document/checklist/contract when helpful; otherwise the reference sequence is used.

The demo's memberships, fake access rules, storage, joins, next-action calculations and sample dates are not reusable behavior. Use real backend permissions and reviewed writes. Do not represent demo functionality as a deployed capability.

## Exceptions and references

An existing standard tool remains configuration-only. A new custom tool is allowed only for a user-required capability supported by the server's exception contract: interactive_timeline, calendar or dependency_graph. Read [TRIALY_INTEGRATION.md](references/TRIALY_INTEGRATION.md) before such work. Never invent a requirement or bypass permission/write controls.

For complex discovery and shared data, use [DISCOVERY_AND_STRUCTURE.md](references/DISCOVERY_AND_STRUCTURE.md) and [DATA_AND_LIFECYCLE.md](references/DATA_AND_LIFECYCLE.md). For renderer development, first read TEMPLATE_REUSE.md and the fixed component assets. Older interaction/theme/parity references describe integration history; conflicting visual suggestions do not override the exact HTML or this template contract. Do not read the entire sample HTML for routine authoring.

## Completion check

Confirm the configuration uses the standard template, bindings are authorized, real totals exclude samples, user content is escaped, requested changes are present, and no sample-domain records or styling have leaked into the tool. Report what was actually saved or published, with the returned link.
