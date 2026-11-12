# Programs 2.0.0 (`life.project-oversight`)

Milestones, dependencies, risks and decisions across all programs. Scope: [PROGRAMS.md](../../../docs/product/app-template-blueprints/apps/PROGRAMS.md). It follows [modular apps and shared data](../../../docs/product/MODULAR_APPS_AND_SHARED_DATA.md). It replaces Project Oversight 1.0.1 as a new major version; the released 1.0.1 catalog JSON is unchanged and its source package is archived byte-for-byte under [`archive/1.0.1/`](archive/1.0.1/). Saved 1.0.1 apps are not migrated.

## Files

| File | Purpose |
| --- | --- |
| `programs.source.js` | The `frontend-js` renderer: seven screens, critical path, slips, downstream preview, gates, RAID, frozen reports, Runway link; reviewed `records.propose` writes. It starts with the single-line `templateLayoutSchema` declaration. |
| `programs.css` | Vivid plum theme (`#795094`) with a graphite hero (`#2B3546`), light canvas, one page scroll, Gantt scrolling inside its card, responsive 390–1440 px. |
| `catalog.metadata.json` | Catalog fields: options, instructions and the MCP-served documentation (data and interaction contracts, lifecycle, limitations, examples, tasks). |
| `schema.example.json` | Installer schema, registered in `templates/catalog-installers.json`: eight tables at install plus two optional connected roles (see below). |
| `demo_data.json` | Fictional preview records only: two programs, 25 plan items (also the hand-computed critical-path plan in the tests), one fictional Runway snapshot. Never seed it into a workspace. |
| `programs.preview.html` | Generated offline preview (gallery screenshot source), fixed as of 11 Nov 2026. |
| `QA.md` | Commands, results, hand calculations, acceptance criteria and unverified boundaries. |
| `AUTOMATION_RECIPES.md` | The three optional automations and the no-automation path. |

Edit the source, CSS and metadata, then run `node scripts/build-project-template.mjs`. This regenerates `templates/apps/life.project-oversight-2.0.0.json` and the preview; `--check` runs in `npm run build`. Do not edit a released version: publish a new version and archive the previous package first. After a catalog or preview change, regenerate the gallery screenshot and manifest entry (`node scripts/build-template-screenshots.mjs`).

## Roles, shared data and modularity

`tableMap` uses stable role keys (rule 5):

- **Core shared tables** (core data contract v1, [`templates/core-contract/v1.json`](../../core-contract/v1.json)): `programs` (Programs owns the optional `health`, `health_rationale` and `health_date` fields) and `people` (optional, read only here; owner fields stay plain-text names, with a "Pick from People" helper when the table is connected).
- **App tables:** `programs.plan_items`, `programs.slips`, `programs.decisions`, `programs.raid`, `programs.updates`, `programs.reports`, `programs.settings` (one row).
- **App outputs for other apps:** key milestones (`programs.plan_items` with `is_key`, read by Runway) and frozen `programs.reports`.
- **Partner output, read only:** `runway.month_closes` (Runway 2.1 snapshots), never created or written by Programs.

At install the platform offers the explicit shared-or-separate choice. When a live app (for example Runway) already binds a compatible `programs` table, reusing it is the default: no second programs table is created, and the three Programs health fields are added to it as optional fields in the same installation. `people` and `runway.month_closes` are connected when present and never created. "Separate data" creates a new programs table (use a separate app in a restricted project for a confidential program).

Programs works alone; rule 3 degradation:

- **No Runway, or Runway's closes not connected:** cash markers are hidden with a one-line note.
- **Runway snapshots unreadable or read partially:** markers hidden with a note; the timeline is unaffected.
- **Runway archived:** its snapshots stay readable; markers keep their "Runway snapshot <month>" label.
- **Archived or deleted program or predecessor:** "(archived)" or "Program unavailable"/"Item unavailable"; the reference is kept when the record is edited; a broken chain is stated.

## Calculation contract

- **As-of date:** today's date from the app runtime (verified in production QuickJS: `new Date()` returns the host date). Previews and tests pin `asOfOverride`. If the runtime ever gives no valid date, an as-of control appears, defaulting to the end of the latest updated month. It only filters the view; stored values never derive from it except the recorded `changed_on` of a slip and `saved_on` of a report.
- **Slip** = `end_date − baseline_end` in calendar days; "no baseline" otherwise. A later `end_date` on a planned, in-progress or at-risk item with a baseline requires a reason and writes exactly one `slips` record in the same review.
- **Critical path** per program = the finish-to-start chain through `predecessor_id` ending at the latest key milestone. One predecessor per item makes this chain unique. Cycles are rejected at save; a cycle written elsewhere disables that program's critical path.
- **Driving path** = an item's predecessor chain. **Downstream preview** = each successor's earliest start = predecessor's new end + 1 day when later than its current start; durations kept; done and cancelled successors never move; applied only when accepted.
- **Due soon** = items, gates and decisions dated within `[as-of, as-of + due_soon_days]`. **Overdue** = not done/cancelled with `end_date` before the as-of date. **On-time rate** = baselined milestones done in the quarter on or before `baseline_end`.
- **Risk score** = likelihood × impact cell on a 3 × 3 grid. **Health** is never set by the app and is flagged after 45 days.
- **Cash at a key milestone** = Runway's frozen forecast closing cash in that month; **cushion** = full months of cash after it before cash-out (Runway's definition, without a reserve). Colours: green ≥ 6 months, amber 3–6, red < 3.
- **Bounds:** 800 rows per table, 80 reads per render. Unbound, unavailable, short-page, unknown-total or truncated reads disable the critical path and totals and say so.

## Host interactions

- Every input carries `data-ui-state` and a stable `data-action`; drafts are merged into returned state and survive failed proposals.
- Submits create one `records.propose` batch (at most 50 writes) of exact changed fields; record versions are captured when an editor, gate or confirmation opens.
- The gear emits `tracker:layout` (screens; column groups `items`, `raid`, `decisions`). Saved configuration is re-read on every render.
- No app login, browser storage, network calls or automation reads.
