---
name: trialy-tracker-design
description: Build and revise Trialy trackers and their contained forms, views, settings and workflows. Use user instructions and existing authorized data first, with the fixed Vivid template and configuration-only adaptation. Does not define the whole plugin or application interface.
---

# Trialy tracker design standard

## Standard authoring fast path

Read [CONFIGURATION.md](references/CONFIGURATION.md), inspect relevant authorized schemas, and call `prepare_tracker`. The server supplies the Vivid template and fills categorical filters and semantic badge colors, including multi-value fields. Use `filterMode:none` only for an explicit request to hide filters. Do not rewrite, copy or submit the HTML for a standard tracker. The HTML, renderer and other visual references are for development/exception work, not a mandatory token-heavy read for each configuration request. For targeted revisions read the saved configuration and change only requested properties.

## Integration and override contract

Read [Trialy integration](references/TRIALY_INTEGRATION.md) when implementing a custom exception or changing the renderer. This section takes precedence over conflicting defaults elsewhere in this package.

Use `prepare_tracker` and `prepare_tracker_revision` for standard tools. ChatGPT changes content and bindings; Trialy owns HTML, CSS, icons, spacing, colors and interactions. More fields, different terminology, calculations, status filters and visual preferences are supported configuration work, never reasons to generate a new design. A new custom tool is permitted only for an actual user-required capability absent from the renderer: `interactive_timeline` (at least two bound date fields), `calendar` (a bound date field), or `dependency_graph` (a bound relationship field). Supply `save_component.designException` with `capability`, the user's `userRequirement`, `whyStandardInsufficient` and exact manifest `fieldIds`. The server validates the capability and bindings; the preview exposes the exception for review. A free-text `designChangeReason` alone is rejected. Do not invent a requirement to qualify. Preserve the host shell and existing permission/write controls. Existing saved standard tools remain configuration-only; never relabel a bound tool as generic to bypass this rule.

## Executable skeleton and fidelity

When modifying the renderer itself, read [Reference parity](references/REFERENCE_PARITY.md). Reuse `assets/connected-tracker.js` through `prepare_tracker`; adapt configuration, not hand-recreated markup. Ordinary text, URLs and multi-value prose use neutral ink. Click values to edit; resize columns at header edges and rows at the bottom of Details cells. Reference-only features listed in the parity table must not be advertised as implemented.

## Default implementation

Use `prepare_tracker` to show a temporary tracker before asking to save. Reuse compatible saved fields, or include temporary newTables definitions for missing tables; save creates them atomically with the tracker. It compiles the approved HTML structure and stylesheet through `assets/connected-tracker.js` with server-validated bindings. The trusted browser renderer handles tabs, search, sorting, details and layout locally; bounded data fetches and approved writes still use the backend. Never regenerate a reduced generic table as the default. Read `read_tracker_design(resource:"workflow")` for the current server-backed creation path, including the visible draft returned by `prepare_tracker`, confirmed save and `open_tracker`. Do not replace this default with a technical table editor. For an unsupported use case, follow the new-custom-format exception above; existing standard tools remain configuration-only.

Show every tracker column by default unless the user hides it. New editable fields accept multiple values by default, except dates, status and boolean; calculated outputs and unique identity fields remain scalar. Preserve reused database column cardinality. Choose a clearly matching existing project from context before preparing the save; otherwise use Tools. Ask only whether to save, with no destination selector. Valid unsaved previews remain reopenable from Tools with a Preview badge until expiry.

Schema availability alone does not make existing records relevant. Show one labelled fictional example in each empty data tab, excluded from real records and metrics. A populated tab shows its real records; never add dummy records to the database. Do not populate unrelated university/PI/vendor information. User requests override this example default.

## Mission and precedence

Produce **credible, minimal, domain-specific content inside a stable, reusable tracker experience**. The common UI/interaction standard is fixed; business semantics are tailored to the actual objective. Build a compelling example that users can recognize and extend, rather than a complex enterprise application or a blank technical database editor.

Respect direct user instructions and established workspace/platform security contracts if they conflict with defaults here. Never misrepresent an HTML demo as a deployed, persistent, permission-enforced application. Never claim an integration, data source, or compliance capability that has not been verified. Preserve previously approved design and behavior during targeted revisions: change only what the user requested.

### Additional references for renderer development and complex workflows

