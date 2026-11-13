# TrialAgents platform and app performance recommendations

**Date:** 13 November 2026 (Europe/Berlin). **Status:** recommendations consolidated from the platform-opening and in-app experience review; implementation is not authorized by this document alone. Saving this document changes no runtime, template, data, permissions or integration.

**Evidence baseline:** source inspected at `4e10a34fe7b151a8836fadc3e4c2b62cc04c96de`; planning refreshed against `05e8ea0` before writing. The intervening changes did not modify the inspected runtime. Live public assets and local synthetic fixtures were checked; authenticated production timings and Render capacity metrics were not captured. Performance ratings are expected impact, not measured production speed gains.

## Reading the recommendations

- **Performance:** Very high / High / Medium / Low; **perceived** means responsiveness or clarity without necessarily reducing request duration.
- **Complexity:** Low / Medium / High; combinations indicate intermediate scope. Rough effort in the platform-opening table is engineering time including focused verification, not a delivery commitment.
- **Template effect:** **Automatic** = compatible platform change benefits saved apps; **Versioned** = new template source/version plus deliberate upgrade of saved copies; **Design-time** = add to a planned app before building. All require relevant regression checks.
- Every app inherits applicable platform recommendations. App sections record the additional adoption work; they do not call for duplicating platform infrastructure inside templates.
- **Observed** findings come from code or diagnostics. **Unprofiled** apps have an identified runtime dependency, not a measured app-specific bottleneck. Repository seed/package status does not independently establish current production catalog approval.

## 1. Platform

### 1.1 Platform opening and background refresh

Ordered by expected speed impact, with loading-indicator clarity last because it does not itself speed up requests.

| ID | Current status | Issue | Recommendation | Performance impact | Complexity | Feature impact | Integration / template impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P01 | Observed: Home builds card previews before returning; workspaces processed sequentially. | Data reads and previews for candidates delay the final page. | Return card metadata first; select the final page before previews; load visible previews afterward and batch repeated reads. | **Very high**, increases with apps/workspaces. | **Medium–high**, 2–4 days. | Cards become usable before preview details; retain previews, sorting, search, totals and pagination. | **Automatic**; evolve shared web/MCP responses compatibly; no saved template edits. |
| P02 | Observed: startup loads schemas, views and full archive details; views repeat schema work. | Home and direct app opening perform unrelated work. | Load schemas/views only on relevant screens; use a cheap authorized archive count, then details on expansion. | **High**, especially with many tables/archives. | **Low–medium**, 0.5–1 day. | Same sections and archive actions; details load on demand. | **Automatic**; preserve legacy routes and include-archived MCP behavior. |
| P03 | Observed: account/Home rechecks run every 30 seconds, on focus and visibility changes. | Independent checks can overlap and trigger full Home/archive refreshes. | Coordinate triggers; reuse identical in-flight reads; separate lightweight access/version checks from full content refresh; invalidate on relevant changes. | **High** on return visits; less repeated server work. | **Medium**, 1–2 days. | Retain usable content during checks; preserve timely access revocation and explicit Refresh. | **Automatic**; host-aware behavior for standalone, ChatGPT and Claude; never replay writes. |
| P04 | Observed: hashed JS/CSS use `max-age=0`; static assets follow session middleware. | Repeat visits revalidate immutable assets and can invoke session/database work. | Serve public fingerprinted assets before session middleware with long-lived immutable caching; keep HTML revalidated. | **Medium**, strongest on repeat visits. | **Low**, 0.25–0.5 day. | No feature change; fresh HTML selects new asset hashes. | **Automatic**; no caching of authenticated records, bearer links or private responses. |
| P05 | Observed: main web entry eagerly imports many platform/editor sections. | Initial download and parsing include unused screens. | Split sections into lazy-loaded chunks; load editors and secondary pages when opened. | **Medium**, strongest on first visits/slower devices. | **Medium**, 1–2 days. | First visit to an unloaded section may show a local placeholder. | **Automatic** for web; validate embed packaging separately; template source unchanged. |
| P06 | Observed: global bar tracks every pending API request after 150 ms. | Background work makes a usable screen look continuously busy. | Reserve global progress for foreground navigation/actions; keep routine checks quiet; show local preview/loading states. | **High perceived**, negligible direct latency gain. | **Low**, 0.25–0.5 day. | Changes loading feedback only; preserve errors and visible save progress. | **Automatic**; shared indicator behavior across supported hosts. |

