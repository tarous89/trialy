---
name: trialy-tracker-design
description: Build or revise TrialAgents apps with useful design defaults and full user customization. Use the reusable Vivid components, brand themes, or custom interfaces while preserving authorized database bindings, access controls and audit logs.
---

# Build the user's app

Treat Vivid as a starting point. Users may change colors, fonts, icons, spacing, layouts, components and interactions, or replace the interface entirely. No design exception or unsupported-capability justification is needed. Database integrity, access enforcement and audit logs are the firm boundaries.

For new apps, first follow the dynamic discovery and existing-app reuse workflow in [TrialAgents workspace](../trialy-workspace/SKILL.md). Check `list_app_templates` and read the selected template with `read_app_template`. Its current server instructions and schema govern that template. The packaged Vivid references below describe the legacy Vivid renderer only; they are not a complete template catalog or a restriction on other designs. Existing app source is reusable only after `read_app` succeeds under current permissions.

## Workflow

1. Call `read_app_design` for the current server-managed design kit, palettes and validation rules. Establish the user's job and inspect the relevant authorized schema and saved app. Reuse suitable tables and preserve field identities, types and cardinality unless the user requests a reviewed schema change.
2. For a catalog template, use `prepare_app_from_template` with the version, digest and configuration returned by `read_app_template`. For legacy Vivid apps, `prepare_tracker` and `prepare_tracker_revision` remain available. Read [CONFIGURATION.md](references/CONFIGURATION.md) for content, bindings, theme and display options. Preserve a selected template's styling when no visual change was requested. Honor requested styling; a brand palette is supported through `theme` and does not require a renderer deployment.
3. For custom composition, use the reusable components described in [TEMPLATE_REUSE.md](references/TEMPLATE_REUSE.md). For a fully custom app, use `prepare_app` with `content.format:"frontend-js"` (legacy `save_component` remains supported) and a matching authorized manifest. Existing apps can switch to custom code while retaining their database records. Read [TRIALY_INTEGRATION.md](references/TRIALY_INTEGRATION.md) for the runtime and write contract.
4. Create or extend database schemas only where needed. `newTables` and `extendTables` remain temporary until the reviewed save commits them atomically. New tables may reference each other by temporary UUID using relationship fields; these targets remap in the atomic save. Source fields are optional. Secondary fields remain available in details through includeDetailFields:true. Never weaken access or copy restricted data to achieve a design change.
5. Follow the stable requestKey and in-place revision workflow in the workspace skill. Repair any returned design-check failures before showing the preview; do not create a second app when repairing or reopening the first. Show the prepared preview. Examples, when useful, are clearly fictional, unsaved and excluded from totals. Omit them on request. The reference HTML's business content is illustrative only.
6. Follow [TrialAgents workspace workflow](../trialy-workspace/SKILL.md) for persistence. Display previews and requested saved apps in the extension using `prepare_tracker` or `open_app`. After saving, use `open_workspace` to return to Home inside the extension; do not automatically reopen the saved app. A standalone URL is optional. If the same preview still cannot display after one retry, call `open_workspace` to show the platform. The platform adds its compact corner watermark. An appropriate project or Home only determines organization. Reuse existing authorization without asking again; every committed write still uses the supported authorization and logging flow.
7. For targeted revisions, preserve unrelated content, styling and bindings. Rebrand or redesign only as requested.

## Default standards users may override

Preserve the original Vivid appearance when no visual change is requested. Keep its overview icons and expressive accents. Use plain text for names, dates, numbers, links and descriptive values. Multiple values use separated text or neutral chips; cardinality does not imply a color. Use restrained semantic badges for status, stage, priority and outcomes. Explicit `display` settings take precedence over defaults, including `kind:"text"` and neutral badges.

Use consistent action spacing, accessible icon buttons with labels/tooltips, brief save notifications, real pagination, and usable Add/remove controls for multiple values. These are reusable quality defaults, not a closed catalog of permitted apps. Implement the user's preferred alternative when requested.

## Runtime boundaries

Custom source runs in bounded QuickJS and returns HTML/CSS/state; it does not run arbitrary browser JavaScript or fetch external services. Use supported events and the trusted data/control bridge. Simple apps can use `input.route`, safe internal/cross-app links and declared generic HTTPS connector operations; read the integration reference and workspace skill for their contracts. Keep code isolation, data validation, field permissions, reviewed writes and logs intact. Explain an actual runtime limitation precisely and use the nearest supported implementation; do not invent a template restriction.

For shared-data discovery read [DISCOVERY_AND_STRUCTURE.md](references/DISCOVERY_AND_STRUCTURE.md) and [DATA_AND_LIFECYCLE.md](references/DATA_AND_LIFECYCLE.md). Historic visual advice in other references is default guidance, subordinate to explicit user choices.

## Verify

Check the requested appearance and behavior, authorized bindings, preserved records, pagination, multi-value editing, color meaning and fictional-example separation. Distinguish prepared, saved, published and host-tested status in the response.
