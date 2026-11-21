# Runway 3.0.0 (`life.cash-runway`)

Cash, burn and runway by program, with what-if scenarios. Runway 3.0.0 is the session 7 rebuild (package 7.3) on the v2 app contract and the kit. It ships as a **draft**: the owner approves it (O4); `templates/catalog-seed.json` still names 2.2.1. The released 2.2.1 package is archived byte-for-byte under [`archive/2.2.1/`](archive/2.2.1/), its installer entry points there, and `scripts/build-cash-runway-template.mjs` rebuilds both versions (`--check` verifies the 2.2.1 JSON unchanged).

## 3.0.0: rebuilt on the kit and the v2 contract

- **Same data, same engine.** The installer schema (`schema.example.json`) is byte-identical to 2.2.0/2.2.1, as are `appCommands` (37 commands, same ids and inputs), `recommendedAutomations`, the `runway.month_closes` output contract and the options `tableMap`, `pageSize`, `layoutProfile`, `readOnly` and `heading` (`demoLabel` is gone). The calculation engine is spliced verbatim from 2.2.1, and `tests/cash-runway-v2.test.ts` checks that the read commands return the same figures. `upgradeFrom: ["2.2.0","2.2.1"]` lets an owner upgrade a copy (package 7.1).
- **v2 contract.** `'use trialagents v2';` is the first line of the body; the builder puts the app's small stylesheet (`cash-runway.css`, chart and finance rows only, on `--k-*` tokens) after it. No header, title, "as of" pill, layout gear, footer, disclaimer or banner: the 11 banners of 2.2.1 are gone. Messages are `output.notice`; missing or excluded data is listed on Overview under **Needs attention** with the action that fixes it, and other screens say when figures are provisional.
- **Direct saves.** `records.save` from a person's click, change or submit (at most 50 changes), with the version captured when editing started. Values are edited where they are shown (`kit.cell`: names, amounts, months, statuses, rates, program and organization fields, the opening balance), side panels (`kit.panel`) create records or edit many fields, People has a board (`kit.board`, drag a planned hire to current), Delete is `archive_record`, and Undo (`undo.list`, `kit.undo`) is offered on the screen after a save. Close month, Lock budget, Adopt and Archive scenario save in one click; there are no confirmation dialogs (nothing goes out to external people). Commands buffer their changes and save them in one `records.save`.
- **Screens.** Overview, Cash flow, Plan (spend and cash in, milestones, budgets), People, Scenarios, Monthly close, and new **Exchange rates**, **Programs** and **Organizations** screens (the data lists that were in Settings). **Settings** holds only business choices (`kit.settings`) and is shown to owners of the app only; editors keep the opening balance and date on Monthly close → Starting point. The layout declaration keeps the 2.x screen ids, so saved layout profiles stay valid (at most eight screens can be declared, so the three data screens are not layout-controlled).
- **Reads.** Each screen reads only its tables with `records.readMany` (the forecast tables in one batch, the rest in another, then the remaining pages of long tables, up to 800 rows). Exchange rates, Programs and Organizations read one sorted, searchable page. Full-table counts use `records.summarize` (rates per currency, actual records per month). Pending reads render as Loading, never as empty or zero. Opening never writes.
- **Context.** The chosen program (Plan, People, Milestones) is returned as `output.context` and read back from `input.context`.
- **Preview.** `cash-runway.preview.html` runs the app with the kit on labelled fictional records (D40); nothing is installed or sent.

## 2.2.x reference (unchanged behaviour of the engine and data model)

The sections below describe the data model, calculations and integrations, which 3.0.0 keeps. Screen and review descriptions refer to 2.2.x.

## Files

| File | Purpose |
| --- | --- |
| `cash-runway.source.js` | The `frontend-js` renderer: seven screens, deterministic calculation engine, reviewed `records.propose` writes. It starts with the single-line `templateLayoutSchema` and `appCommands` declarations. |
| `cash-runway.css` | Vivid ocean theme (`#175B94`), light canvas, one page scroll, responsive at 390–1440 px. |
| `catalog.metadata.json` | Catalog fields: options, instructions and the MCP-served documentation (data and interaction contracts, lifecycle, limitations, examples, tasks). |
| `schema.example.json` | Installer schema: 15 role-keyed tables (eight `runway.*`, three core, four integrations) with scalar fields and logical-to-real key maps. Registered in `templates/catalog-installers.json`. |
| `demo_data.json` | Fictional preview records only. The budget, both month closes and the saved scenario were written by the app's own actions. Never seed this file into a workspace. |
| `cash-runway.preview.html` | Generated offline preview (gallery screenshot source). |
| `QA_AND_ACCEPTANCE.md` | Commands, results, the hand reconciliation and unverified boundaries. |
| `AUTOMATION_RECIPES.md` | The two optional automations and the no-automation path. |

