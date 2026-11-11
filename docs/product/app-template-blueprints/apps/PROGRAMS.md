# Programs — final app scope (BT2-02)

*Milestones, dependencies, risks and decisions across all programs.*

**Status:** Final scope for build, 10 November 2026. Part of [Biotech apps v2](../BIOTECH_v2.md) (rank 2). Replaces the v1 `project-oversight` 1.0.1 package as a new major version (`life.project-oversight` 2.0.0; display name **Programs**). No existing users; no migration needed.

**Governing contracts:** same as [Runway](RUNWAY.md#runway--final-app-scope-bt2-01): project context, template authoring and usage guidance (hosted version, all `nextOffset`s), shared build contract, interface rules, access control, write authorization, field capabilities, shared data. They win on any conflict.


**Modularity:** follows [modular apps and shared data](../../MODULAR_APPS_AND_SHARED_DATA.md) — shared tables use the core data contract v1 role keys; cross-app features (Runway ↔ Programs) degrade gracefully; app or tab deletion never deletes data; reinstall reconnects by default. Include the §3 rule 9 acceptance test.

---

## 1. Evidence: what small biotechs need from program management

Sources read 10 November 2026: Smartsheet (life-sciences pages, help center, customer stories, reviews), life-science portfolio tools (OnePlan, Planisware, Cora, cplace, Celoxis), drug-development-plan guidance and biotech program-manager role descriptions. Vendor and advisor sources; not a survey. **Validate with design partners before build.**

| Need | Signal | Confidence |
|---|---|---|
| One **integrated timeline per program across functions** (CMC, nonclinical, clinical, regulatory) | Drug development plan guidance gives the program manager the master integrated timeline, critical path and dependencies, stage gates, risk register and assumptions log; OnePlan teaches integrated plans by stage and function. | High |
| **Critical path and dependencies** | Smartsheet's Gantt with dependencies highlights the critical path (the longest chain of tasks that sets the end date); consultants read it first. | High |
| **Baseline vs current dates** (slippage) | Smartsheet baselines store read-only planned dates beside the live schedule. | High |
| **RAID log** (risks, assumptions, issues, decisions) and **status updates for leadership** | A rare-disease biotech's Smartsheet PMO standardised overview, timeline, RAID log, budget and progress updates; another program used plan and RAID templates with executive dashboards. | High |
| **Stage gates / go-no-go decisions** | Program-management guidance stresses risk registers, contingency plans and go/no-go criteria from early stages. | Medium–high |
| Tools actually used by small biotechs | Role descriptions list MS Project and Smartsheet, with Monday.com at smaller companies; pre-commercial PMs cover several functions at once. | Medium |
| Portfolio prioritisation, resource capacity, what-if across programs | Core of enterprise PPM (Planisware, OnePlan, Celoxis). | Low for < 50 people → **not in scope** |

**Common complaints about the reference (Smartsheet):** learning curve; "looks like a spreadsheet"; Gantt hard to present (exported elsewhere); slow with many cross-linked sheets; permissions confusing; price per user; advanced features in higher tiers.

---

## 2. Reference apps

| App | Role | What we take |
|---|---|---|
| **Smartsheet** (primary) | The tool small and mid biotechs actually use for program management; used by companies such as Precision BioSciences and Karyopharm. | Gantt with dependencies, critical path, baselines; dashboards rolling up program status; RAID log and status-report templates. |
| **OnePlan / Planisware (life-sciences PPM)** (domain) | Enterprise drug-development PPM. | The vocabulary and structure: assets/programs, development stages, functional sub-plans (CMC, nonclinical, clinical, regulatory), stage gates. Not their portfolio optimisation or resource engines. |
| **Drug Development Plan (IDP) practice** | How programs are planned on paper. | Master timeline, critical path, gates, risk register, assumptions log. |

**Our gap versus them:** Smartsheet is a blank grid that a PM must configure (and that then looks like a spreadsheet); life-science PPM tools are enterprise projects. Programs ships the biotech structure ready on day one, draws a presentable timeline, and connects milestones to cash (Runway) — a link none of them has.

---

## 3. Scope

**Cut rule:** used at least monthly by a 10–50 person biotech, or needed for a board meeting, a gate decision or a raise.

**In (v2.0)**

| Area | Features |
|---|---|
| Programs | Program/asset records: name, indication, modality, stage, lead, health (RAG) with dated rationale. Shared with Runway and other apps. |
| Plan | Milestones and key activities per program, each with function (CMC, Nonclinical, Clinical, Regulatory, Other), owner, start/end, baseline dates, status, one predecessor (finish-to-start). |
| Timeline | Integrated Gantt by program and function; milestones as diamonds; baseline ghost bars; today line; critical path highlighted. |
| Slips | Changing a committed date requires a reason; every change is kept in a slip history. |
| Gates & decisions | Stage gates (e.g. candidate selection, IND/CTA, Phase 2 start) with criteria, target date and outcome (go / no-go / conditional); other key decisions with options and rationale. |
| RAID | Risks, assumptions, issues and external dependencies: likelihood, impact, owner, mitigation, next review, status. |
| Status | Monthly program update (health, summary, next steps), rolled into a leadership report that is frozen when saved. |

**Out:** task-level project management (use the team's task tool), resource and capacity planning, portfolio prioritisation/rNPV, budgets (Runway owns money), timesheets, Kanban boards, document approval workflows, deliverable evidence approvals, department hierarchy, percent-complete roll-ups, multiple predecessors and lag types, GxP/Part 11 claims.

**Small features that delight:**
1. **Cash at each milestone** (when Runway is used): the timeline shows forecast cash and cushion at each key milestone, coloured as in Runway.
2. **"What drives this date?"** Click a milestone to highlight its driving chain of predecessors.
3. **Slip story:** each milestone shows original vs current date and the reasons for every move, ready for a board slide.
4. **Next 90 days:** one list of milestones, gates and decisions due soon across all programs.
5. **Gate readiness:** criteria checklist with met / not met / open, and days to the gate.
6. **Present mode:** a clean, read-only one-page timeline per program for board or partner meetings, exportable as an image.
7. **Status draft by the assistant** from what changed since last month (slips, closed risks, decisions).

---

## 4. Screens (7)

Custom `frontend-js` app on the Vivid kit, theme **plum** (`#795094`) with graphite hero (`#2B3546`), declared in `templateLayoutSchema` (reorder/rename/hide via the layout gear). Four capabilities each.

| # | Screen (id) | Capabilities |
|---|---|---|
| 1 | **Overview** (`overview`) | (1) Program cards: stage, health with rationale date, next milestone and days to it, open high risks. (2) Next 90 days across programs. (3) Slips this quarter (count, total days, top reasons). (4) Exceptions: missing monthly update, overdue milestones, gates without criteria, risks past review date. |
| 2 | **Timeline** (`timeline`) | (1) Gantt of milestones and activities by program and function lane, baseline ghost bars, today line. (2) Critical path and "what drives this date" highlight. (3) Edit dates by opening the item (reviewed; reason required for slips); bars never move by drag without review. (4) Present mode and image export; cash markers when Runway is available. |
| 3 | **Plan** (`plan`) | (1) Table of milestones and activities with function, owner, dates, baseline, status, predecessor. (2) Add/edit item; set or reset baseline (reset needs a reason). (3) Filters: program, function, status, owner, date window. (4) Slip history per item. |
| 4 | **Gates & decisions** (`decisions`) | (1) Upcoming gates with criteria checklist and readiness. (2) Record outcome: go / no-go / conditional, date, approver, rationale. (3) Other decisions log with options and rationale. (4) Link decisions to the milestones or risks they affect. |
| 5 | **RAID** (`raid`) | (1) Register of risks, assumptions, issues, dependencies with likelihood × impact. (2) Heat matrix (counts, click to filter). (3) Owner, mitigation, next review, status. (4) Promote an assumption to a risk, or a risk to an issue, keeping history. |
| 6 | **Updates** (`updates`) | (1) Monthly update per program: health, rationale, summary, next steps. (2) Leadership report for a month assembled from updates, milestones, slips, gates and top risks. (3) Save report (frozen) and export. (4) Report archive. |
| 7 | **Settings** (`settings`) | (1) Functions and stages lists. (2) Health definitions (what Green/Amber/Red mean here). (3) Update day and "due soon" window (default 90 days). (4) Links to platform Access and Automations. |

Shared behaviours, chart rules, responsive rules and states as in [Runway §3](RUNWAY.md#3-screens-7). The Gantt scrolls horizontally inside its card on small screens; the page keeps one vertical scroll.

---

## 5. Workflows

1. **Set up a program (with the assistant).** The user shares an existing development plan, slide or spreadsheet, or describes it. The assistant proposes the program record, 10–40 milestones/activities by function with dates and predecessors, the first gates and top risks. Reviewed save. The baseline is set when the user confirms the plan.
2. **Weekly glance.** Overview → next 90 days and exceptions.
3. **A date moves.** Open the item → new date + reason → reviewed save writes the item and a slip record. Critical path and downstream dates are shown as a preview before saving; dependent dates are only changed if the user accepts them in the same review.
4. **Gate.** Before a gate, the readiness checklist shows criteria status; the team records the outcome and rationale; follow-up milestones are created or cancelled in the same review.
5. **Monthly update and leadership report.** Each program lead (or the assistant, as a draft) writes the update; the PM assembles and saves the month's report; it feeds Investor Updates (06) and Board (14).
6. **Risk review.** Filter risks past review date; update and close; the heat matrix and Overview update.

---

## 6. Data model

Principles as in [Runway §5](RUNWAY.md#5-data-model): reuse shared records, scalar `multiple:false`, snake_case, IDs for relationships, explicit currency (none needed here), empty tables at install, reviewed writes with versions.

**Shared record types (reuse-or-create at install):** `programs` (this app is the natural owner; Runway and others reuse it), `people` (workspace Person, optional for owners). Owners can also be plain text names for teams that do not maintain a people table.

| Table | Purpose | Key fields (kind) |
|---|---|---|
| `programs` (shared) | Assets/programs | name (text*), code (text), indication (text), modality (select), stage (select*), lead (text), health (select: unassessed / green / amber / red), health_rationale (text), health_date (date), status (select: active / paused / stopped / partnered), archived (boolean) |
| `plan_items` | Milestones and key activities | name (text*), program_id (text*, UUID→programs), item_type (select*: milestone / activity), function (select*), owner (text), start_date (date), end_date (date*; for milestones the milestone date), baseline_start (date), baseline_end (date), status (select*: planned / in_progress / done / at_risk / cancelled), predecessor_id (text, UUID→plan_items), is_key (boolean; shown on Overview and to Runway), notes (text), archived (boolean) |
| `slips` | History of committed date changes | plan_item_id (text*), changed_on (date*), old_end (date*), new_end (date*), days (number*), reason (select*: scientific / CRO or vendor / regulatory / manufacturing / funding / other), detail (text) |
| `decisions` | Gates and other decisions | name (text*), program_id (text*), kind (select*: gate / decision), target_date (date), criteria (text; one criterion per line with met / not met / open), outcome (select: pending / go / no_go / conditional / decided), decided_on (date), approver (text), options (text), rationale (text), linked_item_id (text), archived (boolean) |
| `raid` | Risks, assumptions, issues, dependencies | name (text*), program_id (text), raid_type (select*: risk / assumption / issue / dependency), likelihood (select: low / medium / high), impact (select: low / medium / high), owner (text), mitigation (text), next_review (date), status (select*: open / monitoring / closed), linked_item_id (text), archived (boolean) |
| `updates` | Monthly program updates | program_id (text*), month (date*), health (select*), rationale (text), summary (text), next_steps (text), author (text) |
| `reports` | Saved leadership reports | month (date*), title (text*), narrative (text), contents (text, frozen JSON of included items), saved_on (date) |
| `program_settings` (one row) | Business settings | functions (text, list), stages (text, list), health_definitions (text), due_soon_days (number, default 90), update_day (number, default 5) |

`*` = required. Rule: when a `planned` or `in_progress` item with a baseline gets a later `end_date`, the app proposes a `slips` record in the same review (reason required). Reports are frozen like Runway snapshots.

---

## 7. Calculation rules

- **Slip** = end_date − baseline_end (calendar days); cumulative per item from `slips`. Items without a baseline show "no baseline", never zero.
- **Critical path** per program = longest chain by end date through `predecessor_id` links ending at the latest key milestone (finish-to-start, no lag). Cycles are rejected at save.
- **Driving path** of an item = its chain of predecessors.
- **Downstream impact preview** = for a moved item, each successor's earliest start = predecessor's new end + 1 day if later than its current start; shown, not applied unless accepted.
- **Due soon** = items, gates and decisions with dates in [as-of date, as-of + due_soon_days]. The as-of date is today's date if the app runtime provides it; otherwise an as-of date control (default: end of the latest updated month). Derived database fields never use the clock; verify the runtime behaviour during build.
- **Overdue** = status not done/cancelled and end_date before the as-of date.
- **On-time rate** (Overview, quarter) = milestones done on or before baseline_end ÷ milestones done in the quarter that had a baseline.
- **Risk score** = likelihood × impact on a 3 × 3 grid; displayed as the cell, not a fake percentage.
- **Health** is always a human judgement with a date and rationale; the app never sets it automatically. It flags health older than 45 days.
- **Limits:** bounded reads (≤ 600–800 rows per role, as in v1); typical size is 1–5 programs and < 300 plan items. Partial reads disable critical path and totals and say so.

---

## 8. Access control and AI connections

- **App level** in Access → Projects, view/edit as usual. Read-only sharing for board members via the existing write restriction. Custom `frontend-js` app → no per-tab protection advertised.
- **Confidential programs** (e.g. an asset in partnering talks): put a separate Programs app with **separate data** in a restricted project (explicit "separate data" choice at install). Hiding a program in the UI is not security.
- **AI principals:** each user's Claude and ChatGPT connections are separate Access rows, inheriting and only narrowing the user's rights. Defaults: AI reads and proposes; every AI write is reviewed. No standing grants recommended.
- **Revocation** clears cached output immediately.

---

## 9. Customization (users, Claude, ChatGPT)

| What | How | Path |
|---|---|---|
| Reorder, rename, hide screens; heading | Layout gear or assistant | `tracker:layout` → `prepare_tool_layout` |
| Functions, stages, health definitions, due-soon window, update day | Settings or assistant | Reviewed write to `program_settings` |
| Reuse programs from another app / keep separate | Install or later | Explicit shared-or-separate choice |
| Extra fields (e.g. CRO on activities, region on milestones) | Assistant | Reviewed schema change + reviewed source revision |
| Theme | Assistant | Reviewed source revision |
| Sharing and AI access | Access page (owner) | Existing access review |

**Optional automations (none is fully supported):**
1. **Monthly update reminder (email, TrialAgents):** calendar, monthly on `update_day`, Europe/Berlin; to program leads who are registered members with app access; lists programs without an update for the month.
2. **Slip notice (email, TrialAgents):** trigger on creation of a `slips` record for an item with `is_key = true`; to the owner; states item, old/new date, days, reason.
3. **Monthly status draft (research worker, Claude or ChatGPT runner):** after the update day, reads last month's changes (slips, decisions, closed/new risks) and saves draft `updates` (status draft, text only) for human review. Optional; writes only to `updates` under a narrow grant.

---

## 10. Fit with other apps

| App | Relationship |
|---|---|
| Runway (01) | Reuses `programs`; reads key milestones (`is_key`) for runway-to-milestone; Programs shows cash at milestones when the user can read Runway snapshots. |
| Contracts (04), CRO Oversight (16) | Activities can reference the vendor or agreement in notes now; a typed link is a later addition. |
| Investor Updates (06), Board (14) | Read saved `reports` and key milestone status. |
| Landscape (10) | Competitor readouts can be shown alongside own milestones (later). |
| Regulatory (20) | Agency meetings and designations can create or move regulatory milestones (later). |

All links optional; Programs works alone.

---

## 11. Assistant behaviour

- Build a first plan from a shared document or description (one reviewed proposal).
- Explain the critical path and what a slip does downstream.
- Draft monthly updates and the leadership report from recorded changes; never invent progress.
- Prepare a gate pack: criteria status, open risks, recent decisions.
- Never set health or gate outcomes on its own; never write without review.
- **`whenToUse`:** a small biotech needs one integrated view of program milestones, dependencies, gates, risks and monthly status without enterprise PPM. **`whenNotToUse`:** task management, resource planning, portfolio optimisation, budgets, validated GxP project records, patient data.

---

## 12. Changes from v1 `project-oversight` 1.0.1

| v1 | v2 |
|---|---|
| Generic projects with department and budget | Biotech programs/assets (indication, modality, stage); money moved to Runway |
| Workstreams + milestones + deliverables (three tables) | One `plan_items` table (milestone / activity) with function lanes and a predecessor |
| Milestone dependency field, no critical path | Critical path, driving path, downstream preview |
| Baseline only | Baseline plus slip history with reasons |
| Risks/issues and decisions | RAID (adds assumptions, dependencies) and stage gates with criteria |
| Reports with review workflow | Frozen monthly leadership reports, no review workflow |
| Six screens | Seven screens |

---

## 13. Package checklist and acceptance criteria

**Package:** new immutable `templates/apps/life.project-oversight-2.0.0.json` (draft until approved); `catalog.metadata.json` with full documentation fields (dataContract incl. shared `programs` role and slip rule; interactionContract; lifecycle; limitations: single predecessor, no resources, app-level access; examples; tasks mode `optional` with the three recipes and a no-automation path); `schema.example.json` (8 tables); fictional `demo_data.json`; `templateLayoutSchema` with the seven ids; reviewed draft forms (`data-ui-state`, stable `data-action`); build script `--check`; browser test.

**Acceptance (beyond the shared contract):**
1. A user gets a first integrated timeline from a shared plan in one session; the baseline is set only after confirmation.
2. Moving a baselined milestone later requires a reason and creates exactly one slip record in the same reviewed save.
3. The critical path matches a hand-computed fictional plan (two programs, 25 items, one cross-function chain); a cycle is rejected.
4. Downstream preview lists affected successors; nothing else changes unless accepted.
5. Health is never set by the app; health older than 45 days is flagged.
6. A saved report never changes after later edits.
7. With Runway present and readable, cash markers appear at key milestones; without access or without Runway, the timeline works and shows no cash data.
8. Board viewer with write restriction can open Present mode and reports but cannot change records; an AI connection with edit off can only read.
9. The app works with no automation; automation failures never affect it.
10. Desktop 1440 / mobile 390: Gantt usable (horizontal scroll inside its card), no page overflow.

**Open for design partners:** single predecessor enough? Monthly update cadence right? Is "key activity" level detail enough, or do teams expect task-level tracking here?
