# Runway — final app scope (BT2-01)

*Cash, burn and runway by program, with what-if scenarios.*

**Status:** Final scope for build, 10 November 2026. Part of [Biotech apps v2](../BIOTECH_v2.md) (rank 1). Replaces the v1 `cash-runway` 1.2.2 package as a new major version (`life.cash-runway` 2.0.0; display name **Runway**). There are no existing users, so no compatibility or migration with v1 data is required. **2.2.0 scope (assistant control, integrations, automations):** see [§14](#14-runway-220--assistant-control-integrations-and-automations).

**Governing contracts (this scope follows them; they win on any conflict):** [project context](../../../../CONTEXT.md) · [template authoring](../../../../templates/TEMPLATE_AUTHORING.md) and [usage](../../../../templates/TEMPLATE_USAGE.md) guidance (read the hosted version through every `nextOffset` before building) · [shared build contract](../DESIGN_AND_BUILD_CONTRACT.md) · [interface rules](../../../INTERFACE_RULES.md) · [access control](../../../ACCESS_CONTROL.md) and [app/tab access](../../APP_CONFIGURATION_AND_AUTOMATIONS.md#app-and-tab-access) · [write authorization](../../../WRITE_AUTHORIZATION.md) · [field capabilities](../../../FIELD_CAPABILITIES.md) · [shared data](../../../SHARED_DATA.md).


**Modularity:** follows [modular apps and shared data](../../MODULAR_APPS_AND_SHARED_DATA.md) — shared tables use the core data contract v1 role keys; cross-app features (Runway ↔ Programs) degrade gracefully; app or tab deletion never deletes data; reinstall reconnects by default. Include the §3 rule 9 acceptance test.

---

## 1. Purpose and users

**Job:** give a small biotech one trustworthy answer, always up to date: *how long does our cash last, and does it get us past the next milestone?* Plus the ability to test what-ifs in seconds and hand the board a clean monthly picture.

| User | Typical use | Needs |
|---|---|---|
| CEO / founder (often the de-facto CFO) | Weekly glance; what-ifs before decisions; board prep | Runway sentence, cash curve with milestones, quick scenarios |
| CFO / part-time or fractional CFO | Monthly update; budget; board and investor numbers | Actuals vs budget, plan lines, people costs, snapshots |
| Board members, investors (read-only) | Monthly or quarterly | Approved monthly snapshot only, no salaries |
| Program / ClinOps leads (optional) | Check their program's spend | Spend by program; no salaries |
| Claude and ChatGPT (per user, as separate access principals) | Setup, what-ifs, monthly actuals from a shared P&L, commentary | Read and propose within the user's permissions; every write reviewed |

**Evidence and references.** Needs, confidence levels and the reference research (Abacum Life Sciences for the domain, Jirav for plan mechanics) are documented in [BIOTECH_v2.md → First app in detail: Runway](../BIOTECH_v2.md#first-app-in-detail-runway-bt2-01). This file is the build scope.

**Defaults chosen (best guess, to confirm with design partners):** runway target **18 months**; trailing burn window **3 months**; actuals at **category level, program optional**; reporting currency set at install.

---

## 2. Scope at a glance

**In (v2.0):** bank balance and monthly close; spend and cash-in lines with four drivers; payment schedules; people (roles and planned hires); milestones; one live forecast; one locked budget (plan of record) per year; unlimited scenarios, preview-first; 12 currencies with monthly rates; variance vs budget; frozen monthly snapshots with a runway bridge; CSV/Excel export; one optional alert; one optional automation for exchange rates.

**Out:** accounting/bank connectors and file parsers; three-statement model; revenue, AR/AP, deferred revenue, debt; consolidation and departments; approval workflows; close checklists; 13-week cash; tax-credit calculators; payroll detail; cap table and dilution (belongs to Fundraise, 03).

**Cut rule for any later addition:** used at least monthly by a 10–50 person biotech, or needed for a board meeting or a raise.

---

## 3. Screens (7)

Custom `frontend-js` app on the Vivid design kit, theme **ocean** (`#175B94`), Inter typography, one page scroll, light canvas, at most three dark KPI cards. Screens are declared in `templateLayoutSchema` so users can reorder, rename or hide them with the native layout gear (`tracker:layout`). Each screen has four primary capabilities.

| # | Screen (stable id) | Four capabilities |
|---|---|---|
| 1 | **Overview** (`overview`) | (1) Runway sentence (e.g. "Cash lasts until March 2028, 4 months after the Phase 1 readout"), runway months, cash-out date, start-raise date. (2) Cash curve: actual solid, forecast dotted, reserve line, milestone markers coloured by cushion (green ≥ 6 months, amber 3–6, red < 3). (3) Monthly burn by category, actual then forecast (separate chart from the cash line). (4) "Why did runway change" bridge since the last snapshot, plus exceptions (month not closed, missing rate, unsaved preview, outdated scenario). |
| 2 | **Cash flow** (`cash_flow`) | (1) Monthly table: cash in, spend by category (expandable to program), net burn, opening and closing cash. (2) Switch between forecast, budget and saved scenarios; toggle "include contingent cash". (3) Drill from a cell to the lines behind it. (4) Export CSV/Excel. |
| 3 | **Plan** (`plan`) | (1) Spend lines (driver, program, vendor, currency, committed/discretionary). (2) Cash-in lines (equity, grant, partnership, tax credit, other; committed/contingent/received). (3) Milestones. (4) Lock the current forecast as this year's budget. |
| 4 | **People** (`people`) | (1) Current roles and planned hires (title, program, start/end, salary, currency). (2) Monthly headcount and people cost by program. (3) Loaded-cost %. (4) Add, move or remove a hire with the runway effect shown before saving. |
| 5 | **Scenarios** (`scenarios`) | (1) Previews and saved scenarios, each with its changes in plain words and an *Outdated* flag. (2) Compare 2–4 side by side: runway, cash-out date, cash at each milestone, total burn. (3) Overlay chart. (4) Save, adopt as forecast, or archive. |
| 6 | **Actuals** (`actuals`) | (1) Months with open/closed status. (2) Close a month: bank balance and actuals by category. (3) Variance vs budget by category (and program where coded) with one commentary. (4) Snapshots list; open any snapshot read-only. |
| 7 | **Settings** (`settings`) | (1) Reporting currency, enabled currencies, monthly rates table. (2) Runway target, trailing window, minimum cash reserve, loaded-cost %. (3) Spend categories and programs (shared or own). (4) Links to platform Access and Automations for this app (no duplicated settings stores). |

**Standard behaviours (from the shared contract):** Search and the primary action stay on one line; secondary filters fold into the shared Filters panel; 25 rows per page with bottom pagination; Details open in a side panel; empty, restricted, partial-read and error states are explicit; inputs are kept on failed saves; desktop 1440 and mobile 390 checked.

**Charts (shared chart rules):** cash balance line and burn bars are separate charts; forecasts dotted and labelled; every chart shows its currency, period and "as of" month; missing values never become zero; accessible table fallback on each chart.

---

## 4. Key workflows

1. **Install and first runway (one session).** User picks the Runway template (web, Claude or ChatGPT). At install, the platform asks for each shared record type whether to **reuse an existing table or create a new one** (Programs, Organizations, Agreements). Claude or ChatGPT then asks for the bank balance and date, reporting currency, programs and next milestones, the main spend lines and expected financing, and proposes the records for review. Result: a forecast and the runway sentence.
2. **Lock the budget.** Plan → "Lock as budget" freezes the current forecast into a budget record (monthly totals by category and program, rates used). It cannot be edited; a new budget can be locked for the next year.
3. **Monthly close (about 15 minutes).** Actuals → Close month: bank balance and actuals by category (typed in, or proposed by the assistant from a P&L or bank statement the user shares in chat). Reviewed save → the forecast rolls forward, variance appears, the app freezes a snapshot with the runway bridge, and the user adds one commentary.
4. **What-if.** Ask the assistant ("what if the Series A closes four months later and we pause program B?") or use Scenarios. A **preview** appears as an overlay; nothing is stored. Save it to keep it; adopt it to make its changes part of the forecast (reviewed write of the affected lines).
5. **Board and investor pack.** Use the latest snapshot in Investor Updates (06) or Board (14), or export it. Viewers without salary access see snapshots, not live people detail.
6. **Optional: runway alert.** Email to the owner when a close sets `runway_status` to `below_target` (see §8).
7. **Optional: monthly exchange rates.** Automation that saves last month's ECB rates under the bounded write permission approved with it (see §6, §8 and §14.8).

---

## 5. Data model

**Principles applied:** reuse shared records (Organization, Person, Project/Program, Document) before creating tables; scalar fields only, `multiple:false`; lowercase snake_case keys; relationships by stable record ID, never by display name; status/date/boolean scalar; money stored with an explicit currency; no seed data in real workspaces; every write is an exact reviewed proposal with record versions; per-field history kept; app installation creates empty tables atomically.

### Shared record types (reuse-or-create at install)

| Logical role | Reuses | Used for |
|---|---|---|
| `programs` | Programs app (02) table or the workspace Project table | Spend, people and milestone grouping |
| `organizations` | Workspace organizations | Vendors, investors, funders |
| `agreements` (optional) | Contracts app (04) | Linking payment schedules to contracts |

### Runway tables (10)

| Table | Purpose | Key fields (kind) |
|---|---|---|
| `runway_settings` (one row) | Business settings | reporting_currency (select), enabled_currencies (text, comma list), runway_target_months (number, default 18), trailing_window_months (number, 3/6), min_cash_reserve (money), loaded_cost_pct (number), opening_balance (money), opening_date (date), categories (text, comma list) |
| `plan_lines` | Live forecast: spend and cash-in | name (text*), direction (select*: spend / cash_in), category (select*), program_id (text, UUID→programs), counterparty_id (text, UUID→organizations), agreement_id (text), schedule_group (text, groups instalments of one contract), driver (select*: monthly / one_off / spread), amount (money*), currency (select*), start_month (date*), end_month (date), status (select*: committed / discretionary / contingent / received), cash_in_type (select: equity / grant / partnership / tax_credit / other), notes (text), archived (boolean) |
| `positions` | People: current and planned | title (text*), program_id (text), start_month (date*), end_month (date), annual_salary (money*), currency (select*), status (select*: current / planned), person_id (text, optional), archived (boolean) |
| `milestones` | Milestones the cash must reach | name (text*), program_id (text), target_month (date*), source_milestone_id (text, Programs app link), archived (boolean) |
| `actuals` | Monthly actuals by category | month (date*), category (select*), program_id (text), direction (select*), amount (money*), currency (select*), note (text) |
| `month_closes` | One per closed month; also the frozen snapshot | month (date*), closing_balance (money*), currency (select*), closed (boolean), commentary (text), runway_months (number), cash_out_month (date), runway_status (select: ok / below_target), metrics (text, frozen JSON of results by month/category/program/milestone), rates_used (text, JSON), closed_at (date) |
| `budgets` | Locked plan of record | name (text*), year (number*), locked_on (date*), currency (select*), totals (text, frozen JSON of monthly totals by category and program), rates_used (text, JSON), notes (text) |
| `scenarios` | Saved what-ifs | name (text*), status (select*: saved / adopted / archived), based_on_close (date), based_on_version (text), created_on (date), summary (text) |
| `scenario_changes` | Changes in a saved scenario | scenario_id (text*, UUID→scenarios), kind (select*: shift_program / scale_program / stop_program / add_position / remove_position / move_cash_in / resize_cash_in / fx_shift), target_id (text), months (number), pct (number), amount (money), currency (select), from_month (date), label (text) |
| `fx_rates` | Monthly average rates | month (date*), currency (select*), rate_per_eur (number*), source (select*: ecb / manual), source_ref (text) |

`*` = required. Unsaved scenario previews live only in app state; they are never written. Frozen JSON fields are stored as `text` (as in v1) and are read-only after creation.

**Why this shape:** one live forecast (lines + positions + milestones) instead of cloned plans keeps writes small; a budget is one frozen record instead of thousands of copied lines; scenarios are changes applied on read, so they never duplicate data and can be flagged Outdated when the forecast changes.

---

## 6. Calculation rules

All results are computed in the app from authorized reads, deterministically. Assistants never compute or overwrite results.

- **As-of month** = latest closed month (or the opening date before the first close). No dependency on the current clock.
- **Opening cash:** opening balance at the opening date, then each closed month's confirmed closing balance. Missing balance, invalid dates or partial reads → no exact runway claim, clearly flagged.
- **Monthly line amount:** `monthly` = amount each month from start to end; `one_off` = amount in start month; `spread` = amount ÷ months between start and end. Payment schedules are several `one_off` lines sharing a `schedule_group`.
- **People cost** per month = annual_salary ÷ 12 × (1 + loaded_cost_pct) for positions active that month.
- **Currency:** each amount is converted to the reporting currency with the `fx_rates` monthly average (via EUR cross-rates). Closed months use that month's rate; future months use the latest available month's rate; a scenario `fx_shift` changes one currency by %. A missing rate flags and excludes the row; it is never guessed. Each converted figure can show its original amount and rate. Supported: USD, EUR, GBP, CHF, CAD, AUD, JPY, CNY, SEK, DKK, NOK, INR.
- **Net burn** = spend − operating cash in (`cash_in_type = other`). Equity, grants, partnership payments and tax credits are financing and do not reduce burn.
- **Runway months** = months from the as-of month until forecast closing cash < 0, counting `committed` and `received` cash in only; a second value adds `contingent`. **Trailing runway** = latest closing balance ÷ average net burn of the last N closed months (secondary check).
- **Cash at milestone** = forecast closing cash in the milestone's month; **cushion** = months from milestone to cash-out (or to the reserve if set).
- **Start-raise date** = first month in which remaining runway < runway target.
- **Variance** = actual − budget by month and category (and program where coded), amount and %.
- **Runway bridge** = runway now − runway in the latest snapshot, split by changed lines, positions, cash-in and closed-month actuals, largest first; the parts add up to the total.
- **Scale limits:** reads are bounded (shared contract: ≤ 800 rows per role in v1 practice; derived queries ≤ 1,000 source records). Expected volume is small (typically < 300 plan lines, < 60 positions, < 50 actuals per month). Truncated reads are shown as partial, never as complete totals.

---

## 7. Access control and AI connections

Runway uses the existing TrialAgents account, roles and Access page; it adds no app login, user list or permission store.

- **App level:** Runway appears under its project in Access → Projects, with the usual view/edit rights. Viewing the app does not grant Database browsing, app source editing, sharing, connector or automation management.
- **Tabs:** Runway is a custom `frontend-js` app, so per-tab restrictions are **not** advertised in v2.0 (current platform rule: custom source keeps app-level access until a proven section boundary exists). Do not hide tabs as a security measure.
- **Sensitive data: salaries.** Protect `positions.annual_salary` with the existing **database column restriction** for anyone who should not see pay (e.g. board viewers, program leads). The app must handle a restricted salary column gracefully: People shows titles, dates and headcount; live people cost and live runway show "restricted"; **snapshots** (`month_closes.metrics`, frozen by an authorized owner at close) still give viewers the approved runway, burn and variance.
- **Read-only sharing:** share the app with an explicit write restriction for board members and investors.
- **AI principals:** each user's Claude and ChatGPT connections are separate rows in Access that inherit that user's rights and can only be narrowed. Recommended defaults: AI may read Runway tables and propose changes; every AI write needs the user's review; AI read access to `positions.annual_salary` can be switched off independently if wanted. The rates automation (if used) saves only new `fx_rates` rows, under the bounded create-only permission approved together with it (§14.8).
- **Revocation:** access changes clear cached app output immediately, as everywhere in TrialAgents.

---

## 8. Customization (users, Claude and ChatGPT)

All customization goes through existing, reviewed paths; the app never stores settings in the browser.

| What | How | Path |
|---|---|---|
| Reorder, rename or hide screens; app heading | Layout gear in the app header, or ask the assistant | `tracker:layout` → `prepare_tool_layout` (presentation only) |
| Reporting currency, enabled currencies, runway target, reserve, loaded-cost %, trailing window, categories | Settings screen, or ask the assistant | Reviewed write to `runway_settings` |
| Reuse Programs/Contracts data instead of own tables | At install, or later on request | Explicit shared-or-separate choice; no silent copying |
| Add a field (e.g. cost centre on actuals) | Ask the assistant | Reviewed schema change; app source revision reviewed separately |
| Theme or chart defaults | Ask the assistant | Reviewed app source revision; preserves bindings and IDs |
| Who can see or edit; AI access | Access page (owner) | Existing protected access review |
| Alerts and rate updates | Platform Automations (owner) | See below |

**Optional automations (zero is fully supported; the app never waits for them):**

1. **Runway alert (email, TrialAgents):** database trigger on `month_closes.runway_status` changing to `below_target`; recipient the owner by default (registered, authorized members only); message gives runway months, cash-out month and start-raise date. No independent schedule.
2. **Monthly exchange rates (research, Claude or ChatGPT runner):** monthly, on the 3rd business day, Europe/Berlin; reads the ECB euro reference rates for the previous month for the enabled currencies; computes the monthly average; proposes or saves `fx_rates` records (dedup key: month + currency); no-update if already present; writes only to `fx_rates` under a narrow expiring grant. Manual fallback: the owner enters rates in Settings, or asks the assistant in chat to look them up and propose them.

**Platform note:** fully automatic daily rates without any assistant run would need a TrialAgents platform service that loads ECB rates into a read-only reference table. That does not exist today; it is a candidate platform feature shared by all finance apps, not part of this template.

---

## 9. Fit with other TrialAgents apps

| App | Relationship |
|---|---|
| Programs (02) | Shares `programs` and milestones (Runway keeps its own light list, linked by `source_milestone_id` when Programs exists). |
| Fundraise (03) | Equity tranches in Runway reference the round; the start-raise date informs round timing. |
| Contracts (04) | Payment schedules link to agreements via `agreement_id`. |
| Investor Updates (06), Board (14) | Read approved `month_closes` snapshots; never live salaries. |
| Trial Finance (11) | Later: CRO accrual estimates can be proposed as actuals or forecast lines for CRO categories. |
| Grants (19) | Awarded grants appear as `cash_in` lines (grant type) with expected payment months. |

Each link is optional; Runway works alone. Reuse always follows the explicit shared-or-separate choice and existing record permissions.

---

## 10. Assistant behaviour (Claude and ChatGPT)

- **Setup:** short interview, then one reviewed proposal of settings, lines, positions, milestones.
- **Monthly actuals:** from any P&L or bank statement the user shares in chat (any system, any country), map to categories and propose actuals plus the closing balance; ask when a line is ambiguous.
- **What-ifs:** translate plain language into scenario changes and show a preview; save only when asked.
- **Commentary:** draft the monthly commentary and explain the runway bridge from the data.
- **Never:** compute or overwrite results, give accounting, tax or investment advice, treat contingent cash as committed, or write without review (except a valid narrow grant).
- **Catalog text** (`whenToUse`): small biotech needs cash runway, burn, budget vs actual and what-ifs by program without an ERP. **`whenNotToUse`:** general ledger, payroll, three-statement reporting, consolidation, cap table, patient-level data.

---

## 11. Template package checklist

Follow the authoring preflight; deliver under `templates/source/cash-runway/` with a new build version:

- Catalog JSON `templates/apps/life.cash-runway-2.0.0.json` (new immutable version; draft until publisher approval).
- `catalog.metadata.json` with `whenToUse`, `whenNotToUse`, `instructions`, and `documentation`: `quickStart`, `dataContract` (tables, fields, shared roles, frozen fields, app-level access and the salary column recommendation), `interactionContract` (screens, forms, layout gear, links to platform Access/Automations), `lifecycle` (preview vs saved, scenario preview/save/adopt, receipts), `limitations` (no connectors/parsers, monthly granularity, app-level access only, rates automation requires runner), `examples` (fictional), `tasks` (mode `optional`: rates research; runway email; plus a no-automation example).
- `schema.example.json` with all ten tables and the three shared roles; `demo_data.json` fictional only (never seeded).
- `templateLayoutSchema` with the seven stable screen ids.
- Forms with `data-ui-state` per input and stable `data-action`; submits create `records.propose`; record versions retained.
- Build script and `--check` in the production build; browser test updated (`scripts/test-cash-runway-browser.ts`).

---

## 12. Acceptance criteria

Shared contract checks (desktop 1440 / mobile 390, keyboard, contrast, one scroll, empty/error/restricted states, reviewed writes, receipts) plus:

1. From an empty workspace a user reaches a runway sentence in one session using a bank balance, a few lines and one financing event.
2. A USD line in a EUR company converts with the month's rate; a missing rate flags and excludes the row.
3. Locking a budget creates one frozen record; later edits to lines do not change it; variance appears after the next close.
4. A what-if creates only a preview; nothing is written until Save; saved scenarios show *Outdated* after the forecast changes; Adopt writes only the affected lines after review.
5. "Shift program X by 3 months" moves only program X's lines; compare shows the new cash-out date and cash at each milestone.
6. Contingent cash never changes the base runway; the toggle changes only the second value.
7. Closing a month writes one `month_closes` record whose snapshot never changes; the bridge parts sum to the runway change.
8. With `positions.annual_salary` restricted, a viewer can open the app, sees snapshots, and sees "restricted" instead of live people cost; no salary value appears anywhere in the output.
9. A viewer with write restriction cannot change any record; an AI connection with edit off can only read.
10. The app opens and works with no automation; disabling or failing an automation never affects it.
11. Totals reconcile by hand against a fictional test dataset (two currencies, one schedule, three hires, one contingent grant, two closed months).

---

## 13. Open after design-partner review

Confirm with 5–10 biotech CEOs/CFOs: the 18-month default target; whether program-coded actuals are realistic; whether monthly granularity is enough (vs a 13-week view); whether anything in §2 "Out" is needed at least monthly.

---

## 14. Runway 2.2.0 — assistant control, integrations and automations

**Status:** Scope, 14 November 2026; revised after PR #169 (required app storage for research and drafting) and the owner's decisions D1–D3. **Built as the draft catalog version 2.2.0 and the platform items behind `APP_COMMANDS_ENABLED`** (see §14.12); release acceptance on real hosts and catalog approval are still open. Delivered as a new immutable draft `life.cash-runway` 2.2.0. The 2.1.0 package and catalog JSON stay unchanged, saved apps are not migrated, and publishing 2.2.0 needs separate owner approval. Automation declarations stay inactive until `APP_AUTOMATION_RECIPES_ENABLED` is on. §1–§13 still apply unless this section changes them.

### 14.1 Requirement and boundaries

**Owner requirement:** Claude and ChatGPT can control and change everything in Runway: every form and action, every scenario, and the template itself (layout, forms, fields, categories, screens, code).

**What "control" means:** anything a person can do by clicking in Runway, an assistant can do by naming the same action with the same inputs. It gets the same validation, the same calculation and the same exact proposal for review. There is no assistant-only shortcut and no hidden capability, and every result an assistant reports comes from Runway's own engine.

**Platform rules this keeps (unchanged):**
- Assistants prepare and a person confirms every write in the trusted review. The only exceptions are a valid, narrow standing grant, and the bounded result-storage grant that an owner approves together with a research automation (PR #169, §14.8).
- Results (runway, snapshots, budgets, bridge) are computed only by the app's engine. The assistant asks the app for them; it never computes them itself.
- App-only human actions stay human: `confirm_data_access`, `choose_integration_source`, access changes and automation activation follow their existing owner rules.
- Database column restrictions apply to the assistant principal. With `positions.annual_salary` restricted, commands return "restricted" for live people cost and runway, never values.
- No permanent deletion by assistants. Archive and restore only.

### 14.2 Coverage: every Runway action has an assistant path

Paths: **R** = reviewed record proposal on a bound table (`prepare_change`, works today). **C** = app command (§14.3, new). **L** = layout (`prepare_tool_layout`). **S** = reviewed schema change. **T** = reviewed app revision (`begin_app_update` → `finalize_app_preview` → human confirmation).

| Screen | Action | 2.1.0 for assistants | 2.2.0 |
|---|---|---|---|
| Overview | Runway sentence, months, cash-out, start-raise, cash at milestones, bridge, exceptions | Not available (must not compute) | C `summary.read`, `bridge.read` |
| Cash flow | Table by source (forecast, preview, scenario, budget), contingent toggle, drill-down, CSV | Not available | C `cashflow.read`, `cashflow.drill`, `export.csv` |
| Plan | Add, edit, duplicate, archive a line | R (no version capture or form validation) | C `line.save`, `line.duplicate`, `line.archive` (R still allowed) |
| Plan | Payment schedule | R, line by line | C `schedule.create` |
| Plan | Milestones | R | C `milestone.save`, `milestone.archive` |
| Plan | Lock as budget | **App only** | C `budget.lock` |
| People | Add, move, remove a hire, with runway effect | R, without the effect | C `position.save`, `position.archive` (both return the effect) |
| Scenarios | Build a preview | **Not possible** | C `scenario.evaluate`; drafts (§14.4) |
| Scenarios | Save | Two reviews, and shows Outdated at once | C `scenario.save` (one review, fingerprinted) |
| Scenarios | Copy, compare, adopt, archive | Adopt is **app only** | C `scenario.copy`, `scenario.compare`, `scenario.adopt`, `scenario.archive` |
| Actuals | Enter actuals | R | C `actuals.save` |
| Actuals | Close month (frozen snapshot) | **App only** | C `month.close` |
| Actuals | Variance; commentary | R for commentary | C `variance.read`, `commentary.save` |
| Settings | Settings row, FX rates, programs, organizations | R | C `settings.save`, `fx.save`, `program.save`, `organization.save` |
| Settings | Categories | S + T | C `category.add`, `category.hide` (§14.5) |
| Any | Screens, form fields, labels, order | L (screens only) | L, extended to forms (§14.5) |
| Any | Theme, charts, new screens, code | T | T, with the revision contract (§14.5) |
| Any | Discover forms, fields, options, kinds, commands | Docs only | C `schema.describe` and `list_app_commands` |

### 14.3 App commands (platform capability; Runway is the first user)

**Gap:** the tool that runs an app's own code, `run_component_frontend`, is registered as app-only (`src/server/workspace-foundation.ts`, `ui.visibility:['app']`). So an assistant cannot drive a `frontend-js` app's forms or ask it for results. Function bindings (`invoke_component_function`) are not the main answer: they are added after save, are cleared on copy, and would duplicate the engine in separate code.

**Platform design (gated by `APP_COMMANDS_ENABLED`, default off):**
- **Declaration.** Any app manifest (template or custom) may declare `commands: [{id, label, mode: "read"|"propose", input: <JSON Schema subset>, screen?}]`, up to 60. Ids are lowercase dotted keys. The server validates declarations strictly at publication and reads them tolerantly at runtime.
- **Discovery.** New MCP tool `list_app_commands({workspaceId, appId})` returns the declared commands of the current saved version, filtered by the caller's access. Read-only commands are still listed to viewers; propose commands are listed only when the caller can edit.
- **Execution.** New MCP tool `run_app_command({workspaceId, appId, expectedVersion, command, input, requestKey})`:
  - It runs the saved source in the existing isolated engine as the assistant principal, with `input.event = {type:"command", command, input}` and the app's saved layout and configuration.
  - Reads, permissions, column restrictions and limits are exactly as for `run_component_frontend`.
  - The app returns `state.command = {ok, result?, error?, proposal?}`. `result` is bounded JSON (≤ 64,000 serialized characters). `proposal` is the same `records.propose` batch a click would create.
  - The platform turns `proposal` into a standard review (preview ID and digest) that a person confirms in the host. It never commits.
  - Unsaved previews and drafts are read-only. A stale `expectedVersion` is rejected. The same `requestKey` returns the same review.
- **Limits and safety.**
  - Commands cannot call app-only confirmations, exchange sends, uploads, integration choices or data-access confirmation.
  - Every command run is logged with the principal and command id.
  - Exchange links stay redacted as in every MCP result.
- **Parity rule for apps.** Each propose command must go through the same handler as its form submit, so a click and a command produce byte-identical proposals for the same input. Runway's tests enforce this per command.
- **Guidance.** Add an "App commands" section to both template guidance copies, raise `templateGuidance.version`, and update the MCP descriptions.

**Runway commands (2.2.0):**

| Command | Mode | Input (summary) | Result |
|---|---|---|---|
| `schema.describe` | read | — | Forms, fields, required fields, options, enabled categories, scenario change kinds, command list |
| `summary.read` | read | `includeContingent?` | Runway sentence, runway months (base and with contingent), cash-out, start-raise, cash and cushion per milestone, exceptions, partial and restricted flags |
| `cashflow.read` | read | `source` (forecast, budget id, scenario id, draft changes), `from`, `to`, `includeContingent`, `byProgram` | Monthly rows: opening, cash in, spend by category, net burn, closing |
| `cashflow.drill` | read | `month`, `category`, `program_id?`, `source` | Lines behind the cell with original amount, rate and converted amount |
| `export.csv` | read | `source` | CSV text (same as the screen) |
| `bridge.read` | read | — | Bridge parts since the last snapshot; the parts add up to the total |
| `variance.read` | read | `month` or `year` | Actual vs budget by category (and program) |
| `scenario.evaluate` | read | `changes[]` or `scenarioId` | Same as `summary.read` plus the difference from the base, with no write |
| `scenario.compare` | read | 2–4 `scenarioId`s or change sets | Side-by-side runway, cash-out, cash at each milestone, total burn |
| `settings.save` | propose | Settings fields | One settings create or update |
| `line.save` / `line.duplicate` / `line.archive` | propose | Line fields (+ `id`) | Line write with the version captured at command time |
| `schedule.create` | propose | Total or instalments, months, counterparty, agreement | One-off lines sharing a `schedule_group` |
| `milestone.save` / `milestone.archive` | propose | Milestone fields | Milestone write |
| `position.save` / `position.archive` | propose | Position fields | Write plus runway effect (months and cash-out, before and after) |
| `actuals.save` | propose | `month`, rows (category, program, direction, amount, currency, note) | Actual records |
| `month.close` | propose | `month`, `closing_balance`, `actuals?`, `commentary?` | Actuals plus one `month_closes` record whose snapshot the app computes and freezes; months must be closed in order |
| `commentary.save` | propose | `month`, text | Commentary update (the only editable field on a close) |
| `budget.lock` | propose | `year`, `name` | One frozen budget record computed by the app |
| `scenario.save` | propose | `name`, `changes[]`, `status` (`draft` or `saved`) | One scenario record with `changes_json` and the current fingerprint (§14.4) |
| `scenario.copy` / `scenario.archive` | propose | `scenarioId` (+ `name`) | New draft, or archived scenario |
| `scenario.adopt` | propose | `scenarioId` | Writes to the affected lines and positions (≤ 50 per review), scenario status `adopted`; rejected if Outdated |
| `fx.save` / `program.save` / `organization.save` | propose | Record fields | Record write (core fields only on shared tables) |
| `category.add` / `category.hide` | propose | `name` | Settings update; `category.add` also returns the schema change to prepare (§14.5) |

### 14.4 Scenarios: assistant-built, one review, adoptable

- **One record per scenario.** Add `changes_json` (text: the frozen list of up to 50 changes, each validated by the app) to `runway.scenarios`, and add the status option `draft`. 2.2.0 writes only `changes_json`. It still reads 2.0/2.1 scenarios from `runway.scenario_changes`; that table remains bound for reading and is not created on new installs. Saving becomes one review.
- **Fingerprint stamped by the app.** `scenario.save` runs in the app, so it stamps `based_on_close` and `based_on_version` from the app's own fingerprint. Scenarios saved by assistants are therefore current and can be adopted. A scenario written directly with `prepare_change` should use `status: draft`. Drafts have no fingerprint, are never Outdated, cannot be adopted, and show a live preview when opened. **Save** (by a click or `scenario.save`) stamps them.
- **Drafts in the app.** Scenarios lists drafts first, labelled "Draft", with who proposed them (from record history). Opening one shows its preview overlay exactly like a locally built preview.
- **More change kinds** (additive options; `changes_json` carries their parameters):

| Kind | Parameters | Effect | Adopt writes |
|---|---|---|---|
| `add_line` | All plan-line fields (spend or cash in) | Adds a line to the forecast | Creates the line |
| `stop_line` | `target_id`, `from_month` | Ends a line before `from_month` | Sets `end_month` (one-offs after it are archived) |
| `shift_line` | `target_id`, `months` | Moves one line | Updates its start and end months |
| `scale_line` | `target_id`, `pct` | Scales one line's amount | Updates the amount |
| `scale_category` | `category`, `pct`, `program_id?`, `from_month?` | Scales matching spend lines | Updates each matching line |
| `shift_position` | `target_id`, `months` | Moves a hire's start (and end) | Updates the position |
| `change_salary` | `target_id`, `pct` or `amount` | Changes one salary (needs salary read access) | Updates `annual_salary` |
| *(existing)* | `shift_program`, `scale_program`, `stop_program`, `add_position`, `remove_position`, `move_cash_in`, `resize_cash_in`, `fx_shift` | Unchanged | Unchanged; `fx_shift` is never adopted |

- **Using a scenario as a starting point.** Any saved or adopted scenario can be copied into a new draft (`scenario.copy`) and changed. Changes that point to archived or missing records show as "unavailable" and are skipped with a note, never guessed.
- **Chat behaviour.** For "what if…", the assistant calls `scenario.evaluate` and reports the app's figures. It saves a draft or a scenario only when asked, and adopts only on an explicit request, through the review.

### 14.5 Changing the template and its forms

Most customization becomes a reviewed settings or layout change instead of code.

- **Categories.** `settings.categories` is the source of truth for which spend categories show and in what order. `category.add` returns two things in one answer: the settings update, and the additive schema change that adds the option to `plan_lines.category` and `actuals.category`. The assistant prepares that schema change with `prepare_change`, which needs the owner's schema rights. `category.hide` only hides a category; select options are never removed or renamed, so history stays readable.
- **Extra fields on any form.** Fields added to a Runway table through a reviewed schema change and listed in the binding's `extraFields` are shown by the app in that table's form and Details under "Additional fields". They are rendered by kind (text, number, money, date, select, boolean) and included in proposals and CSV. No code revision is needed. Extra fields are never used in calculations.
- **Form layout.** Extend `layoutProfile` with `forms: {<formId>: {order: [], hidden: [], labels: {}, defaults: {}}}`. It is written only through `prepare_tool_layout` (presentation only). Required fields cannot be hidden, and defaults go through the same validation. `schema.describe` lists form ids and fields.
- **Screens.** The existing layout gear (reorder, rename, hide), now also through `prepare_tool_layout` by assistants.
- **Code-level changes** (theme, charts, new screens, new calculations) use a reviewed app revision (T). The template documentation adds a **revision contract** that assistants must keep:
  - role keys and contracts (`runway.month_closes` stays `runway.v2` and a superset for Programs);
  - the calculation rules in §6;
  - frozen fields written only by the app;
  - `data-ui-state` and stable `data-action` on inputs;
  - command ids and their parity rule;
  - bounded reads.

  The platform design inspector runs at finalize. A revision that drops a declared command must say so in the review.
- **Custom copies.** `prepare_app_from_existing` keeps role and command declarations. Because of the one-writer rule, a copy binds `runway.month_closes` read-only unless the owner chooses a writer takeover.

### 14.6 Integrations (modular apps §7)

**Decision D1 (owner, 14 November 2026):** connections must stay flexible for customization, so Runway uses the platform's standard model and creates its own tables. It does not depend directly on another app's table:

- **Own table first.** Every integration role gets Runway's own table at install (the existing §7.1 behaviour; no platform change). Runway works fully from its own entries, and the user or an assistant can customize that table (extra fields, form layout) like any other Runway table.
- **Connecting is optional and read-only.** Inside Runway the user may later choose **Use its data** (platform dialog, `choose_integration_source`, human only). The role is then rebound read-only to the provider's table. The platform checks contract compatibility when connecting (`role_incompatible` refuses a mismatch), and Runway binds only the contract fields it needs. Custom fields on either side are ignored, so customizing either app never breaks the connection. The app's own entries stay in Database and nothing is merged.
- **Amounts are copied, never live-linked.** Runway's figures come only from its own plan lines. **Add to plan** copies a source row (own or provider) into a Runway plan line, keeping `source_role`, `source_record_id` and `source_version`. If the source later changes, the line shows "Source changed" and offers a reviewed update. Nothing is ever applied automatically. If the source is archived, unreadable or becomes incompatible, the line shows "Source unavailable" and keeps its values. Runway totals therefore never change because of an edit in another app.
- **If a provider becomes unavailable** (archived, access removed, contract changed), the suggestions panel says so in one line, the user can switch back to Runway's own entries in the same platform dialog, and existing plan lines are untouched.

| Role (own table at install) | Contract | Runway's own entries | Provider when connected | In the app |
|---|---|---|---|---|
| `programs.plan_items` | programs.v2 (name, program_id, item_type, end_date, status, is_key) | Runway's milestone list on new installs | Programs key milestones (read-only) | Plan → Milestones. Hint: "Works with Programs. **Add Programs**" / "Programs is in your workspace. **Use its milestones**" (`integrations.list`, `data-trialy-integration`), as in Contracts 1.0.0. `runway.milestones` is still read for 2.0/2.1 data. Milestones are references, not amounts, so these are read directly (no copy). |
| `croselection.awards` | croselection.v1 (contract fields used: supplier, program, study, awarded total, currency, start, duration, decision date) | "CRO and vendor commitments" entered in Runway | CRO Selection awards | Plan → **From other sources**: commitments not yet in the plan, with **Add to plan** (spend line or spread over the duration). |
| `contracts.obligations` | contracts.v1 (payment obligations: amount, currency, due date, counterparty, agreement, verified) | "Contract payments" entered in Runway | Contracts obligations (only `verified` rows are offered) | **Add to plan** creates a payment schedule (one-off lines sharing a `schedule_group`). |
| `fundraise.tranches` | fundraise.v1 | "Expected financing" entered in Runway | Fundraise (Investor CRM) tranches | **Add to plan** creates an equity cash-in line, contingent until committed. |

- Add `source_role`, `source_record_id` and `source_version` (text) to `runway.plan_lines`. Each source row is offered once.
- Exact field lists for awards, obligations and tranches follow `templates/contracts/outputs.json` at build time. Runway binds only fields present in the registry contract.
- Rule 3 still applies: with nothing entered or connected, the **From other sources** panel shows a one-line hint, and totals are unaffected.
- Commands expose all of this to assistants: `sources.read` (own or linked rows, with "in plan", "changed" and "unavailable" states), `source.add_to_plan` and `source.update_line` (propose), and own-entry saves through the normal `record.save` path.
- `runway.month_closes` (runway.v2) stays unchanged as Runway's output for Programs, Investor Updates and Board.
- **Read-only connected fields** (for example Programs milestones) are labelled "From *App*" and get an **Edit in *App*** button that opens the writing app at that record (§14.7, platform). Runway never writes them. Lines copied into the plan are Runway's own records and stay editable in Runway.

### 14.7 Platform: open the writing app from a read-only connected field

**Gap:** a role connected read-only can't be changed in the reading app. The server refuses the write (`role_writer`, §7.4), but the platform gives the app no way to send the user to where the field can be changed. Users see a field they can't edit, with no explanation.

**Design (platform-wide, behind `APP_COMMANDS_ENABLED` together with §14.3):**
- **Writer details in `integrations.list` and `roles.list`.** Each connected read-only role also returns `writer: {appName, canOpen}`, where `canOpen` is true only when the viewer can open the writing app. The writer app's ID is never exposed to the reading app.
- **Open button.** Apps render `<button data-trialy-open="<role> <recordId>">Edit in <App></button>`. The frame posts `trialy.open` and the host resolves the target:
  1. the app that writes the table bound to that role, opened at the record (the existing app route with `recordId`), when the viewer can open it;
  2. otherwise the record in Database, when the viewer can view that table;
  3. otherwise nothing: `canOpen` is false and apps show the label without a button.

  Permissions are checked again when the button is clicked. In Claude and ChatGPT the host opens the target app in the extension, or returns its platform link.
- **Standard label.** Apps show "From *App*" next to read-only connected values, using the writer's `appName`. Apps never invent the name.
- **Assistants.** A write attempted through the reading app (`run_app_command`, or a proposal touching a read-only role) is refused with a structured error `role_read_only: {role, recordId, writerAppName}`. Assistants then prepare the change in the writing app under that app's own review, through its commands when it declares them, otherwise with `prepare_change` on that table. They tell the user where the change will be made. They never retry through the reading app.
- **No writes across apps.** Opening the writer is navigation only. The reading app's data, drafts and state are kept when the user returns.
- **Guidance.** Document `data-trialy-open`, the writer fields and `role_read_only` in both template guidance copies, next to `data-trialy-integration`.

### 14.8 Automations (app automations, RA1–RA5)

Declared in the catalog entry. All install recommendations start selected; the user can opt out at install, and nothing breaks the app.

| Key | List | Kind | Trigger | Content |
|---|---|---|---|---|
| `runway_below_target` | `recommendedAutomations` | email | database, `role: runway.month_closes`, field `runway_status` becomes `below_target` | Fixed text from `AUTOMATION_RECIPES.md` §1 plus fields `month`, `runway_months`, `cash_out_month` |
| `month_close_reminder` | `recommendedAutomations` | email | calendar, monthly, 5th Monday–Friday business day, 09:00 Europe/Berlin | "Last month is not closed yet. Open Runway → Actuals → Close month." |
| `monthly_fx_rates` | `recommendedAutomations` | research | calendar, monthly, 3rd business day, Europe/Berlin | Objective and instructions from `AUTOMATION_RECIPES.md` §2. `readBindings`: `runway.settings` (`enabled_currencies`), `runway.fx_rates` (`month`, `currency`). `writeBindings` (required by PR #169): `[{role: runway.fx_rates, fields: [month, currency, rate_per_eur, source, source_ref], allowCreate: true, allowUpdate: false}]`. Results are saved, never proposal-only (see below). |
| `monthly_runway_digest` | `recommendedAutomations` | email | database, `role: runway.month_closes`, event `created` | **Built-in (owner decision D3).** No summary function is needed: the email uses the closed month's own frozen fields (`month`, `closing_balance`, `currency`, `runway_months`, `cash_out_month`, `runway_status`, `commentary`) and links to Actuals → Snapshots. Figures come from the snapshot the app froze, never from the assistant. |

**Effect of PR #169 (required app storage):**
- Research automations must save their results in the app database, and the write permission is part of the same install or setup approval. There is no proposal-only mode for new automations.
- `monthly_fx_rates` therefore declares its `writeBindings` explicitly. Without them, the platform would default to every writable field in Runway. The binding is limited to creating `runway.fx_rates` rows: `allowUpdate: false` keeps the rule that existing rates are never changed.
- A run is `completed` only with verified save receipts. When every rate already exists the result is `no_update`, and when the ECB source is unavailable it is `blocked`. Nothing is written in either case.
- If the runner's assistant cannot write `runway.fx_rates` (for example, it was set to "Can read" in the install dialog), the automation shows **Needs setup** and the app is unaffected. The install dialog should show this next to the automation row.
- Replace the "for review or under a narrow standing grant" wording in §4 step 7, §7, §8 and `AUTOMATION_RECIPES.md` with "saved under the bounded write permission approved with the automation".
- The three email recipes are not affected.

Assistants manage these through the existing tools (`read_app_automation_features`, `prepare_app_automation_feature`, `prepare_app_monitoring`, `prepare_app_action`, `confirm_app_service_review`) under the existing ownership rules. Update `AUTOMATION_RECIPES.md` and `documentation.tasks` to match, and change `tasks.mode` to describe "recommended at install; zero automations is supported".

### 14.9 Documentation and catalog text

- `instructions`:
  - steps 2 and 9 describe the install dialog (`prepare_data_access` prefill, never confirm) and install-time automations;
  - step 6 becomes `scenario.evaluate` → `scenario.save` (draft or saved) → `scenario.adopt` on request;
  - add a commands step: discover with `list_app_commands`, read results only through read commands, propose through propose commands.
- `quickStart`: pin 2.2.0. `limitations`: remove the "Use installer creates new tables for every role" item and the two-review scenario item.
- `examples`: add evaluate → save draft → adopt; close a month by command; add a category; add a field to the actuals form; hide a form field; add a CRO award to the plan.
- README, QA and the browser test are updated for every new command, kind and integration.

### 14.10 Acceptance criteria (in addition to §12)

1. For every row in §14.2 an assistant can complete the action in Claude and in ChatGPT, and the proposal matches the click path byte for byte for the same input.
2. `summary.read`, `scenario.evaluate` and `cashflow.read` return exactly the figures the screens show (hand reconciliation dataset in §12.11).
3. An assistant-saved scenario is not Outdated, adopts after review, and becomes Outdated after a later forecast change.
4. A direct `prepare_change` draft scenario previews in the app and cannot be adopted until saved.
5. Each new change kind previews, compares and adopts correctly, and archived targets are skipped with a note.
6. `month.close` and `budget.lock` by command freeze the same snapshot and budget as the UI, and closing out of order is rejected.
7. With `annual_salary` restricted for the assistant, no command result contains a salary or live people cost.
8. A viewer's assistant can run read commands only; propose commands are not listed and are refused.
9. No command commits without a person's confirmation; stale versions are rejected; replaying a `requestKey` creates no duplicate review.
10. Adding a category, an extra field and a form layout change through an assistant shows correctly at 1440 and 390 px, with no code revision.
11. Integrations: install alone and use only own entries; connect Programs inside the app; add a CRO award, an obligation and a tranche to the plan; edit the source (the line shows "Source changed" and nothing changes until a reviewed update); add custom fields to both Runway's own table and the provider's table (the connection keeps working); archive the source; delete a partner app; switch back to own entries. Runway keeps working, totals change only through Runway's own reviewed writes, and every state is labelled.
12. Install with all automations selected, with some opted out, and with no runner: the app is saved in every case, and states show active, opted out or Needs setup. `monthly_fx_rates` creates only new `runway.fx_rates` rows with verified receipts, never updates an existing rate, writes no other table, and shows Needs setup when the assistant cannot write that table. `monthly_runway_digest` sends the frozen snapshot figures of the closed month.
13. The modular-apps rule 9 test passes, and Programs 2.1.0 still reads 2.2.0 snapshots.
14. A Programs milestone shown in Runway is labelled "From Programs". **Edit in Programs** opens Programs at that milestone. A viewer without access to Programs sees the label but no button (or the Database record when they can view the table). Runway's draft input survives the round trip.
15. An assistant changing a Programs milestone through Runway gets `role_read_only` naming Programs, then prepares the change in Programs under its review. Runway never writes `programs.plan_items` when it is connected to Programs.

### 14.11 Delivery order and decisions

1. **P1 platform:** app commands (§14.3) and open-the-writing-app (§14.7), behind `APP_COMMANDS_ENABLED`, with tests, guidance and MCP descriptions.
2. **R1 Runway 2.2.0 draft:** commands, scenarios (§14.4) and customization (§14.5).
3. **R2:** integrations (§14.6).
4. **R3:** automation declarations (§14.8) and documentation (§14.9).
5. **Release:** cross-host acceptance (§14.10) in web, Claude and ChatGPT; then owner approval of the catalog version, and each feature switch enabled separately.

**Owner decisions (14 November 2026):**
- **D1 — Own tables, optional read-only connection, copied amounts.** Accepted with the owner's condition that connections stay flexible for customization: see §14.6. No platform change is needed.
- **D2 — App commands are a platform-wide capability.** Accepted: any app can declare commands; Runway is the first user.
- **D3 — The monthly digest is a built-in automation.** Accepted: it is offered at install and built from the frozen snapshot fields, with no summary function (§14.8).

### 14.12 Implementation record (14 November 2026)

**Platform (behind `APP_COMMANDS_ENABLED`, default off):**
- `src/workspace/app-commands.ts`: the `appCommands` declaration (read as data, strict on every app save), the input schema subset, and `list_app_commands`, `run_app_command` (MCP and web). A command runs the saved app with `{kind:"command"}` as the caller; propose and layout commands become ordinary reviews confirmed with `confirm_workspace_change`. The same `requestKey` returns the same review. Every run is audited (`app.command`).
- `src/workspace/service.ts`: commands cannot queue functions, call connectors or reach exchanges; `layout.propose` accepts a custom layout profile; `roles.list` and `integrations.list` add `writer:{appName,canOpen}`; writes to a read-only or linked role are refused with `role_read_only` and `details:{role,recordId,writerAppName}`.
- `resolve_app_open` and `data-trialy-open` (frame, `FrontendCodeRuntime`): Edit in App opens the writing app at the record, or Database.
- `src/shared/custom-layout.ts`: layout profiles may carry `labels` and `defaults` keyed `group:field`.
- `AppError` details reach MCP results (`structuredContent.error.details`) and the web API.
- Size limits raised so the new version fits: template entry source 180,000 → 240,000 characters, catalog file 300,000 → 380,000 bytes, saved component source 200,000 → 260,000.
- Template guidance 1.3.28 (both guidance files).

**Runway 2.2.0 (draft):** new package in `templates/source/cash-runway/`. 2.1.0 is archived byte-for-byte under `archive/2.1.0/` and still installs from there. `templates/apps/life.cash-runway-2.2.0.json` is generated by `scripts/build-cash-runway-template.mjs`. Everything in §14.2–§14.9 is built, including the four recommended automations.

**Tests:** `tests/app-commands.test.ts` (platform), `tests/cash-runway-commands.test.ts` (QuickJS: every command, click-path parity, read results against the screens, scenarios and the new change kinds, close/lock/commentary, salary and read-only rules, customization, integrations, production design inspector), and `tests/cash-runway-commands-integration.test.ts` (real installer and review path; Programs linked inside Runway with `role_read_only` and Edit in Programs).

**Still open (release gates):** acceptance criteria 1 and 10–12 in web, Claude and ChatGPT on real hosts; owner approval of the 2.2.0 catalog version; enabling `APP_COMMANDS_ENABLED`; a verified unattended rates cycle before relying on that automation.