### 1.2 Shared app runtime and interaction

Standard trackers already have a persistent iframe, 120-second instance-local snapshots, a 16-page bound, neighboring-tab/next-page prefetch and selected in-flight navigation deduplication. Extend these concepts deliberately: the repository's 24 seed packages use custom source, not that recognized standard-tracker fast path.

| ID | Current status | Issue | Recommendation | Performance impact | Complexity | Feature impact | Integration / template impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P07 | Observed: inspected custom apps load broad role/table sets before handling events. | Small clicks and Settings changes reload unrelated data; larger tables require more reads. | Provide shared screen-data declarations/helpers: active page, required summaries and on-demand details. Use complete authorized calculation inputs where necessary. | **Very high** for custom navigation and filtering. | **Medium–high**: shared capability plus adoption. | Preserve complete totals, forecasts and dependency calculations; never use one page as a full dataset. | **Versioned** for existing custom apps; **Design-time** for planned apps; preserve role contracts and field IDs. |
| P08 | Observed: standard renders reuse metadata in a database session; custom reads repeatedly validate runtime/metadata. | Repeated permission/schema work and transaction overhead increase each interaction's cost. | Extend request-local metadata reuse and suitable batching to custom execution; retain actor/tool scoping and uncached final checks. | **High**, subject to production profiling. | **Medium–high**. | No intended behavioral or authorization change. | **Automatic** with backward-compatible capability responses; no template rewrite expected; retain database RLS. |
| P09 | Observed: custom navigation/menu actions execute server-side; standard-only caching does not cover them. | Presentation-only clicks wait for execution; repeated read navigation cannot use the standard fast path. | Add opt-in local presentation actions and bounded authorized snapshots for explicitly declared read-only navigation; coalesce superseded reads. | **High** for interaction responsiveness. | **Medium–high**. | Menus/panels and eligible navigation respond immediately; preserve draft guards and freshness. | **Versioned / Design-time**; distinguish reads from saves, approvals, sends and connector actions; never infer all clicks are safe to cache. |
| P10 | Observed: standalone app resolution returns metadata, followed by a render request. | Two serial loading stages before the app is usable. | Return metadata plus first authorized view in one supported open operation and consume it directly, including route context. | **Medium** for app opening. | **Low–medium**. | Same first screen, fewer loading stages; retain existing update notices. | **Automatic** with additive response support; standard trackers already support initial output on some paths. |
| P11 | Observed: each custom invocation forks a sandbox process; two published custom executions allowed concurrently per server process. | Process/WASM startup repeats; overlapping users can receive busy errors. | Evaluate a bounded warm-worker pool and fair queue, with a fresh isolated context per execution; preserve deadlines, memory and capability limits. | **Medium** per interaction; **High under contention**. | **High**. | Better continuity under load; bounded waiting instead of avoidable immediate rejection. | **Automatic**; no template API changes expected; prevent cross-run state leakage; size from metrics rather than blindly raising concurrency. |
| P12 | Observed: saves trigger a full rerender and clear standard snapshots; temporary post-save reload errors can be suppressed. | Successful saves can feel slow or leave unclear refresh state. | Distinguish saved receipt from refreshed view; retain inputs/screen; expose safe reload retry; refresh only affected data when dependencies are known. | **High usability**, **Medium** latency reduction. | **Low–medium** for clarity/retry; **Medium–high** for selective refresh. | Explicit “saved, refresh pending/failed”; no false success or mutation replay; retain authoritative recalculation. | Basic handling **Automatic**; dependency-aware refresh **Versioned / Design-time**; reconcile receipts across all hosts. |
| P13 | Observed: frame repaint replaces root content; some focus/scroll restoration already exists; custom navigation resets several states. | Context can be lost or rebuilt unnecessarily between screens. | Extend stable focus, selection, scroll and per-screen filter retention; keep usable content while loading; use shared local loading/error states. | **Medium perceived**, smaller direct speed gain. | **Low–medium** initially. | Improves continuity without changing business actions; respect intentional reset and dirty-draft rules. | Shared host fixes **Automatic**; custom state/region conventions may need **Versioned / Design-time** adoption. |

