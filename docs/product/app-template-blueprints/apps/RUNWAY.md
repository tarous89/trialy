# Runway — final app scope (BT2-01)

*Cash, burn and runway by program, with what-if scenarios.*

**Status:** Final scope for build, 10 November 2026. Part of [Biotech apps v2](../BIOTECH_v2.md) (rank 1). Replaces the v1 `cash-runway` 1.2.2 package as a new major version (`life.cash-runway` 2.0.0; display name **Runway**). There are no existing users, so no compatibility or migration with v1 data is required.

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
7. **Optional: monthly exchange rates.** Automation that adds last month's ECB rates for review or under a narrow standing grant (see §6 and §8).

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
- **AI principals:** each user's Claude and ChatGPT connections are separate rows in Access that inherit that user's rights and can only be narrowed. Recommended defaults: AI may read Runway tables and propose changes; every AI write needs the user's review; AI read access to `positions.annual_salary` can be switched off independently if wanted. A narrow, expiring standing write grant is recommended only for `fx_rates` (if the rates automation is used).
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
