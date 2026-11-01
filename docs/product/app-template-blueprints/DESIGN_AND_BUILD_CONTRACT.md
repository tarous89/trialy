# TrialAgents — Shared blueprint, UI and interaction contract (all 23 apps)

**Status:** Design and functional scoping proposal. No HTML, CSS, JS, template JSON or backend changes are approved or performed by this document. Detailed candidates: [catalog](README.md). Platform contracts below are updated for deployed release 0.2.39 and guidance 1.3.1 on 1 November 2026; this does not mark any candidate app implemented. [Current project context](../../../CONTEXT.md).

## Account and logo guardrails

All generated apps are internal tools accessed through the TrialAgents account. Do not build separate app authentication, account management or credential stores. Preserve existing platform access controls. Any TrialAgents logo or wordmark must include the official icon and link to https://platform.trialagents.com. Use the supplied black/white PNG, never a text-only or approximate substitute. See [current template authoring standard](../../../templates/TEMPLATE_AUTHORING.md#app-account-and-trialagents-branding-guardrails) for assets, sandbox compatibility and acceptance checks.

## 1. Product and template philosophy

- Each app solves **one bounded professional job** in 4–8 screens. “Screen” can be an overview, editable tracker, input form, pipeline, chart/timeline, saved-report viewer or ChatGPT task-setup guidance. Never add an entire CRM/CTMS/ELN/ERP/clinical safety platform merely to match the benchmark.
- **No forced app categories** in product navigation. Screen types are implementation patterns; app names remain domain-specific and user-editable. All users may build custom apps outside these samples.
- **MVP screen budget:** the screen heading plus exactly **four core user-facing capabilities** listed in audience specs. Add shared search/access/save/review, error and empty states as platform behaviors rather than a fifth specialist module. Do not create a dedicated “Settings” tab in every demo: use existing app settings.
- Reuse the current Vivid template and `read_app_design` kit as far as behavior allows. A custom `frontend-js` view is reasonable for specialized timelines, Kanban, comparison matrices and scientific visualizations; preserve the same authorized data and approval pathways. If a chart or editor is not supported by current code, flag engineering work—do not fabricate a working control.
- **Actual screen values** derive from committed, authorized records; demo examples are labelled fictional and are never counted or committed. Large joins/analytics must respect the implemented paging, compute and query boundaries.

## 2. Visual system — modern scientific restraint

**Typography:** unify on **Inter when supplied by the existing TrialAgents app frame**, then `-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif`. This preserves Vivid's approved system-sans appearance and does not require delivering any font files. Text hierarchy: app H1 ~30–34 px; section H2 20–24; metric number 28–34; main body 15–16; table 14–15.5; supporting text >=12. Do not turn every small label into uppercase tracking.

**Reference palette (existing app-design/Vivid tokens):**

| Token | Proposed reference | Usage |
| --- | --- | --- |
| Main canvas | `#F7FAF8` (Vivid reference `#F8FAF9`) | Light app surface; **do not default entire app to dark mode** |
| Content card | `#FFFFFF` | Trackers, forms, chart sheets, drawers |
| Main ink | `#142E29` / Vivid `#102022` | Titles, numbers, labels |
| Muted ink | `#516660` / Vivid `#46585B` | Descriptions, dates, legends |
| Default action | `#087B58` | Primary action and active tab unless an explicitly chosen theme overrides |
| Borders | `#CADBD2` or `#E4E8E6` | Dividers and table separators |
| Dark KPI | `#243B40` | Occasional rich dark summary cards, white ink, delicate outline icon |
| Dark cover | `#14262A` | App card cover, hero metric or science accent panel, **not all cards** |
| Success/pending/blocked | Reuse existing Vivid status palettes | Semantic states only; never redefine by industry |
| Pending edits | `#E5F6E9` | Uncommitted field edits, same existing save behavior |

**App identity / restrained accents:** assign one theme per app from existing `forest` (`#087B58`), `ocean` (`#175B94`) or `plum` (`#795094`) palettes; optional rich/dark header accents `#182C35`, `#203643`, `#2B3546`, `#332B41`. Do not repaint semantic success/warning/error statuses with branding colors. Different apps may use different accent *covers and visualization highlights*, while all use consistent typography, neutral table/form surfaces and controls.