### 1.3 Measurement, compatibility and release scope

| ID | Current status | Issue | Recommendation | Performance impact | Complexity | Feature impact | Integration / template impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P14 | Existing logs record duration, SQL count, database time, pool wait and metadata hits; local diagnostics available. | No authenticated production baseline establishes exact savings or server-capacity cause. | Measure open, tab/filter, save and return-to-tab paths before/after; separate foreground, prefetch, database, sandbox and transport costs. | **Indirect high**: targets real bottlenecks. | **Low–medium**. | No feature change; do not log records, secrets or draft content. | Verify web plus actual ChatGPT/Claude flows; upgrade hosting only if measured capacity warrants it. |
| P15 | Guidance already requires bounded active reads, exact saves and compatible runtime behavior. | Custom templates can still use broad-read patterns; template publication does not upgrade saved copies. | Add measurable custom-app budgets, screen dependency/action declarations and upgrade checks to shared guidance; pilot, then release immutable template versions. | **High cumulative** across future apps. | **Medium** plus per-template adoption. | Preserve app identity, customizations, data, access, audit history and existing workflows. | **Versioned / Design-time**; synchronize guidance through existing mechanisms; catalog approval, deployment and installed-app upgrade remain distinct. |

## 2. Apps

### 2.1 Runway — `life.cash-runway` 2.1.0

| ID | Current status | Issue | Recommendation | Performance impact | Complexity | Feature impact | Integration / template impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RW1 | Observed: empty fixture performs 13 table reads on open, Settings navigation and menu action. | Every interaction reloads broad financial/support data. | Adopt P07/P09; separate Settings and lists from forecast dependencies; load editor/reference details only when needed. | **Very high**. | **Medium–high**. | Same screens and calculations; faster non-calculation interactions. | **Versioned**; preserve `runway.*`, shared role mappings and read-only Programs input. |
| RW2 | Forecast/scenario code calculates from authorized inputs during execution. | Unchanged inputs can repeat calculation work; partial-page shortcuts would change results. | Reuse versioned calculation results only while all input/data/access versions remain valid; refresh dependent results after confirmed edits. | **High**, to verify with populated scenarios. | **High**. | Preserve currency rules, complete forecasts, scenario comparisons and frozen snapshots. | **Versioned** plus platform support; invalidate when linked Programs/other authorized inputs change. |
| RW3 | Filters, details and edits run through the custom state/host flow. | Context and post-save refresh can interrupt finance work. | Adopt P12/P13; retain selected scenario, period, filters and scroll; distinguish confirmed save from reload failure. | **High perceived**. | **Medium**. | Preserve exact review, stale-version protection and draft recovery. | **Versioned** for template state behavior; platform save fixes benefit automatically. |

### 2.2 Programs — `life.project-oversight` 2.1.0

| ID | Current status | Issue | Recommendation | Performance impact | Complexity | Feature impact | Integration / template impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PG1 | Observed: empty fixture performs 10 table reads on open, Settings navigation and menu action. | Settings, ordinary lists and reports share broad data loading. | Adopt P07/P09; separate active-screen reads from timeline/critical-path inputs. | **Very high**. | **Medium–high**. | Preserve complete dependencies whenever critical-path calculations run. | **Versioned**; keep shared programs and read-only Runway integration compatible. |
| PG2 | Timeline, dependency, report and editing workflows use the same custom execution path. | Unchanged calculations and full post-save work can repeat. | Reuse results against explicit input versions; refresh affected views; retain selected program, timeline position and filters. | **High** performance/usability. | **Medium–high**. | Frozen leadership reports stay frozen; reviewed slips and gate actions remain exact. | **Versioned**; retain `programs.*` output contracts and linked cash-data freshness. |

### 2.3 Contracts — `life.contracts` 1.0.0

| ID | Current status | Issue | Recommendation | Performance impact | Complexity | Feature impact | Integration / template impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CT1 | Observed: empty fixture performs 9 table reads on open, Settings navigation and menu action. | Register, obligations, families and support data reload together. | Adopt P07/P09; page the register; load agreement/document details on demand; request appropriate family/obligation summaries separately. | **Very high**. | **Medium–high**. | Preserve complete family totals, deadlines and verified/unverified distinctions. | **Versioned**; retain shared agreements, `contracts.obligations` output and Programs milestones. |
| CT2 | Saves and details use common rerender flow. | Unrelated summaries reload; failed refresh can be unclear. | Apply P12/P13; refresh affected agreement/family/obligations and keep detail/filter position. | **High usability**, **Medium** speed. | **Medium**. | Preserve source quotes, document verification, reviewed edits and receipts. | **Versioned** for targeted dependencies; platform document permissions and original versions unchanged. |