- **Complex discovery or data-lifecycle changes:** Read [DISCOVERY_AND_STRUCTURE.md](references/DISCOVERY_AND_STRUCTURE.md) for the repeatable decision process and [DATA_AND_LIFECYCLE.md](references/DATA_AND_LIFECYCLE.md) for shared identity, sources, approval, and derived state.
- **Renderer development or a custom exception:** Read [UI_INTERACTION_CONTRACT.md](references/UI_INTERACTION_CONTRACT.md) completely. Its behaviors are **universal and non-optional** in every tracker unless the user explicitly changes the standard.
- **Renderer style/theme development:** Read [THEME_2_VIVID.md](references/THEME_2_VIVID.md). Use `assets/approved-theme2-reference.html` as the canonical working reference; do not copy its CRO-specific data or vocabulary. The user approved **Theme 2 / Vivid Tints** as final.
- **Before calling work complete:** Use [QA_AND_EXAMPLES.md](references/QA_AND_EXAMPLES.md) as the acceptance checklist and generalization test suite.

## The repeatable sequence — run it in this order

### 1. Understand the *job*, not a proposed screen

Identify: who does the work; what objective/deliverable they must reach; which decision they need to make; when work starts/ends; which people, organizations and systems participate; what proof counts as done; and the **next action**. For unknown or niche workflows, investigate relevant real practitioners, specialist products, and small-team use cases before designing. Favor independent examples and documented customer practice over feature marketing. Distinguish evidence from illustrative invention. Do not use large-enterprise software as the unquestioned baseline for small teams.

Write a one- or two-sentence user story internally: “As [role], I need to [outcome] while [constraints] so that [decision/result].” Identify a single testable, realistic end-to-end journey (e.g., shortlist → solicit information → compare → decide → execute). **Do not create tabs until the story is coherent.**

### 2. Choose the unit being tracked

Prefer **one independently manageable deliverable or business objective** per execution tracker. A tracker may contain several milestones, steps, owners and dependencies. A workstream or asset-level tracker can instead act as an **overview** referencing several execution trackers. Distinguish a recurring operational **register** (people, vendors, agreements) from a deliverable tracker (selection, study, round, onboarding initiative). Never force a hierarchy or default to many assets: a small biotech may have one lead asset and parallel research, CMC, nonclinical, regulatory and clinical projects.

Use company → asset (if relevant) → workstream → deliverable tracker → milestones/actions only as an **internal mental model**, not required navigation, schema or enforced categorization. One record can be connected to many authorized contexts. Grouping/rollups are views on real linked data, not duplicate records or assumed dependencies.

### 3. Determine information architecture and source of truth

Separate:
1. **Shared entities** (a person, organization, asset, document, contract where appropriate): stable IDs and reusable fields.
2. **Context-specific relationships** (one vendor's proposal *for this request*, a person's role *in this project*, a site *in this study*): context-specific status and facts, not attributes of the global entity.
3. **Activities/deliverables** (milestones, actions, reviews, messages where explicitly authorized).
4. **Presentation configuration** (tabs, display names, visibility, order, filters, calculated views): not facts.

Treat committed database records as the source of truth; trackers/forms/dashboards are bound interfaces. Do **not** make one tracker the authoritative copy of another tracker or silently synchronize two copies. Inspect and reuse the permitted schema before proposing new structures. Keep field identities stable when display labels change; never conflate duplicated display and linked identity (e.g., two "CRO" columns). See data reference for change authorization.

### 4. Select only essential data and tabs

Build the **smallest useful structure that tells the end-to-end story**. For each tab answer: “What decision or action does this tab enable?” Prefer one readable main table per tab. Show every included field by default; use horizontal scrolling with readable, resizable columns. Hide fields only when the user requests it. An Overview should summarize real statuses from contributing tabs and show **only open decisions, updates, blockers or next actions**, not a redundant all-record list. Use a small number of **data-derived** metric cards with existing theme icons only when meaningful. Do not invent categories, budgets, statuses, or charts as decoration.

Classify candidate content as **Essential** (generic to the actual process), **Specialized** (service, study, jurisdiction or modality dependent; important when applicable), or **Nice to have** (advanced and not needed to prove the journey). Include essentials, allow specialized fields by context, and defer nice-to-have content. Do not confuse “specialized” with “dispensable for regulated work.”

Keep domain-specific content out of this skill. Derive it fresh from actual task evidence. Example: a proposal's budget is essential **in a paid sourcing decision**; it is not a universal column in every tracker. Qualitative selection criteria and an explicit manual rank can be appropriate; never add an arbitrary weighted score unless requested and justified. Use user-defined statuses/criteria, not automatic ranking from incomplete information.

### 5. Allocate behaviors across four building blocks

