# Runway 2.0.0 (`life.cash-runway`)

Cash, burn and runway by program, with what-if scenarios. Scope: [RUNWAY.md](../../../docs/product/app-template-blueprints/apps/RUNWAY.md). This is a new major version of the catalog ID `life.cash-runway`. The released 1.2.2 catalog JSON is unchanged, and its source package is archived byte-for-byte under [`archive/1.2.2/`](archive/1.2.2/). Saved 1.x apps are not migrated.

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

Edit the source, CSS and metadata, then run `node scripts/build-cash-runway-template.mjs`. This regenerates `templates/apps/life.cash-runway-2.0.0.json` and the preview; `--check` runs in `npm run build`. Do not edit 2.0.0 once released: publish 2.0.1 or later instead, and archive the previous package first if its schema or preview would change. After a catalog or preview change, regenerate the gallery screenshot and manifest entry (`node scripts/build-template-screenshots.mjs`).

## Roles and tables

`tableMap` keys: `settings` (Runway settings, one row), `lines` (plan lines), `positions`, `milestones`, `actuals`, `closes` (month closes and frozen snapshots), `budgets`, `scenarios`, `changes` (scenario changes), `rates` (FX rates), plus the shared roles `programs`, `organizations` and `agreements`. Each role maps to a real table ID, logical-to-real field keys and writable logical keys. Frozen JSON fields are `closes.metrics`, `closes.rates_used`, `budgets.totals` and `budgets.rates_used`. The installer creates its own shared tables. To reuse existing Programs, Organizations or Agreements tables, prepare the app with explicit bindings after the user chooses shared data.

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