### 2.4 Fundraise — `life.investor-crm` 2.0.0, open PR #137

| ID | Current status | Issue | Recommendation | Performance impact | Complexity | Feature impact | Integration / template impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FR1 | Source inspected in PR #137: loads 11 roles before event handling; not merged/released at review. | Broad-read pattern will repeat across pipeline, Settings and engagement. | Adopt P07/P09 before release; load active pipeline page, needed summaries and on-demand engagement separately. | **High expected**; no production measurement. | **Medium–high**. | Keep signed-commitment totals, reviewed moves and investor comparisons correct. | **Design-time / PR revision**; preserve `fundraise.v1`, `dataroom.v1` and Programs integrations. |
| FR2 | Shared save/state handling available; custom screen state owns pipeline context. | Repeated actions can lose working context or perform redundant refresh. | Apply P12/P13 and guidance budgets before merge. | **High perceived**, **Medium** speed. | **Medium**. | Preserve round, pipeline filters and draft recovery; sends remain separately authorized. | **Design-time**; no migration of existing Investor CRM 1.0.1 implied. |

### 2.5 CRO Selection — existing 1.0.1 and planned replacement

| ID | Current status | Issue | Recommendation | Performance impact | Complexity | Feature impact | Integration / template impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CS1 | Existing custom package unprofiled; replacement scope approved/scoped in current plan. | Broad request/vendor/bid/exchange loading could reproduce the same issue. | Profile existing app; make P07/P09/P15 requirements for the replacement; load bids, documents, messages and submissions when needed. | **High expected**. | **Medium–high**. | Preserve complete bid comparisons, scoring and award/handoff workflows. | Existing source **Versioned**; new build **Design-time**; retain external exchange review and shared contracts. |
| CS2 | Planned workflow includes supplier communication and reviewed handoffs. | Generic cached/retried interactions could replay external actions. | Keep cached navigation separate from send, accept, award and connector actions; use receipts and targeted refresh. | **Medium** speed; **High** reliability. | **Medium**. | No weakening of approvals or delivery status. | **Design-time**; preserve exchange, documents and downstream app contracts. |

### 2.6 Data Room, including Diligence Q&A — planned `life.data-room` 1.0.0

**Planning correction:** current main now contains the approved Data Room scope. It includes Diligence Q&A; BT2-12 is no longer a separate app. This supersedes the earlier conversation's separate-app grouping.

| ID | Current status | Issue | Recommendation | Performance impact | Complexity | Feature impact | Integration / template impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DR1 | Approved scope; platform room extension and app build still planned. | Loading all documents, engagement, recipients and Q&A upfront could be costly. | Apply P07/P09/P15 during platform-extension and app design; page indexes/status, load document/Q&A details on demand. | **High expected**. | **Medium–high** incremental adoption. | Keep hosted rooms, levels, version history and room-based Q&A; no separate Q&A app. | **Design-time**; external exchange + room extension; preserve Fundraise/BD `dataroom.v1` consumers. |
| DR2 | Planned private document access, tracking and reviewed email actions. | Caching could obscure access changes or replay sends/approvals. | Scope reads to viewer/room/access version; keep views/download tracking authoritative; exclude sends and approval actions from replay. | **Medium** speed; **High** reliability. | **Medium–high**. | Preserve access revocation, view/download evidence and exact send confirmation. | **Design-time**; no publicly cached private documents or bearer links. |

### 2.7 Investor Updates — planned BT2-06

