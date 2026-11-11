# Programs 2.0.0 validation

Validated against the repository host on 11 November 2026 with disposable PGlite databases and fictional data, not a deployed account.

**Catalog status:** on 11 November 2026 the owner asked for Programs 2.0.0 to be deployed into the platform. `templates/catalog-seed.json` names 2.0.0, so the pre-deploy catalog sync inserts it as approved (the same owner-approved exception as Runway). The gallery and `list_app_templates` show only the latest approved version, so new installs get 2.0.0. The 1.0.1 catalog JSON, its catalog digest and its gallery preview hash are unchanged; its source package is archived byte-for-byte under `archive/1.0.1/`, and its installer, seed and test paths point there. Saved 1.0.1 apps are not migrated.

## Decisions

- **As-of date:** the app runtime exposes today's date. `new Date()` inside the production QuickJS sandbox returns the host date (checked with `src/foundation/runtime.ts`). Programs uses it, labelled "(today)". The section 7 as-of control therefore appears only as a fallback when the runtime gives no valid date, defaulting to the end of the latest updated month. `asOfOverride` pins the date for previews and tests only; the installer never sets it. No stored or computed database field derives from the clock. A slip's `changed_on` and a report's `saved_on` record the date the reviewed change was prepared.
- **Install defaults:** Use reuses an existing compatible `programs` table by default when a live app binds one under the same role key (for example Runway), and adds only the three Programs-owned optional health fields. It never creates a second programs table unless the user chooses separate data. `people` and `runway.month_closes` are connected when present and never created. With two or more candidates, the installer asks rather than guessing. "Install a new copy" without an explicit choice starts fresh (rule 8). The Use dialog always shows the choice.
- **Owners** stay plain-text names. With a connected people table, a "Pick from People" helper fills the name.
- **Settings lists:** `functions` and `stages` are ordered subsets of the schema options; new values need a reviewed schema change.

## Deviations from the scope (with reasons)

- **Slip rule includes `at_risk`:** a later date on a baselined planned, in-progress or at-risk item needs a reason. At-risk work is still committed, so letting it slip unrecorded would hide moves.
- **Accepted downstream moves of baselined items get their own slip record** (same reason, "Pushed by …"). The edited item still writes exactly one slip, so every committed date move has a history.
- **Present mode image export:** custom apps cannot download files, so Present mode is a clean read-only page with a note to use a screenshot or print to PDF. Report export is copyable Markdown text.
- **Cushion** follows Runway's definition: full months of cash after the milestone before cash-out. A Runway reserve is not used, because Runway settings are its private table (modular rule 2).
- **Reset baseline reason** is kept in the item's `notes` (the scope has no separate field for it).
- **Archived records** are hidden in the app. The owner-only "Show archived" links are platform pages (Apps, Automations, Database).

## Commands and outcomes

| Command | Result |
| --- | --- |
| `node scripts/build-project-template.mjs --check` | Passed |
| `npm run build` (every template drift check, `tsc --noEmit`, `vite build`, embed build) | Passed |
| `APP_DESIGN_CHECKS=off node --import tsx --test tests/programs.test.ts` | 13/13 passed, including the production design inspector on all seven screens |
| `APP_DESIGN_CHECKS=off node --import tsx --test tests/programs-integration.test.ts` | 2/2 passed, including the rule 9 modularity test with the real installer |
| `APP_DESIGN_CHECKS=off node --import tsx scripts/test-project-browser.ts` | Passed |
| `npm test` (full suite, 481 tests, with the browsers path below) | 480 passed. The one failure, `tests/monitoring-pv-integration.test.ts` (CO06, overlapping controls at 390 px), fails identically on unmodified `main` under this container's Chromium and passes in GitHub CI. |

Browser checks ran against this container's Chromium through a `PLAYWRIGHT_BROWSERS_PATH` that maps the repository's pinned Playwright 1.51.1 browser names to the installed build. Test code was not changed for this.