**Cards and icons:** one large introductory/hero insight card or 1–3 dark metric cards on dashboards where useful, with single-color thin line icons (existing `Icon` names such as `database`, `molecule`, `dna`, `flask`, `tracker`, `visualization`, `clock`, `search`, `check`, `document`, `people` via Vivid, and iconPath/custom icons only where supported). No colorful clip art or icon on each row. 10–14 px radius (Vivid tables 12), subtle border, minimal shadow; dark cards should have faint technical line grid/orbit/plot motif only if it does not reduce contrast. Preserve stable project colors/cover identity already implemented in Home.

**Spacing/layout:** desktop page max ~1200–1440 px depending on current shell, content gutters 28–36 px, mobile 16–20; 16–24 px between related cards, 24–36 px between sections. Tabs with quiet underline and settings on the right. One page-level vertical scrolling flow, no nested vertical table scrollbars. Main table searchable, 25 records/page default where available, pagination at bottom; sticky right **Details** action, resizable drawer, 40–44 px interaction targets. Use the existing trusted Save/Ignore controls for deliberate record/layout edits. The global first-save footer appears only for a never-saved app; saved revisions never bring it back. Do not invent a second save bar. Keep any shared footer in the header/sidebar brand color.

**Responsive:** keep Search and the primary action (such as Add record) on one line. When controls no longer fit the container, disclose secondary filters/sorting in the shared accessible Filters panel with active count; never push the primary action to a second row. Preserve filter/input state across resize, use keyboard/focus/Escape behavior, and do not fetch data to expand controls. Desktop 3-up metrics / 2-up charts when meaningful; tablet 2-up; phone 1-up. Timelines and matrices may scroll horizontally in their own region with labeled columns, never force the whole page wider. Small mobile screen remains actionable, not shrunk screenshots. Keyboard, high contrast, programmatic labels and legends are mandatory. Retain the latest authorized published app on loading or optional-service failures, including local input. Use the shared empty state only when no usable authorized app exists. Actual access revocation still clears forbidden content; failed writes use the existing dismissible feedback and preserve the draft. Automation diagnostics belong only in platform Automations.

## 3. Chart and scientific visualization rules

Charts are analytical tools, not decorations. Give each a title, measure, unit, time window and source/last-updated label. Add accessible tabular fallback, tooltips and filters when supported. All data derived from authorized saved records; a metric must describe its denominator and missing values. **Zero missing values must not silently become zeros.**

| Purpose | Chart standard | Visual guidance |
| --- | --- | --- |
| Trend / time series | Line or step-line | One accent line, second muted comparison, optional light band; dates ascending; dotted forecasts labelled, never mixed invisibly with actuals |
| Budget / cash | Stacked bar + cash balance line in separate charts | Currency/unit labels, zero baseline on bars, positive/negative distinguished with signed values and text |
| Capacity / headcount | Grouped bars or area, utilization heatmap | Stable colors for demand vs supply; overallocated cells amber/red with textual warning |
| Funnel / pipeline | Horizontal stage bars or Kanban | Counts/values per stage, conversion rates only with suitable denominators; dropoffs explicit |
| Site/vendor/partner comparison | Sorted horizontal bars, radar avoided unless justified | Weighted scores and criteria printed; rank transparent, “not assessed” distinct from zero |
| Scientific measurements | Scatter / line with error representation when available | Units, assay/batch, replicates, controls, uncertainty; never imply statistical significance without test |
| Study / submission timeline | Gantt-like milestone lanes | Owner, planned/actual date, date slips, today marker; non-patient aggregate only |
| Portfolio health | Status count bars + compact matrix | Meaningful text and counts; source/cutoff visible; no gratuitous pie/donut overload |
| Geographic coverage | Country bars/matrix, not guessed maps | Use validated source countries; avoid precise institution pins unless genuinely useful |
| Literature / funding signals | Sparklines or year/topic bar chart | One mark per source-backed item; explicit interval and deduplication, no generated “impact score” disguised as measured evidence |

**Chart color roles:** use 2–3 colors maximum per chart for ordinary series, typically theme accent + blue/teal + gray. Red/amber/green only for their semantic meaning. Color-blind friendly combinations, solid/dashed patterns and always visible series labels. Use legible axis ticks, minimal grid lines, no 3D, no misleading dual axes, no decoration that makes the data hard to interpret.