| ID | Current status | Issue | Recommendation | Performance impact | Complexity | Feature impact | Integration / template impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IU1 | Planned app; no app-specific runtime measured. | Report/KPI, document and recipient data could all load on every action. | Adopt P07/P09/P15; load selected period/report and summary first, recipient/document detail on demand. | **High expected**. | **Medium** incremental adoption. | Preserve approved snapshots and reporting completeness. | **Design-time**; retain finance/shared-data contracts and external exchange where implemented. |
| IU2 | Planned sharing and assistant-assisted reporting. | Navigation retries must not become repeat publications or deliveries. | Apply P12/P13 and separate cached reads from confirmed publication/send actions. | **Medium** speed; **High** usability/reliability. | **Medium**. | Keep drafts, explicit confirmation and receipt-based retries. | **Design-time**; no new automation or email permissions. |

### 2.8 Other existing templates — each app

These packages are in the repository seed and use custom source, but were **not individually performance-profiled**. Their common recommendation is platform rollout first (P08/P10/P11/P12), then measured P07/P09/P13 adoption only where warranted. Updating a catalog package never silently rewrites an installed/customized copy.

| App / seed version | Current status | Issue | Recommendation | Performance impact | Complexity | Feature impact | Integration / template impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Inventory Management 1.0.2 | Custom; unprofiled. | Shared custom-runtime overhead; screen costs unknown. | Platform fixes, then profile active-page/detail reads. | **Medium–high potential**. | Platform shared; **Medium** adoption. | Preserve inventory values and edit history. | **Automatic + Versioned**; retain bindings/automations; planned Lab Inventory inherits guidance. |
| PI Network Management 1.0.1 | Custom; unprofiled. | Same runtime exposure. | Platform fixes; measure directory/detail navigation. | **Medium–high potential**. | Shared + **Medium**. | Preserve directory completeness and access. | **Automatic + Versioned**; stable identities and bindings. |
| Grant Pipeline 1.0.1 | Custom; unprofiled. | Same runtime exposure. | Profile list/detail/report reads; adopt only measured fixes. | **Medium–high potential**. | Shared + **Medium**. | Preserve deadlines, totals and reports. | **Automatic + Versioned**; planned Grants inherits guidance. |
| Site Feasibility Management — Sponsor 1.1.1 | Custom; unprofiled. | Same runtime exposure. | Profile shortlist and detail navigation after platform fixes. | **Medium–high potential**. | Shared + **Medium**. | Preserve complete comparisons and evidence. | **Automatic + Versioned**; planned Site Finder must preserve role mappings. |
| Experiment Notebook 1.2.2 | Custom; unprofiled. | Same runtime exposure. | Profile selected record/document loading; defer unused detail. | **Medium–high potential**. | Shared + **Medium**. | Preserve originals, history and drafts. | **Automatic + Versioned**; planned Lab Records inherits guidance. |
| Sponsor RFP Management 1.0.1 | Custom; unprofiled. | Same runtime exposure. | Profile request/bid pages; use platform action boundaries. | **Medium–high potential**. | Shared + **Medium**. | Preserve reviews and full bid comparisons. | **Automatic + Versioned**; replacement CRO Selection migration separate. |
| Partnership Tracker 1.1.1 | Custom; unprofiled. | Same runtime exposure. | Profile pipeline/detail reads and state retention. | **Medium–high potential**. | Shared + **Medium**. | Preserve pipeline stages and drafts. | **Automatic + Versioned**; planned BD Pipeline inherits guidance. |
| Client Signals & CRM 1.0.1 | Custom; unprofiled. | Same runtime exposure. | Profile company/signal lists and on-demand evidence. | **Medium–high potential**. | Shared + **Medium**. | Preserve signal provenance and freshness. | **Automatic + Versioned**; research/email automation authority unchanged. |
| Trial Regulatory Submission 1.0.1 | Custom; unprofiled. | Same runtime exposure. | Profile active tracker and document/detail loading. | **Medium–high potential**. | Shared + **Medium**. | Preserve submission facts and histories. | **Automatic + Versioned**; planned Regulatory inherits guidance. |
| Literature Radar 1.2.2 | Custom; unprofiled. | Same runtime exposure. | Profile paged findings and on-demand source/report reads. | **Medium–high potential**. | Shared + **Medium**. | Preserve source-backed reports and completeness. | **Automatic + Versioned**; planned Landscape inherits guidance. |
| CRO Oversight 1.2.1 | Custom; unprofiled; v2 adaptation planned. | Same runtime exposure. | Profile overview vs detail reads; adopt shared guidance for adaptation. | **Medium–high potential**. | Shared + **Medium**. | Preserve deliverables, KPIs and issue records. | **Automatic + Versioned / Design-time**; bindings and automations retained. |
| Publication Management 1.0.1 | Custom; unprofiled. | Same runtime exposure. | Profile active publication list/detail screens. | **Medium–high potential**. | Shared + **Medium**. | Preserve status, evidence and history. | **Automatic + Versioned**; no integration redesign assumed. |
| Biotech Hiring & Resource Management 1.4.2 | Custom; unprofiled. | Same runtime exposure. | Profile resource views, editing and filter retention. | **Medium–high potential**. | Shared + **Medium**. | Preserve staffing/capacity calculations and drafts. | **Automatic + Versioned**; retain shared identities and permissions. |
| CRO Resource Planning 1.0.2 | Custom; unprofiled. | Same runtime exposure. | Profile timeline/capacity dependencies separately from lists. | **Medium–high potential**. | Shared + **Medium–high**. | Keep complete inputs for capacity calculations. | **Automatic + Versioned**; existing bindings unchanged. |
| Investor CRM 1.0.1 | Existing seed version; Fundraise 2.0.0 is separate open PR. | Same runtime exposure; replacement does not upgrade saved copies. | Platform fixes now; profile existing copies; follow Fundraise scope for replacement. | **Medium–high potential**. | Shared + **Medium**; replacement separate. | Preserve existing contacts, commitments and customizations. | **Automatic + Versioned**; deliberate data/source upgrade required. |
| RFP Management — CRO 1.2.1 | Custom; unprofiled. | Same runtime exposure. | Profile request/proposal/detail reads after platform fixes. | **Medium–high potential**. | Shared + **Medium**. | Preserve proposal completeness and reviewed actions. | **Automatic + Versioned**; no integration redesign assumed. |
| Site Feasibility Management — CRO 1.2.1 | Custom; unprofiled. | Same runtime exposure. | Profile selected feasibility pages and comparisons. | **Medium–high potential**. | Shared + **Medium**. | Preserve evidence and complete comparisons. | **Automatic + Versioned**; stable record relationships. |
| Investigator CRM 1.0.1 | Custom; unprofiled. | Same runtime exposure. | Profile list/detail reads; retain selection/filter state. | **Medium–high potential**. | Shared + **Medium**. | Preserve professional records and access. | **Automatic + Versioned**; planned Site Finder migration separate. |
| Sponsor Updates — CRO 1.0.1 | Custom; unprofiled. | Same runtime exposure. | Profile selected report and supporting-record reads. | **Medium–high potential**. | Shared + **Medium**. | Preserve approved/frozen reports and drafts. | **Automatic + Versioned**; no automatic sends or schedule changes. |
| Trial Monitoring & PV Oversight — Sponsor 1.1.1 | Custom; unprofiled. | Same runtime exposure. | Profile active oversight pages and supporting details. | **Medium–high potential**. | Shared + **Medium**. | Preserve aggregate oversight records and existing scope limits. | **Automatic + Versioned**; access and automations unchanged. |