- **Tracker:** reads/manages related records and milestones, with tables, inline editing, record details and configurable views.
- **Form:** gathers new/changed input; submitted information enters a pending review or an explicitly authorized write path, then appears in all bound views after commit.
- **Dashboard:** reads committed records, shows live derived views, comparisons, summaries, timelines, charts if warranted; no independent factual state.
- **Automation:** runs on an authorized event/schedule; may propose or perform only permitted effects; never infer that a saved tracker grants email, database-write or cross-system authority.

A tracker can contain data-entry controls, forms and dashboards; they are not four separate databases. Treat claims of sent/received, selected/approved, paid/invoiced, trained/acknowledged, and drafted/submitted as **distinct observed states**. A user click to prepare a message is not evidence it was sent.

### 6. Implement the **default UI contract**

Build with the existing approved design, not a new theme or navigation concept. Details: [UI_INTERACTION_CONTRACT.md](references/UI_INTERACTION_CONTRACT.md), [THEME_2_VIVID.md](references/THEME_2_VIVID.md). The mandatory minimum:

- No tracker-specific global logo/sidebar/header actions; the embedded host supplies the Trialy logo and Open app header; the standalone app supplies its sidebar. Show simple tracker **title + subtitle**, top tab row, and table toolbar.
- Clean table-first pages: search, relevant filters, sort/rank where applicable, **`Add record`** only, Save edits / Ignore edits on pending changes. Fixed embedded host header (none in the standalone app) and action footer; a single full-page vertical scroller for the remaining content, with horizontal scrolling confined to the table. Details fill the available viewport height, regardless of table height. Far-right pinned **Details** column, accessible while scrolling horizontally.
- Click **any editable data cell, including the first/name cell, to edit it inline**, not to open details; click the larger corner-expand icon in Details to open the right-side record drawer. All permitted detail fields directly editable.
- Pending changed cells/fields gain a light **green** background. Save, merge, update and layout actions belong in a dark floating footer: one concise sentence and one CTA (secondary styling for Save tracker in the plugin), with a quiet dismiss control. Do not add Advanced/reload controls or explanatory paragraphs above the tracker; no unapproved auto-commit. Review/save permissions and concurrency as backend requires.
- Drawer resizes by dragging its left divider; line only, **no shadow**; supports Duplicate and Delete with appropriate confirmation/linked-record safeguards.
- Full-page Settings launched by an **unobtrusive icon only** at tab level, no background. **Only Layout and Access tabs** (Style was explicitly removed). All tabs/columns configurable through Layout; membership and granular override policies through Access.
- Editable display labels **must not rename database field keys**. All underlying fields appear in Layout > Columns, even when hidden in table or displayed in details; users can show/hide, choose types when creating, and drag to reorder. Do not show a second redundant editable name field or number-based ordering.
- Include a **`Source` column in every tracker table** (show `—` when there is no evidence yet), and a corresponding detail field. Prefer existing storage **URLs, stable document references, or concise text**, not file uploads. Capture source/version/provenance when available; hide Source only if the user explicitly changes this standard.
- When adding a record with a relationship picker, include **Create new [related type]** to open the related-record editor, save through the correct authorization flow, and return with the new item selected.
- Shared permission model: owners / editors / viewers / custom, each with explicit tab/column outcomes **Can edit / Can view / Restricted**. Derive displayed defaults from base role (no "Inherit role" shown); a differing granular permission makes the person's master role **Custom**; no extra Custom badge beside the edited permission. See access reference for precedence and safety.

### 7. Make synthetic examples believable without overfitting

If sample data is required, create a **single internally consistent fictional story** with scoped assets, projects, dates, currencies and relationships. Prefer anonymized names such as Supplier #1 or Organization #1 unless the user requests otherwise. Ground visible counts in sample records, not hardcoded statements. A sample vendor from Europe should not be treated as universally European-only; geography is a filter/fact, not a fixed taxonomy. Do not display made-up real-company evaluations, contact details, clinical results or quotes as factual. Label the demo as fictional in documentation/footnotes, but avoid distracting “interactive prototype” marketing labels in the UI.

### 8. Test before delivery and protect previous decisions

Check essential journeys, all tabs, details, editing, save/discard, duplicate/delete, source links, relationships/add new, settings, drag order, visibility, permissions and responsive behavior. Test keyboard/focus/accessibility and empty/missing values. Verify counts/reports after edits, as well as *negative cases* (restricted field, outdated data revision, canceled approval, broken source). Use [QA_AND_EXAMPLES.md](references/QA_AND_EXAMPLES.md).

For edits to an approved tracker, compare against the exact previous artifact: preserve all unrelated markup, CSS, JS, data, spacing and behavior. When user asks for **style only**, modify only theme tokens/selectors and prove behavior/DOM unchanged. When user requests a new tracker, use the canonical reference's **structure, features and theme** but regenerate all domain content, tabs and schema according to the new job.

