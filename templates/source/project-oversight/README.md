# Programs 3.0.0 (`life.project-oversight`)

## 3.0.0: rebuilt on the kit and the v2 app contract (draft)

Package 7.3 / 7.4 of the platform decisions of 19 November 2026 (G2–G8, G11, G14, P3–P5). **3.0.0 is a draft**: it is not in `templates/catalog-seed.json` until the owner approves it (O4). 2.2.1 stays published; its package is archived byte-for-byte under `archive/2.2.1/`, its installer entry points there and the builder rebuilds it from the archive (`--check` proves its JSON and preview are unchanged).

- **Same data, helpers, automations and commands.** The installer schema is byte-identical to 2.2.1, the `functions` (digest helpers), `recommendedAutomations`, `automationFeatures`, the 27 app command names and inputs, the `programs.v2` output fields and `tableMap` are unchanged, so installed 2.2.0 and 2.2.1 copies can be upgraded by their owner (`upgradeFrom: ["2.2.0","2.2.1"]`). Options: `demoLabel` was dropped (the gallery preview labels itself); `heading`, `tableMap`, `pageSize`, `layoutProfile`, `readOnly` and `asOfOverride` stay.
- **v2 contract.** Line 1 of the source is `'use trialagents v2';`, then `templateLayoutSchema` and `appCommands`. The kit (`kit.*`, `k-` styles) comes from the runtime; `programs.css` holds only the Gantt, matrix and a few layout rules, written against `--k-*` tokens.
- **No own header, banner or footer.** Messages are returned as `output.notice`; a refused value comes back with an error notice. Partial reads are labelled in a line of the screen, never as zero.
- **Saving.** Values are edited where they are shown (`kit.cell`) and saved at once with `records.save`, sending the version shown when editing started; side panels (`kit.panel`) create records and edit many fields; Plan has a board by status (`kit.board`, drag and drop or the card menu). Delete is `archive_record`; Undo for the person's own last action (`undo.list` after a save, `undo.run` on click). No "prepared for review" texts remain. Opening never writes.
- **Screens.** Overview, Timeline, Plan, Gates & decisions, RAID, Updates, Programs, Team, Cash forecast and (owners only) Settings, in the kit's side navigation. The Programs and Program team lists and the cash forecast moved out of Settings to their own screens; the access, automation and "where data comes from" notes are gone; Settings holds only business choices (function lanes, stages, due-soon window, update day, reminder lead time, health definitions) and is shown to owners only (`input.appRole`).
- **No IDs on screen.** Team members show by name with "Linked" or "Name only"; the workspace member ID is set by Claude or ChatGPT (`team.save`) and never shown or typed. Record IDs and versions are no longer displayed.
- **Working context.** The Program picker is returned as `output.context {program}` and read from `input.context`; it filters every screen and is remembered for each person.
- **Each screen reads only its data** in one `records.readMany` (Settings reads programs and settings only; Cash forecast reads the cash table). Pending reads render as "Loading…".
- **Removed:** the as-of control (the runtime date is used; `asOfOverride` stays for previews and tests), Present mode (its key-milestone table is on the Timeline when one program is selected), the per-row "•••" menus and confirmation dialogs (archive, baseline, promote and reminders save directly, with Undo).
- **Layout profiles.** `templateLayoutSchema` now names the screens overview, timeline, plan, decisions, raid, updates, programs, team (at most eight; Cash forecast and Settings are always available). A 2.2.x profile that names the old `settings` screen is not valid for 3.0.0 and the default layout applies until `layout.save` writes a new one.

Tests: `tests/programs-v2.test.ts` (every screen, inline saves, slips, board, Settings by role, empty screens, pending reads, context, Undo, commands, the design check under current rules at 1440/400/390 px) and `tests/programs-v2-integration.test.ts` (install, open, one direct save, a stale save refused, one saving command). The 2.x tests are unchanged.

## 2.2.0 and earlier

**Programs 2.2.0 (`life.project-oversight`)**