### 2.9 Other planned biotech apps — each app

These rows apply the conversation's shared future-template recommendation; they are **design requirements, not newly diagnosed defects**. Development should reuse P07/P09/P12/P13/P15, retain complete calculations, and keep external side effects outside cached/replayed navigation. Complexity below is incremental performance adoption, not the whole app build.

| App | Current status | Issue / risk | Recommendation | Performance impact | Complexity | Feature impact | Integration / template impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BD Pipeline (07) | Planned Partnership Tracker adaptation. | Repeating broad-read custom pattern. | Shared screen-data/local-action contract from first build. | **High potential**. | **Medium**. | Preserve deal pipeline and reporting semantics. | **Design-time**; shared organizations/people and planned Data Room outputs. |
| Lab Inventory (09) | Planned Inventory Management adaptation. | Same design risk. | Active-page/details loading and safe targeted refresh. | **High potential**. | **Medium**. | Preserve inventory totals and edit integrity. | **Design-time**; retain shared-data and action contracts. |
| Landscape (10) | Planned; absorbs Literature Radar intent. | Large findings/evidence sets may repeat on every action. | Paged findings, on-demand evidence and complete scoped summaries. | **High potential**. | **Medium–high**. | Preserve source provenance and freshness. | **Design-time**; planned Intel/research integrations remain optional and authorized. |
| Trial Finance (11) | Planned. | Financial totals cannot rely on a displayed page. | Separate lists from complete versioned calculation inputs. | **High potential**. | **Medium–high**. | Preserve accrual/invoice/budget correctness. | **Design-time**; retain planned Runway/shared-data contracts. |
| Lab Records (13) | Planned Experiment Notebook adaptation. | Record/document content could load unnecessarily. | Selected-record/document reads and persistent draft context. | **Medium–high potential**. | **Medium**. | Preserve originals, versions and evidence. | **Design-time**; document and shared-data permissions unchanged. |
| Board (14) | Planned. | Packs/history could be fetched for every action. | Selected pack first; on-demand supporting material. | **Medium–high potential**. | **Medium**. | Preserve frozen/approved reports and resolutions. | **Design-time**; planned finance/report dependencies remain version-aware. |
| IP Portfolio (15) | Planned. | Broad family/history reads could repeat. | Screen-specific lists and on-demand family details. | **Medium–high potential**. | **Medium**. | Preserve deadlines and complete family summaries. | **Design-time**; no new integration authority. |
| Site Finder (17) | Planned feasibility/Investigator CRM combination. | Search, evidence and comparisons could load together. | Paged shortlists, on-demand evidence and scoped comparisons. | **High potential**. | **Medium–high**. | Preserve comparison completeness and provenance. | **Design-time**; planned Intel/exchange reads separate from confirmed sends. |
| Deal Comps (18) | Planned. | Comparison datasets may be reloaded unnecessarily. | Separate selection/navigation from complete comparison calculations. | **Medium–high potential**. | **Medium–high**. | Preserve valuation assumptions and evidence. | **Design-time**; shared roles and source permissions retained. |
| Grants (19) | Planned Grant Pipeline adaptation. | Broad call/application/report reads could repeat. | Active pipeline page plus on-demand reports and sources. | **Medium–high potential**. | **Medium**. | Preserve deadlines, provenance and summaries. | **Design-time**; research/notification authority unchanged. |
| Regulatory (20) | Planned submission-template reshaping. | Document and commitment details could load upfront. | Selected tracker page and on-demand source documents. | **Medium–high potential**. | **Medium**. | Preserve commitments, histories and evidence. | **Design-time**; document/shared-data contracts retained. |