**Unit tests** run the catalog entry in production QuickJS with host-prepended configuration. They cover:

- the schema: scalar, contract-equal core roles, Runway field parity, 8 install tables and the seven layout screens;
- the hand-computed critical path, driving path, cycle rejection and stored-cycle handling;
- the slip rule (exactly one slip; reason required; draft kept), the downstream preview and acceptance, and the slip story;
- versions captured at open, and a failed proposal keeping the draft;
- health: never set by the app, flagged when older than 45 days, rationale and date required;
- frozen reports;
- Runway markers present, unbound and unreadable;
- partial, unavailable and over-budget reads;
- gate outcomes with follow-ups and cancellations;
- the RAID matrix and promotion;
- read-only users;
- `data-ui-state` on every input;
- the runtime as-of date, and saved layout winning over stale state;
- the design inspector.

**Integration tests** cover:

- a reviewed slip save committed through `confirm`;
- native layout save and reload;
- server rejection of a stale edit;
- the real `syncTemplateCatalog`, `readCatalogInstallation` and `installCatalogApp` flow (2.0.0 approved inside the test database when the seed does not approve it);
- the rule 9 steps below.

**Browser test** (production sanitized frame, manifest attached) covers:

- all seven screens with no data-check failure;
- the Gantt scrolling inside its card at 1440 and 390 px, with no page overflow on any screen at 390 px;
- cash markers;
- "What drives this date", then Edit dates: slip reason and downstream preview shown, all inputs enabled, an exact DB review with nothing written before approval and exactly one new slip after;
- native layout drag, review, confirm and reload, and at 390 px keyboard pick-and-place with Ignore.

Desktop and mobile screenshots were inspected. The design inspector found two problems, both fixed: text under 12 px (Gantt markers and today tag) and clipped Gantt labels. The labels now wrap. Drawers are checked by the browser test and screenshots, as for Runway.

## Hand-computed critical path (fictional plan, `demo_data.json`)

Two programs and 25 items; one predecessor each.

- **PX-101** (14 items): the latest key milestone is *Phase 1 topline data* (31 Mar 2028). Following predecessors gives: API process development (CMC) → GMP drug substance batch (CMC) → Drug product release (CMC) → IND package compiled (Regulatory) → IND submission (Regulatory) → FDA 30-day review (Regulatory) → First participant dosed (Clinical) → Phase 1 SAD/MAD (Clinical) → Phase 1 topline data (Clinical). This is the chain that crosses functions. GLP tox, Final tox report, CRO selected, Site activation and Pre-IND are off the path. App result: identical.
- **PX-202** (11 items): the latest key milestone is *First-in-human dose* (15 Mar 2028). Chain: Candidate selection (Other) → Pilot tox → GLP tox (Nonclinical) → CTA submission → CTA approval (Regulatory) → First-in-human dose (Clinical). GMP manufacturing, Formulation, Cell line, Biomarker assay and the advisory board are off the path. App result: identical.
- **Rejected cycle:** setting *Candidate selection*'s predecessor to *First-in-human dose* is rejected at save ("would create a cycle"), with the draft kept. The same cycle written directly in the database disables PX-202's critical path and is listed under Exceptions.

## Other hand calculations

- **Slip:** IND submission moves from 31 Mar 2027 to 21 Apr 2027, so days = 21. Baseline 15 Mar 2027, so cumulative slip = +37 days.
- **Downstream:** FDA review's earliest start is 22 Apr 2027 (+21 days), so 30 Apr becomes 21 May. First participant dosed (31 May) starts later than 22 May, so the push stops there.
- **Cash markers:** the demo snapshot (Oct 2026) holds 24.0M and falls 0.6M a month. IND submission (Mar 2027, month 5) = 21.0M. Cash-out is Feb 2030, so the cushion is 35 months, shown green.
- **Integration snapshot:** 1.0M falling 30k a month. Jun 2027 = 760k. The first negative month is Aug 2029, so the cushion is 25 months. Both values match the app.
- **Quarter (as of 11 Nov 2026):** one slip changed in Q4 2026 (16 days, CRO or vendor). On-time rate = 1 of 1 (the Pre-IND meeting, done on its 20 Oct baseline).