Milestones, dependencies, risks and decisions across all programs. Scope: [PROGRAMS.md](../../../docs/product/app-template-blueprints/apps/PROGRAMS.md). It follows [modular apps and shared data](../../../docs/product/MODULAR_APPS_AND_SHARED_DATA.md). It replaced Project Oversight 1.0.1 as a new major version. Released packages are archived byte-for-byte under `archive/<version>/` (1.0.1, 2.0.0, 2.1.0); their catalog JSON is unchanged. Saved apps are not migrated. **2.2.0 is published** (owner approval, 15 November 2026; seed entry and migration 075 withdrawing 2.1.0) (scope: [PROGRAMS.md §14](../../../docs/product/app-template-blueprints/apps/PROGRAMS.md#14-programs-220-assistant-control-team-notifications-and-the-weekly-digest)).

## Files

| File | Purpose |
| --- | --- |
| `programs.source.js` | The `frontend-js` renderer: seven screens, critical path, slips, downstream preview, gates, RAID, frozen reports, Runway link, program team, weekly digests; reviewed `records.propose` writes. Line 1 declares `templateLayoutSchema`, line 2 `appCommands` (27 commands); `/*@digest-core*/` marks where the build inlines the digest core. |
| `functions/` | `digest-core.js` (the one "needs attention" rule), `reader.js` and the two E7 helper wrappers `digest-brief.js` and `digest-email.js`. The build joins them into the catalog `functions` and inlines the core into the app. |
| `programs.css` | Vivid plum theme (`#795094`) with a graphite hero (`#2B3546`), light canvas, one page scroll, Gantt scrolling inside its card, responsive 390–1440 px. |
| `catalog.metadata.json` | Catalog fields: options, instructions and the MCP-served documentation (data and interaction contracts, lifecycle, limitations, examples, tasks). |
| `schema.example.json` | Installer schema, registered in `templates/catalog-installers.json`: ten tables at install (2.2.0 adds `programs.team` and `programs.digests`) plus two optional connected roles (see below). |
| `demo_data.json` | Fictional preview records only: two programs, 25 plan items (also the hand-computed critical-path plan in the tests), one fictional Runway snapshot. Never seed it into a workspace. |
| `programs.preview.html` | Generated offline preview (gallery screenshot source), fixed as of 11 Nov 2026. |
| `QA.md` | Commands, results, hand calculations, acceptance criteria and unverified boundaries. |
| `AUTOMATION_RECIPES.md` | The six install recommendations, the digest without AI and the no-automation path. |

Edit the source, CSS, functions and metadata, then run `node scripts/build-project-template.mjs`. This regenerates `templates/apps/life.project-oversight-2.2.0.json` (minified source, under 180,000 characters) and the preview; `--check` runs in `npm run build`. Do not edit a released version: publish a new version and archive the previous package first. After a catalog or preview change, regenerate the gallery screenshot and manifest entry (`node scripts/build-template-screenshots.mjs`).

## Roles, shared data and modularity

`tableMap` uses stable role keys (rule 5):

- **Core shared tables** (core data contract v1, [`templates/core-contract/v1.json`](../../core-contract/v1.json)): `programs` (Programs owns the optional `health`, `health_rationale` and `health_date` fields) and `people` (optional, read only here; owner fields stay plain-text names, with a "Pick from People" helper when the table is connected).
- **App tables:** `programs.plan_items`, `programs.slips`, `programs.decisions`, `programs.raid`, `programs.updates`, `programs.reports`, `programs.settings` (one row), `programs.team` and `programs.digests` (2.2.0; digests are written only by the weekly digest research).
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
- 2.2.0: every action is also an app command that replays the same events (`handle`), so a command and a click propose identical changes; proposals inside a command are buffered and sent once, so a failing step leaves no partial review.

## 2.1.0 — cash forecast and Runway integration

Cash at key milestones no longer requires Runway. Settings has a **Cash forecast**: closing cash by month, entered by hand (role `runway.month_closes`, marked `integration`, in Programs' own table). A subtle line offers **Add Runway** when Runway is not in the workspace, or **Use its cash data** once it is; the platform dialog shows both sources and the user picks one, used from then on (Runway's snapshots, read only). Manual entries stay in Database; nothing is merged. 2.0.0 is archived unchanged under `archive/2.0.0/`. The owner approved 2.1.0 on 12 November 2026 (seed and migration 062).


## 2.2.0: assistant control, team notifications and the weekly digest

Published 15 November 2026 ([PROGRAMS.md §14](../../../docs/product/app-template-blueprints/apps/PROGRAMS.md#14-programs-220-assistant-control-team-notifications-and-the-weekly-digest)). Summary:

- **App commands.** 27 commands with click parity (13 read, 13 propose, 1 layout); form groups and layout labels/defaults; extra fields through `extraFields`/`writableExtra`.
- **Edit in Runway.** The linked cash forecast is labelled with the writing app and offers Edit in Runway when the user may open it; commands cannot write it while it is linked.
- **Program team.** New `programs.team` table. The app keeps `owner_member_id`, `assigned_on` and `remind_on` on items and RAID entries, and `added_on` on team rows. `reminder_days` in Settings (default 7). Update owners and reminders catches up after a change.
- **Automations.** Six install recommendations, on by default: the AI weekly digest (saves a `programs.digests` row, then emails the owner, only when something needs attention) and five member notices. The digest without AI is a later feature. The 2.1.0 monthly reminder, slip notice and status draft are removed.
- **Mobile.** The drawer scrolls as one page at 390 px (fixes an overlap 2.1.0 had with the slip section open).

**Publication:** `templates/catalog-seed.json` names 2.2.0; migration 075 and `catalog-retirements.json` withdraw 2.1.0; gallery media `life.project-oversight@2.2.0`; `scripts/profile-app-performance.ts` profiles 2.2.0.