Programs, Runway, Contracts, Fundraise, CRO Selection, Investor Updates and Data Room are covered individually above. CRO Oversight is covered with its existing template. Diligence Q&A is included only under Data Room, consistent with the latest approved scope.

## 3. Recommended implementation order

1. **Baseline:** P14; record authenticated open, Home, tab/filter and save timings using existing logs plus browser/host evidence. Do not make a hosting upgrade the first assumption.
2. **Platform quick improvements:** P02, P03, P04, P06, P10 and basic P12/P13. For startup alone this matches the first review's initial-release recommendation.
3. **Core read efficiency:** P01 and P08; validate permission boundaries and complete results. These are shared changes rather than per-app rewrites.
4. **Custom-app pilot:** P07/P09/P15 on Runway, then Programs and Contracts; revise Fundraise before release. Add requirements to CRO Selection and Data Room while still being designed/built.
5. **Further optimizations:** P05 and measured P11; selective calculation/refresh reuse after dependency contracts are explicit. Expand to other templates using profiling, not assumed defects.

**Easiest implementation first:** progress/asset caching → startup deferral and save/reload clarity → coordinated refresh and combined app-open → section splitting and state retention → Home/custom read restructuring → dependency-aware caching/local actions and isolated worker pooling. Actual order may change with measurements.

## 4. Verification and compatibility requirements