## Deliverable standards

For scoping requests: deliver the concise story, proposed tabs with their purposes, essential fields, sample journey, and any specialized/nice-to-have items. For build requests: deliver an actual usable artifact or integrated component if the host permits; perform realistic QA and honestly state any unverified functionality. Never assume web-only preview changes were committed to Trialy's database or that local permission controls enforce backend access. Show and use actual source references when external evidence is requested.

## Default design rules

1. **Keep Theme 2 (Vivid Tints)** and its approved base UI; no new color families or aesthetic redesign. Preserve contrast and clear action-state color semantics.
2. **Data/permissions over presentation:** underlying source and audit win; no silent writes, merges or false success indications.
3. **No forced domain taxonomy, study hierarchy, mandatory module list, or full-enterprise complexity.** Eleven showcase function names are examples, not code-defined modules.
4. **More information is not better:** all included fields visible by default; hidden fields only on explicit instruction and accessible in Layout/details.
5. **The next action matters:** every overview should help users understand what actually needs attention now.

## Record details contract
Use the shipped reusable renderer. Opening details must fill the available content area below any embedded host header even after scrolling; the overlay scrolls as one page and keeps its close control reachable. Values, inputs, links, and tags use normal weight (400); only field labels use semibold (650). Long values wrap inside the drawer. Do not recreate a table-height drawer or bold the value wrapper. Verify both long records and scrolled-page opening on mobile and desktop.

## Persistent app chrome and user-facing metadata
Keep the dark embedded header, docked expanded sidebar and active action footer above content; omit the header in the standalone app. Fit details, editors and confirmations inside the remaining content rectangle. Opening details must never replace or cover app navigation. Show projects as horizontal rectangles with stable, individually varied light colors, a matching icon, project name and tiny creation date. Keep every project in place when selected. Mute unselected project colors to 50%; show full contrast and a border on the selected project. Never add a checkmark. Omit the Projects heading and global project-settings button. Reveal a per-project settings cog on hover/focus (always available on touch) that opens its name, description, Access and confirmed tool/project deletion page. Show tools as 4:5 rectangles with a small permission-checked snapshot, tool name and tiny update date below it; use a 2px border whose color identifies tracker, dashboard, form or automation. Do not execute saved tool code to make a Tools thumbnail. Show purpose, project, preview state and updated date; omit connected-table counts, schema details and revision numbers from Tools. Use consistent system sans-serif typography, neutral text and strong green action buttons.

## Account navigation and layout mapping

Use user, projects, tools, Database and Logs as the product vocabulary. Never display internal workspace names. The standalone app has no top header; the embedded ChatGPT host retains its navigation header. Keep the sidebar and any action footer above the changing content.
Use the approved reference sliders SVG for tracker Settings, the existing cog icon for account/project settings, and a padlock for Access. In Layout settings, show the authorized database table name and ID for every tab and the table plus stable field key for every column; keep mapping metadata read-only and separate from editable display labels. Do not put this metadata on Tools cards. Preserve mappings when labels change. Use the bundled renderer for these mappings; do not invent linked table names.

In the ChatGPT plugin, use the persistent navigation instead of page-level Home or Back buttons. Open the narrow docked sidebar below the full-width header; do not duplicate its logo. Use the simple menu icon in the embedded header. Preserve explicit Cancel, close-details, save and discard actions. Database is cross-project: let each table's field tree expand/collapse independently of the active table. Add record inserts an unsaved inline row. Save changes validates and saves it; Cancel discards it.

Use Tools as the main destination label, with New above it in the sidebar. Keep New out of the content header. Label the unfiltered tool category All tools. Keep tool-type filters, search, sort and view controls on one desktop line; wrap neatly on narrow screens. Style filters and tags as pills with colored borders, and actions with the standard less-rounded button shape. In Logs, align controls vertically, put secondary refresh/export icons at the upper right, and place From/Through labels inside the date selectors.


### Template creation and source selection
New → Project opens direct folder creation with name and optional description/Access, without templates. Tracker preselects the first Vivid template. Form, Dashboard and Automation open the gallery filtered by type. Build with ChatGPT adapts the content within that default; choose a new custom format only under the exception above. Ask explicitly whether a template should use existing tables/fields or create new empty tables. In Layout, show editable source table/field selectors next to labels and the inherited database type. Reconnecting must not move or copy records. Rebuild bindings and control types together, respecting column permissions and read-only derived fields. Block incompatible custom actions until their code is reviewed. Keep the stored `visualization` identifier for Dashboard API compatibility.

## Configuration-only creation and revisions
