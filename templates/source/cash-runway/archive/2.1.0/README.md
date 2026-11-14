# Runway 2.1.0 (`life.cash-runway`)

Cash, burn and runway by program, with what-if scenarios. Scope: [RUNWAY.md](../../../docs/product/app-template-blueprints/apps/RUNWAY.md). It follows [modular apps and shared data](../../../docs/product/MODULAR_APPS_AND_SHARED_DATA.md). The released catalog JSON for 1.2.2 and 2.0.0 is unchanged, and their source packages are archived byte-for-byte under [`archive/`](archive/). Saved apps are not migrated.

## Files

| File | Purpose |
| --- | --- |
| `cash-runway.source.js` | The `frontend-js` renderer: seven screens, deterministic calculation engine, reviewed `records.propose` writes. It starts with the single-line `templateLayoutSchema` declaration. |
| `cash-runway.css` | Vivid ocean theme (`#175B94`), light canvas, one page scroll, responsive at 390–1440 px. |
| `catalog.metadata.json` | Catalog fields: options, instructions and the MCP-served documentation (data and interaction contracts, lifecycle, limitations, examples, tasks). |
| `schema.example.json` | Installer schema: 13 role-keyed tables with scalar fields and logical-to-real key maps. Registered in `templates/catalog-installers.json`. |
| `demo_data.json` | Fictional preview records only. The budget, both month closes and the saved scenario were written by the app's own actions. Never seed this file into a workspace. |
| `cash-runway.preview.html` | Generated offline preview (gallery screenshot source). |
| `QA_AND_ACCEPTANCE.md` | Commands, results, the hand reconciliation and unverified boundaries. |
| `AUTOMATION_RECIPES.md` | The two optional automations and the no-automation path. |

Edit the source, CSS and metadata, then run `node scripts/build-cash-runway-template.mjs`. This regenerates `templates/apps/life.cash-runway-2.1.0.json` and the preview; `--check` runs in `npm run build`. Do not edit a released version: publish a new version instead, and archive the previous package first if its schema or preview would change. After a catalog or preview change, regenerate the gallery screenshot and manifest entry (`node scripts/build-template-screenshots.mjs`).

## Roles, shared data and modularity

`tableMap` uses stable role keys (rule 5):

- **This app's tables:** `runway.settings` (one row), `runway.plan_lines`, `runway.positions`, `runway.milestones`, `runway.actuals`, `runway.budgets`, `runway.scenarios`, `runway.scenario_changes`, `runway.fx_rates`. Also `runway.month_closes`, an **app output** whose frozen snapshots other apps, such as Investor Updates and Board, may read.
- **Core shared tables** (core data contract v1, [`templates/core-contract/v1.json`](../../core-contract/v1.json)): `programs`, `organizations`, `agreements`. Runway's schema copies the contract fields exactly, and a test enforces it. Runway never writes fields another app owns, such as the Programs `health` fields.
- **Partner output, read only:** `programs.plan_items`, the Programs app's milestones. Runway uses key milestones (`item_type = milestone`, `is_key`, not cancelled). A Runway milestone with `source_milestone_id` follows that Programs date. Runway never proposes a change to Programs data.
- **2.0.0 compatibility:** the short 2.0.0 role keys (`settings`, `lines` and so on) are still read.

Runway works alone; rule 3 degradation:

- **No programs table:** program breakdowns are hidden with a one-line note, and totals are unaffected.
- **Unreadable programs table:** names show "Program unavailable".
- **Archived or deleted program:** archived programs are labelled "(archived)"; a deleted one shows "Program unavailable", and the reference is kept when the line is edited.
- **No Programs output connected:** only Runway's own milestones are used, with a note.
- **Programs output unreadable or partial:** linked milestones keep their Runway date, labelled "Programs link unavailable".

Platform behaviour this relies on, with Runway's rule 9 test covering each:

- **Deleting an app** archives it and keeps its tables and records.
- **Removing a binding** unbinds it; re-adding it reconnects the same table.
- **Reinstalling** offers to restore the archived app first; "install a new copy" starts fresh and leaves the old data untouched.

The Use installer still creates new tables for every role. Reusing existing core tables or the Programs output is done by an assistant-prepared app with explicit bindings until platform install detection ships (modular apps §5, items 1–2).

## Calculation contract

- **As-of month:** the latest closed month, or the opening month before any close. Cash starts at the opening balance (a month-end balance in the reporting currency), then each confirmed close.
- **Plan lines:** `monthly` is the amount every month from start to end (inclusive). `one_off` is the amount in the start month. `spread` is the amount ÷ months from start to end inclusive. Payment schedules are one-off lines sharing `schedule_group`.
- **People cost:** `annual_salary ÷ 12 × (1 + loaded_cost_pct/100)` for active months. Planned hires count as forecast cost but not as current headcount.
- **Currency:** amounts convert via EUR cross-rates (`rate_per_eur`, units per 1 EUR). Closed months use their own month's rate; future months use that month's rate when present, otherwise the latest available. A missing rate flags and excludes the row; it is never guessed. `fx_shift` scenarios scale converted foreign amounts by a percentage.
- **Net burn and runway:** net burn = spend − operating cash in (`cash_in_type = other`); equity, grants, partnership and tax credits are financing. Runway = full months after the as-of month with forecast closing cash ≥ 0, counting committed and received cash in. A second value adds contingent cash; discretionary cash in is never counted. Cash-out is the first month below zero. Start-raise is the first month with less than the target left. Cushion is the months of cash after a milestone, or months above the reserve when one is set.
- **Budgets and bridge:** budgets freeze the plan for the 12 months of a year (category and program totals, rates). Variance = actual − budget. The bridge replaces the snapshot's frozen monthly series step by step: closed months and bank balance, then spend lines, people and cash-in. The parts add up to the runway change.
- **Bounds:** reads are bounded to 800 rows per table and 88 reads per render. Unbound, unavailable, short-page, unknown-total or truncated reads withhold the exact runway claim. No calculation uses the clock: `budgets.locked_on`, `scenarios.created_on` and `based_on_close` record the as-of month, and `closed_at` records the closed month's last day.

## Host interactions

- **Inputs and writes:** every input carries `data-ui-state` and a stable `data-action`, and drafts are merged into returned state. Submits create one `records.propose` batch; only the trusted outer review commits it. Edit, archive and adoption confirmations capture record versions when they open.
- **Two-step scenario save:** saving a scenario takes two reviews, because `scenario_changes.scenario_id` needs the saved scenario's receipt ID.
- **Layout:** the gear emits `tracker:layout` for native layout settings (screens, plus the lines, positions and milestones column groups). Saved configuration is re-read on every render.
- **Platform boundaries:** no app login, branding, browser storage, network calls or automation reads.
