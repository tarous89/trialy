# TrialAgents — Shared blueprint, UI and interaction contract (all 23 apps)

**Status:** Design and functional scoping proposal. No HTML, CSS, JS, template JSON or backend changes are approved or performed by this document. Detailed candidates: [catalog](README.md).

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

**Spacing/layout:** desktop page max ~1200–1440 px depending on current shell, content gutters 28–36 px, mobile 16–20; 16–24 px between related cards, 24–36 px between sections. Tabs with quiet underline and settings on the right. One page-level vertical scrolling flow, no nested vertical table scrollbars. Main table searchable, 25 records/page default where available, pagination at bottom; sticky right **Details** action, resizable drawer, 40–44 px interaction targets. Full-width fixed Save/Ignore footer only when pending changes, no competing CTAs.

**Responsive:** desktop 3-up metrics / 2-up charts when meaningful; tablet 2-up; phone 1-up. Timelines and matrices may scroll horizontally in their own region with labeled columns, never force the whole page wider. Small mobile screen remains actionable, not shrunk screenshots. Keyboard, high contrast, programmatic labels, legends and clear empty/loading/error/restricted states are mandatory.

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
- **Monitoring/setup:** selected subjects/sources/keywords, cadence preference, preview of research prompt and write scope, ChatGPT Task configuration offered after authorization; display “not connected” until verified, not a fake working toggle.

## 5. Shared data model and integrity

Reuse existing permitted Organization, Person, Project (including clinical study as a *customer* project), Location, document and work-item records before creating new types. Add domain tables such as Opportunity, Bid, Milestone, Allocation, Experiment, Signal, Publication or Grant only when the workflow truly requires them. Preserve entity IDs, relationships, version/actor, alternative observations and original sources; do not silently merge a company because the name matches. Sponsor-confidential site responses need project/client-specific records and access, not a global PI profile overwrite. Separate original observation and synthesized interpretation.

For every proposed domain entity: define fields, single/multi cardinality, record links, required constraints, status enum, owner, timestamps, source URL/label, source date and last verification when applicable. Display selected columns in the table, others in details; don't collect unnecessary sensitive personal details. Computed values show formula and stale/missing-input state. **No patient-level data anywhere in these templates.**

All edits: exact preview + Save/Ignore, accessible changed-field indication and immutable field history. An expressly authorized type/field/source/expiry standing grant can cover future qualifying writes; granting a task does not grant a generic DB write or external email. AI reads are subject to AI permissions, not the human owner's broader view. No automatic unapproved schema changes.

## 6. ChatGPT and scheduling contract

**Exclusive ChatGPT responsibilities:** web search, source discovery, company/funding/competitor monitoring, literature evaluation, document analysis and generation of narrative weekly/monthly reports. A TrialAgents app must not pretend its bounded `frontend-js` or isolated scheduled QuickJS performs these activities. User can run a manually launched ChatGPT workflow from an approved template recipe.

**Proposed recipe format (documentation; not yet supported as first-class JSON schema):**
- `purpose` and query/analysis instructions, `inputRecords` (authorized table/field subsets), `sourcesAndInclusion`, `cadenceSuggestion` (daily/weekly/monthly/manual), `dedupeKey` (DOI, company+event+date, grant URL, etc.), `proposedOutput` (records/report), `writeScope`, `notificationPolicy`, `errorHandling`.
- Offer a ChatGPT Task *after* app/template save and explicit permission check. If the user and host support a task with TrialAgents MCP, create it using the ChatGPT scheduling system; link the verified task if an exposed lifecycle contract exists. If not, show a copyable/run-now prompt. **No unverified task IDs, phantom status dashboards or claim of unattended writeback.**
- At each research run, read fresh permitted TrialAgents records, search cited sources, use inclusion/exclusion and dedupe, distinguish facts/analysis, attach source/title/date and confidence, propose changes or save only under a still-valid single-type grant. Record run outcome if available. Draft reports must distinguish source-backed facts from interpretation and show data cutoff.
- Deterministic TrialAgents workers may calculate aggregates, due flags and internal reminders within current grants, but cannot browse the web, call an LLM, or invoke the generic connector as a worker in the existing implementation.
- Every intelligence app **works manually** if scheduled Tasks, external websites or AI access are unavailable. No mandatory integration.

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
6. Research/LLM/report screen only offers verified ChatGPT handoff, properly cited result with report save if authorized, plus a manual fallback. Recurring monitoring only advertised after real Task/plugin integration test.
7. Demo screenshots: four truthful frames per app — dashboard; records; action; resulting chart/report — at desktop and at least one narrow-screen pass, with clearly fictitious data.
8. No patient data and no required external service. No compliance certification, live integration or email delivery claimed without acceptance evidence.