## 4. Standard screen archetypes and domain actions

Each audience blueprint specifies exact instances of these primitives:

- **Overview:** 2–4 high-value KPIs, one primary domain chart and a prioritized next-action/exception list; dark covers/metrics optional, not all tiles dark.
- **Record tracker:** searchable/filtered sortable editable list; Source and updated metadata, pinned Details drawer, batch review, 25 per page; relationship links navigate to authorized records.
- **Form:** labels, validated typed inputs, required/optional clearly marked, relationship selection, concise confirmation after approved save; draft remains distinct.
- **Pipeline:** stage columns or stage filter + list; per-item owner/value/due; stage change is a reviewed record edit; offer list fallback on small screens.
- **Comparison/scorecard:** explicit criteria, missing-data handling, weights and score formula/version; manual override records a rationale; no black-box ranking.
- **Calendar/timeline:** start/end/due, planned vs actual, owner, overdue markers; no assumed real-time sync; horizontal scroll if needed.
- **Report viewer:** saved approved report version, covered period, source-record snapshot links, status and explicit *Prepare with ChatGPT* handoff; no hidden LLM inside TrialAgents.
- **Monitoring/setup:** selected subjects/sources/keywords may be domain inputs, but management links to platform Automations for the app-linked definition, reviewed instructions/schedule, scopes, status and history. Do not require an automation screen inside each generated app or duplicate its settings store. Connection readiness is separate from enabled intent.

## 5. Shared data model and integrity

Reuse existing permitted Organization, Person, Project (including clinical study as a *customer* project), Location, document and work-item records before creating new types. Add domain tables such as Opportunity, Bid, Milestone, Allocation, Experiment, Signal, Publication or Grant only when the workflow truly requires them. Preserve entity IDs, relationships, version/actor, alternative observations and original sources; do not silently merge a company because the name matches. Sponsor-confidential site responses need project/client-specific records and access, not a global PI profile overwrite. Separate original observation and synthesized interpretation.

For every proposed domain entity: define fields, single/multi cardinality, record links, required constraints, status enum, owner, timestamps, source URL/label, source date and last verification when applicable. Display selected columns in the table, others in details; don't collect unnecessary sensitive personal details. Computed values show formula and stale/missing-input state. **No patient-level data anywhere in these templates.**

All edits: exact preview + Save/Ignore, accessible changed-field indication and immutable field history. An expressly authorized type/field/source/expiry standing grant can cover future qualifying writes; granting a task does not grant a generic DB write or external email. AI reads are subject to AI permissions, not the human owner's broader view. No automatic unapproved schema changes.

## 6. App access, ChatGPT and scheduling contract

Follow the [implemented app configuration contract](../APP_CONFIGURATION_AND_AUTOMATIONS.md) and current `read_app_automation_guide`. All 23 candidate apps and future custom apps share this contract; recipe wording in an individual blueprint describes intent, not a separate scheduler or new API schema.

**Access:** every app has the enforced backend app boundary. The Access page keeps Projects → apps visible by default → expandable registered tabs, matching Database → tables → columns. Supported standard tracker tabs can supply stable optional `accessId` values. Inherit app permissions and only narrow them; preserve IDs across rename/reorder and protect source/data server-side. Missing metadata is valid; arbitrary custom screens remain app-level until their finer boundary is supported. Do not retrofit existing apps or use hidden HTML as authorization. Independent Database access is still governed separately.

**Research:** ChatGPT performs approved source discovery, monitoring, interpretation and report writing. Save the app first, then prepare an app-linked research monitor using existing tools, stable authoring keys and exact owner review. Store the complete instructions, sources, output, scopes, timing and expiry in TrialAgents. One shared owner/workspace ChatGPT event subscription fetches due work; no per-app task or independent ChatGPT polling schedule. Local app JavaScript does not perform this background research.

**Recipe documentation:** specify purpose; authorized input fields; sources and inclusion/exclusion; typed trigger (calendar daily/weekly/monthly, one-time, after-success, record-date or database change when supported); IANA timezone and coverage; deduplication identity; output/report destination; reviewed write scope/limits/expiry; success/no-findings/partial-failure behavior; and any separately approved notification. Use existing `documentation.tasks` and examples, not invented catalog fields. Include a no-automation example.