- Measure time to usable Home/app, warm/cold navigation, save acknowledgement and save-to-refreshed-view separately. Track request/SQL count, database/pool time and sandbox time; no promised percentage gains before measurement.
- Test populated multi-table apps, multiple workspaces, overlapping users, slow networks, expired views, access revocation during a read, changed schemas and stale record versions.
- Verify web, embedded ChatGPT and embedded Claude independently; browser fixtures alone do not establish real-host parity. Preserve host-specific auth, routing, iframe messaging and capability fallback.
- Keep full totals, forecasts, comparisons and dependency calculations correct. Never label a partial read complete, substitute missing values with zero, or change frozen snapshots.
- Retain exact reviewed writes, current permissions, RLS, optimistic versions, audit history and immutable receipts. Never cache mutations or replay external sends/approvals because a read timed out.
- Keep authorized data instance-scoped and bounded. No cross-user/app record cache, longer permission lifetime, public caching of private content, or persistent browser record cache is implied.
- Preserve the mounted app and local drafts on transient failures; clear protected data on actual revocation. A successful save receipt and a failed refresh are distinct outcomes.
- Release changed custom templates as new immutable versions. Installed copies keep their app IDs, bindings, records and customizations unless a deliberate compatible upgrade is performed. Platform deployment, catalog approval and saved-app upgrade are separate steps.
- No UI redesign, removal of app features, change to tracking, new connector dependency, automation activation or communication permission is included in this performance scope.

## 5. Evidence and source map

### Recorded diagnostics

| Check | Observation | Limit |
| --- | --- | --- |
| Home, five apps sharing one table | 32 database queries. | Local synthetic fixture; not production latency. |
| Home, twenty apps sharing one table | 62 database queries. | Same limitation. |
| Home, twenty apps on distinct tables | 175 database queries. | Same limitation. |
| Account Home, two workspaces / forty apps / twenty displayed | 237 database queries. | Same limitation; previews can be built before final account pagination. |
| Live main JavaScript during review | 878,183 bytes decoded; 249,154 bytes transferred with Brotli; `max-age=0`. | Asset snapshot, not end-user connection timing. |
| Runway / Programs / Contracts | 13 / 10 / 9 `records.read` calls for open, Settings navigation and a menu action in empty fixtures. | Capability calls, not browser requests or SQL-query counts; optional unbound roles are not read. |
| Seed template classification | 24 seed packages use custom source; none recognized by `standardTracker`. | Repository seed, not a live catalog query or per-template performance profile. |
| Fundraise PR #137 | Eleven data roles loaded before event handling. | Source observation; no production timing. |

### Implementation references

- [Web startup](../../src/web/main.tsx), [Home client](../../src/shared/HomePanel.tsx), [Home backend](../../src/workspace/home.ts), [archive loading](../../src/shared/ArchivedItems.tsx).
- [Refresh triggers](../../src/shared/useAccessRecheck.ts), [global activity bar](../../src/shared/WorkspaceActivity.tsx), [server/static routing](../../src/server/index.ts), [session middleware](../../src/server/auth.ts).
- [App resolution](../../src/workspace/apps.ts), [standalone app](../../src/shared/StandaloneApp.tsx), [frontend runtime and saves](../../src/shared/FrontendCodeRuntime.tsx), [frame painting](../../src/shared/frontend-frame.ts).
- [Custom/standard server paths and concurrency](../../src/workspace/service.ts), [sandbox process](../../src/foundation/runtime.ts), [metadata reuse](../../src/db/read-metadata.ts), [database wrapper](../../src/db/database.ts).
- [Existing tracker optimizations](../tracker-performance.md), [snapshot cache](../../src/shared/tracker-cache.ts), [in-flight reads](../../src/shared/frontend-reads.ts), [performance fixture](../../tests/tracker-performance.test.ts), [account-page fixture](../../tests/page-performance.test.ts).
- [Runway source](../../templates/source/cash-runway/cash-runway.source.js), [Programs source](../../templates/source/project-oversight/programs.source.js), [Contracts source](../../templates/source/contracts/contracts.source.js), [Fundraise PR](https://github.com/tarous89/trialy/pull/137) and [reviewed Fundraise source](https://github.com/tarous89/trialy/blob/9eb6d173c43a9f6fa9ed88f6a1bae19cfc959243/templates/source/investor-crm/fundraise.source.js#L80).
- [Current catalog contract](../TEMPLATE_CATALOG.md), [seed packages](../../templates/catalog-seed.json), [authoring guidance](../../templates/TEMPLATE_AUTHORING.md), [current biotech plan](../product/app-template-blueprints/BIOTECH_v2.md), [Data Room scope including Q&A](../product/app-template-blueprints/apps/DATA_ROOM.md), [modular app/shared-data contract](../product/MODULAR_APPS_AND_SHARED_DATA.md).

This document consolidates recommendations and compatibility effects. It does not replace the governing access, write, template or integration contracts.