## Modularity (MODULAR_APPS_AND_SHARED_DATA.md §3 rule 9), real installer and real archive paths

1. **Install alone:** 8 tables. The programs table has every core contract v1 field. No people or Runway table is created. The app opens with "No programs yet" and no error.
2. **With Runway:** Runway 2.1.0 is installed first. `read_template_installation` offers Runway's programs table (`addFields`: health, health_rationale, health_date; used by Runway) and its month closes. Use creates only the 7 app tables, leaving one programs table in the workspace. Runway's closes are bound read-only (manifest mode `read`, no writable fields), and Runway still opens. The timeline shows "IND filing … EUR 760k · 25 months cushion" labelled "Runway snapshot Oct 2026".
3. **Delete Runway:** Runway is archived. The record count is unchanged and Programs shows the same labelled marker.
4. **Remove one tab:** a reviewed Programs revision unbinds `runway.month_closes`. The timeline shows "Runway is not connected … hidden" and no markers. Records are unchanged and the table is not archived, because the archived Runway app still protects it. Re-adding the binding reconnects the same table, and the markers return.
5. **Reinstall:** with Programs archived, Use says "Restore your archived Programs app". Restoring brings back the same data and markers. "Install a new copy" without a choice creates a fresh programs table. In another workspace, choosing separate data creates all 8 tables and no Runway link. With two compatible programs tables, the installer asks which one to use.

**Archive-first checks.** The platform changes from PRs #121, #128 and #130 are on `main`, so these checks ran:

- **Archive and restore keep all fields:** every table's fields and `archived_fields` were identical before archive, while archived and after restore.
- **Automations come back switched off:** the attached app action was restored paused.
- **Removing a tab and adding it back reconnects the same tables:** step 4.
- **Archived apps appear for the owner under "Show archived":** `list_archived_items` / `archivedItems` lists the archived app for the owner. Hiding it from non-owners is covered by the platform's `tests/archive-first.test.ts`.

## Acceptance criteria (PROGRAMS.md §13)

1. **First integrated timeline in one session; baseline only after confirmation:** items save without baselines, and Set baseline is a separate reviewed action per program. The assistant path is documented in `instructions` step 4. Not run live with an assistant.
2. **Later baselined milestone needs a reason and writes exactly one slip:** passed (unit, integration and browser).
3. **Critical path matches the hand-computed plan; cycle rejected:** passed (table above).
4. **Downstream preview lists successors; nothing else changes unless accepted:** passed.
5. **Health never set by the app; older than 45 days flagged:** passed.
6. **Saved report never changes after later edits:** passed.
7. **Cash markers with Runway present and readable; none when Runway is missing or not readable:** passed (unit and rule 9).
8. **Board viewer with write restriction can open Present mode and reports but cannot change records; AI with edit off can only read:** write controls are disabled and saves are refused in the app. The server rejects writes outside the manifest or without permission (platform). AI edit restrictions are enforced by the platform principal, not the app.
9. **Works with no automation; automation failures never affect it:** the app reads no automation state; recipes are optional.
10. **Desktop 1440 / mobile 390: Gantt scrolls inside its card, no page overflow:** passed (browser test and screenshots).

## Not verified here

- A live Claude or ChatGPT session, real deployed installs, and real write restrictions on a deployed account.
- Automation setup or delivery: no reminder, slip notice or status draft was configured, and no email was sent.
- Role metadata stored on tables (modular roadmap item 1). Detection reads role keys from live apps' table maps, so tables bound only by archived apps are reached by restoring that app.