Edit the source, CSS and metadata, then run `node scripts/build-cash-runway-template.mjs`. This regenerates `templates/apps/life.cash-runway-2.2.0.json` and the preview; `--check` runs in `npm run build`. Do not edit a released version: publish a new version instead, and archive the previous package first if its schema or preview would change. After a catalog or preview change, regenerate the gallery screenshot and manifest entry (`node scripts/build-template-screenshots.mjs`).

## 2.2.0: assistant control, integrations and automations

- **App commands.** `appCommands` declares 37 commands (10 read, 26 propose, 1 layout). Every command replays the events of the matching control, or calls the same function the control calls, inside one `handle(event)` function. The proposal is therefore identical to the click path for the same input, which `tests/cash-runway-commands.test.ts` checks. Proposals made inside a command are buffered and sent once, so a failing step leaves no partial review. Read commands (`summary.read`, `cashflow.read`, `cashflow.drill`, `export.csv`, `bridge.read`, `variance.read`, `scenario.evaluate`, `scenario.compare`, `sources.read`, `schema.describe`) return the engine's figures and follow the salary restriction exactly like the screens.
- **Scenarios.** One `runway.scenarios` record per scenario with `changes_json`, saved in one review and stamped with the forecast fingerprint. `draft` scenarios (left by an assistant) are never Outdated, open as a preview with **Open draft**, and are stamped when saved. Seven new change kinds: `add_line`, `stop_line`, `shift_line`, `scale_line`, `scale_category` (splits a monthly line at the start month), `shift_position`, `change_salary`. Adoption creates new lines and updates salaries as needed.
- **Customization.** `settings.categories` lists the shown categories; names beyond the base seven are custom (their select option is added by the reviewed schema change that `category.add` returns). Form groups `line_form`, `position_form`, `milestone_form`, `actual_form` and `settings_form` in `templateLayoutSchema` let the layout gear order and hide optional form fields; `layout.save` also sets `labels` and `defaults`. `tableMap` `extraFields` and `writableExtra` show added fields in forms and Details and include them in proposals; calculations ignore them.
- **Integrations.** `programs.plan_items` is Runway's own milestone list on new installs, or the Programs app's key milestones (read only) once the user links Programs inside Runway. `croselection.awards`, `contracts.obligations` and `fundraise.tranches` are Runway's own entries or the provider's records. **Add to plan** copies a source into a plan line with `source_role`, `source_record_id` and `source_version`; a later source change shows **Source changed** and **Update line** proposes the new values. Linked values are labelled "From *App*" with **Edit in *App*** (`data-trialy-open`).
- **Automations.** Four `recommendedAutomations`: `runway_below_target`, `month_close_reminder`, `monthly_fx_rates` (create-only `writeBindings` on `runway.fx_rates`) and `monthly_runway_digest` (frozen snapshot fields). See [AUTOMATION_RECIPES.md](AUTOMATION_RECIPES.md).
- **New installs** create no `runway.milestones` or `runway.scenario_changes` tables; 2.0/2.1 role keys are still read when bound.

## Roles, shared data and modularity

`tableMap` uses stable role keys (rule 5):

- **This app's tables:** `runway.settings` (one row), `runway.plan_lines`, `runway.positions`, `runway.actuals`, `runway.budgets`, `runway.scenarios`, `runway.fx_rates`. Also `runway.month_closes`, an **app output** whose frozen snapshots other apps, such as Investor Updates and Board, may read.
- **Core shared tables** (core data contract v1, [`templates/core-contract/v1.json`](../../core-contract/v1.json)): `programs`, `organizations`, `agreements`. Runway's schema copies the contract fields exactly, and a test enforces it. Runway never writes fields another app owns, such as the Programs `health` fields.
- **Integrations:** `programs.plan_items` (Runway's milestone list, or the Programs app's key milestones once linked: `item_type = milestone`, `is_key`, not cancelled), `croselection.awards`, `contracts.obligations`, `fundraise.tranches`. Linked data is never written by Runway.
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

The Use existing data? dialog connects existing core tables at install; integrations are connected later inside the app (modular apps §7.1).

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