**Platform effects:** TrialAgents app actions execute approved deterministic work and email. Durable connector jobs support long LLM/API operations under their approved credentials and timeout contracts; never put a provider call or secret inside generated source. A research-to-email chain uses a separately reviewed manual-trigger completion action, not a duplicate schedule. Keep research success and email delivery outcomes separate; unknown delivery outcomes are reconciled without blind resend.

**Connection:** quietly check setup on first supported use, every app creation, automation addition and reconnect/repair. Reuse prior consent/subscriptions and respect paused/declined setup. Requested execution is Work chat, latest most capable subscription model, high reasoning; current host tools do not expose controls to enforce model/reasoning settings. Missing tools may require custom-connection metadata refresh and a new Work chat; availability and a real unattended cycle still need verification. Never invent host IDs/callbacks or claim OAuth activates background work.

**Management and continuity:** platform Automations lists app-linked definitions; owners expand/edit schedule and prompt, inspect permissions/history and disable work. Editing preserves disabled state. Archive suspends work; restore/copy does not silently enable it. Removing or disabling automation never deletes an app or its records. A generated app must load/save/work without automation setup, and retain its current published content and unsaved input during scheduling, callback or task failures. Do not fetch automation status on the app's ordinary loading path.

**Performance:** follow the living authoring contract's bounded active-page reads, authorized snapshots and in-flight request reuse. Use returned `includeOutput:true` output after layout save rather than a second serial render. Validate cold/warm tabs with realistic fields, several filters, 320–1440px containers, and delayed/failed background services. Preserve permission checks and exact save receipts.

## 7. Scope and external-tool exclusions

- Study startup/site readiness: institution-level feasibility only; no patient recruitment lists or subject-level data.
- Regulatory: completeness/status/authority-question tracking only; no native CTIS submissions, portal login, electronic signatures or validated dossier/eCTD publishing.
- Monitoring/PV: operational visit findings and partner obligations only; no adverse-event intake, case narratives, MedDRA coding or safety database.
- Research: nonclinical experiments, reagent inventory and scientific literature; exclude human-derived specimen traces, patient data and regulated lab validation claims.
- Finance: planning and management accounting, not a ledger replacement, payroll platform, purchasing API or payment processor.
- CRM: professional contacts and published company facts, subject to access; no contact enrichment from paid systems by default or unsolicited automated outreach.
- Shareable forms/sponsor portals: only use the reviewed collection-link/access contracts if available; **no implicit user access, authentication or email dispatch**.

## 8. Release/QA definition of done (for later implementation, not fulfilled by these docs)

1. Template uses one immutable versioned catalog entry, correct when-to-use/when-not-to-use and configuration; no mandatory application type.
2. One app with 4–8 reachable screens, four promised core capabilities each, real authorized bindings and persistent data where required; UI isn't a static mock.
3. Desktop 1440 and mobile 390 quality checks: readable, no overlapping controls, no page overflow, one vertical scroll; keyboard accessible, contrast>=4.5:1 normal text.
4. One complete flow: new record/form → proposed exact field diffs → owner approval → committed data → overview/chart updated → history shows source and authorization.
5. Search, filters, relationships, pagination, stale/empty/restricted/duplicate states and error recovery tested, no fake totals. Calculated KPIs manually reconciled against sample inputs.
6. Research/LLM/report screen only offers verified ChatGPT handoff, properly cited result with report save if authorized, plus a manual fallback. Recurring monitoring only advertised as active after a verified shared host subscription and unattended cycle; incomplete activation remains pending in platform Automations.
7. Demo screenshots: four truthful frames per app — dashboard; records; action; resulting chart/report — at desktop and at least one narrow-screen pass, with clearly fictitious data.
8. Missing optional section metadata, no-automation creation, narrow tab permissions, disabled edits, archive/restore and scheduler/task failures preserve usable apps and records.
9. No patient data and no required external service. No compliance certification, live integration or email delivery claimed without acceptance evidence.

## Shared implementation contract

Follow the [living template authoring standard](../../../templates/TEMPLATE_AUTHORING.md) and [ChatGPT usage/task contract](../../../templates/TEMPLATE_USAGE.md). Domain blueprints supplement these shared runtime, documentation, lifecycle and acceptance requirements.
