# Fundraise 2.0.0 validation

Validated on 12 November 2026 against the repository host with disposable PGlite databases and fictional data, not a deployed account. Guidance: `read_app_template_guidance` reports version **1.3.20** (authoring, including "Role-based connections and existing data" → Integrations) and the contract registry `resource:"contracts"` (registry version 2026-11-11, sha256 `375b056c…`), identical to `templates/TEMPLATE_AUTHORING.md` and `templates/contracts/outputs.json` on `main` after PR #134.

**Catalog status:** **published** (owner approval, 14 November 2026). `templates/catalog-seed.json` names 2.0.0, so the catalog sync after migrations imports it approved; migration 072 withdraws Investor CRM 1.0.1 once. The 1.0.1 JSON and digest are unchanged and its package is archived under `archive/1.0.1/`; installed 1.0.1 apps keep working. Gallery: `resources/template-gallery/life.investor-crm@2.0.0.jpg` and its manifest entry.

## Revision of 14 November 2026 (current platform)

Rebased onto `main` at `eaf9446` (59 commits after the original base) and revised against template guidance **1.3.30** (`templates/TEMPLATE_AUTHORING.md`: installed app functions E7 1.3.30, app permissions and result storage 1.3.29, research + email and run-time fields 1.3.28, automation declarations 1.3.27) and contract registry 2026-11-13. Same environment notes as below (disposable PGlite, fictional data, `PLAYWRIGHT_BROWSERS_PATH` mapping for this container's Chromium).

| Finding on the rebased draft | Change |
| --- | --- |
| 7 Fundraise tests failed: install and connect rejected "Data room access does not match dataroom.v1: room_purpose lacks contract options" | Own `dataroom.access_grants.room_purpose` gains the additive `partnering` option and the contract description; the app's select offers it. |
| The provider-engagement test used fixed November dates for "hot" (≥ 3 views in 7 days), so it expired | Dates relative to today. |
| No automation declarations; Settings described automations as "configure later" | `recommendedAutomations` investor_research (weekly, saves proposed investors and a `fundraise.research_reports` row) and weekly_digest (Monday 09:00 email written by the helper `round_digest`); two E7 helpers; Settings names the automations and where they live. No signed-commitment notice (owner decision). |
| One research-then-email automation (E5) with the helper writing the email never delivered (`summary_unavailable`) | Not used: the background check reads the research automation without the owner's database identity, and after a local fix each helper read cost about 3 s of re-validation (over the 15 s limit). Reported for the platform; the digest is a 09:00 calendar email instead. |
| Research reading 4 tables through the brief helper was refused at setup (`brief_scope`: brief reads exceed the read scope) | Research read bindings use `fields:"all"` (E6). Found by the new end-to-end test. |
| Customization limited to the layout gear and settings lists | `custom_fields`, `stage_labels`, `preferences` (§8a). |

| Command (14 November 2026, rebased on `main` at `2364170`) | Result |
| --- | --- |
| `npm run build` | Passed (includes `check-app-functions`, every template `--check`, `tsc --noEmit`, vite and embed builds) |
| `tests/fundraise.test.ts`, `tests/fundraise-integration.test.ts`, `tests/fundraise-automations.test.ts`, `tests/investor-template.test.ts` | 32/32 passed |
| `scripts/test-fundraise-browser.ts` | Passed (production frame, 1440 and 390 px) |
| `app-templates`, `template-catalog`, `automation-recipes`, `automation-steps-and-fields`, `partnerships` tests | 62/62 passed |
| `npm test` (full suite, before the weekly-automation change) | 649 of 665 passed. All 14 failures (auth, Claude connector, contracts acceptance 3, core shared backend, guest drafts, CO06 monitoring-pv, plugin release, runtime transports, tracker experience) fail the same way on unmodified `origin/main` in this container. |

## Commands and outcomes

| Command | Result |
| --- | --- |
| `node scripts/build-investor-template.mjs --check` | Passed |
| `npm run build` (every template drift check, `tsc --noEmit`, `vite build`, embed build) | Passed |
| `APP_DESIGN_CHECKS=off node --import tsx --test tests/fundraise.test.ts` | 15/15 passed, including the production design inspector on all seven screens and the opportunity panel |
| `APP_DESIGN_CHECKS=off node --import tsx --test tests/fundraise-integration.test.ts` | 4/4 passed: reviewed saves, the integration test in both install orders, rule 9 modularity and archive-first, all with the real installer |
| `APP_DESIGN_CHECKS=off node --import tsx scripts/test-fundraise-browser.ts` | Passed |
| `npm test` (full suite, 509 tests) | 508 passed. The one failure, `tests/monitoring-pv-integration.test.ts` (CO06, `overlapping_controls` at 390 px), fails identically on unmodified `origin/main` in this container (checked in a separate worktree) and is recorded the same way in the Programs QA. |
| `tests/investor-template.test.ts`, `tests/investor-integration.test.ts` (Investor CRM 1.0.1 from the archive) | 8/8 passed |

Browser checks ran against this container's Chromium through a `PLAYWRIGHT_BROWSERS_PATH` that maps the repository's pinned Playwright 1.51.1 browser names to the installed build, as for Programs. Test code was not changed for this.

## Package conventions (as Programs 2.1.0)

Canonical source, CSS, metadata, installer schema, fictional demo data and generated preview under `templates/source/investor-crm/`; `scripts/build-investor-template.mjs` generates `templates/apps/life.investor-crm-2.0.0.json` deterministically and its `--check` runs in `npm run build`; `templateLayoutSchema` declares the seven screen IDs (`overview`, `pipeline`, `investors`, `round`, `activity`, `engagement`, `settings`) and column groups `investors` and `activity`; the installer schema is registered in `templates/catalog-installers.json`. Catalog file 148 KB (< 300,000), source < 180,000 characters, prose fields < 6,000 characters.

## Roles (scope §5) and the output contract

Checked by `tests/fundraise.test.ts` (first test):

- `organizations`, `people`: `core.v1`, exactly the core contract fields.
- `fundraise.settings`, `fundraise.investor_profiles`, `fundraise.rounds`, `fundraise.opportunities`, `fundraise.activities`: `fundraise.v1`.
- `fundraise.tranches`: `fundraise.v1`, field for field equal to the registry entry in `templates/contracts/outputs.json` (ignoring the `ai` flag). The integration tests confirm Fundraise is registered as its single writer (`role_writers`), and that a second copy gets its own table.
- `dataroom.access_grants`, `dataroom.engagement`: `dataroom.v1`, `optional: true`, `integration: true`, fields equal to the registry.
- `programs.plan_items`: `programs.v2`, `optional: true`, `integration: true`, binding only `name`, `program_id`, `item_type`, `end_date`, `status`, `is_key`. The only difference from the registry is the `program_id` description: in Fundraise's own table it also holds a program name or code.

## Hand-checked fictional round (`demo_data.json`, as of 11 Nov 2026)

Seed 2026, EUR, target 15,000,000.

- **Signed (raised):** Harbourline 3,000,000 + Meridian 2,000,000 = **5,000,000**. Silverpine signed USD 250,000: flagged, excluded.
- **Verbal:** Northlake 6,000,000 + Calder 2,500,000 = **8,500,000**. **Soft:** Alder 500,000 + Fjordhaven 1,000,000 = **1,500,000**. Redfern (rejected profile, soft 400,000) is not in the pipeline and not counted.
- **Progress:** 5,000,000 ÷ 15,000,000 = **33.3%**. App: "Raised EUR 5,000,000 of EUR 15,000,000 (33.3%)". Marking Northlake signed with 6,000,000 committed: 11,000,000 (73.3%), verbal 2.5M. App: identical.
- **Stale (> 14 days, active stages):** Alder (10 Oct, 32 days), Fjordhaven (27 Oct, 15 days), Brightwater (no activity). **Due by 17 Nov:** Alder overdue (5 Nov), Northlake 12 Nov, Calder follow-up 13 Nov, Fjordhaven 14 Nov. Harbourline's 22 Oct follow-up is closed by its 3 Nov activity. App: identical list and order.
- **Engagement:** Northlake 4 + 2 views in the last 7 days = 6 → hot; Fjordhaven active, no views → never opened; Harbourline views on 26 Sep, 5 Oct, then 8 Nov (34 days) → re-opened. App: identical.
- **Tranches:** 6.0M first close (no milestone), 5.0M on "Lead candidate nomination" (planned → on track), 4.0M on "GLP tox readout" (at risk → flagged); total 15.0M = 100% of target.
- **Pass patterns (after moving Fjordhaven to passed):** this round 2 of 5 too early, 2 of 5 want in-vivo data, 1 of 5 outside mandate; all rounds 3 of 6 too early.

## Acceptance criteria (FUNDRAISE.md §12)

1. **Only signed counts as raised; verbal and soft separate; reconciles with a hand-checked round:** passed (unit, integration, browser).
2. **Another currency is flagged and excluded:** passed (Silverpine USD; Calder switched to GBP also excluded).
3. **Stale and due lists match a fictional dataset with known dates:** passed (exact list above; the threshold follows Settings).
4. **Proposed investors stay proposed until accepted; rejected never in the pipeline:** passed. Accept/Reject is one reviewed `profile_status` update; proposed investors cannot be added to a round; rejected investors' opportunities are hidden from the board and totals.
5. **Saving an activity updates `last_activity_on` in the same reviewed save:** passed in QuickJS (two changes in one batch, version captured when the editor opens) and in the database (one confirm writes both; nothing before approval).
6. **Integration test, both install orders:** passed.
   - *Fundraise first:* 11 tables; Engagement works with manual entries in Fundraise's own `dataroom.*` tables. A custom app providing `dataroom.v1` is added; the line changes to "Data Room is in your workspace. **Use its data**" (`data-trialy-integration="connect dataroom.access_grants"`, then "Use its view data" for `dataroom.engagement`). The dialog (`read_app_integration`) shows both sources; an assistant cannot choose; the user's choice links each role read-only. Engagement then reads the provider (signals recomputed from its rows), shows no record buttons or line, and a submit from the app proposes nothing. Manual entries stay in Database (counts unchanged). Programs: "Works with Programs. **Add Programs**" before, "Programs is in your workspace. **Use its milestones**" after install; once chosen, tranche status comes from Programs' plan items. Archiving the provider: Fundraise keeps working on every screen.
   - *Providers first:* the "Use existing data?" step lists `dataroom.access_grants`, `dataroom.engagement`, `programs.plan_items` and `people` with Connect as default; Fundraise binds them read-only (source `linked`, no offer), creates only organizations and its six own tables, and reads the provider's data. Choosing Create new instead gives Fundraise its own tables and the line still offers the provider later.
7. **Tranche milestone status from own entries or Programs once linked; "no milestone" otherwise:** passed (unit and integration).
8. **Modularity (rule 9) and archive-first:** passed with the real installer: alone ("No round yet", no error); with Programs (Programs reuses Fundraise's people table); Programs archived (records unchanged, Fundraise unaffected); one tab removed (views unbound, Engagement says so, records stay, re-adding reconnects the same table); archive and restore keep every field, the attached automation comes back paused, the archived app is listed for the owner, reinstalling offers restore first, "Install a new copy" starts fresh.
9. **Desktop 1440 / mobile 390; pipeline board scrolls horizontally inside its card:** passed in the production sanitized frame with a manifest attached: all seven screens with no data-check banner, no page overflow at 390 px on any screen, board `scrollWidth > clientWidth` at both widths, a Move with an exact DB review (nothing written before approval), native layout drag/review/confirm/reload and keyboard pick-and-place with Ignore. Screenshots inspected (overview and pipeline at 1440 and 390).

## Deviations from the scope (with reasons)

- **"Add Data Room" is not shown today.** The platform offers `install` only when the role's registry writer has an approved catalog template; the `dataroom.*` writer is the planned Data Room app (08), which is not in the catalog. The app renders the platform's offer exactly (tested with `install` and `connect`), and "Use its data" works today for any app providing `dataroom.v1`.
- **Archiving the provider does not make its data "unavailable".** Archive first keeps the provider's tables, so Fundraise keeps reading them read-only (as Programs keeps reading an archived Runway's snapshots). When the provider's data cannot be read, Engagement says "Data Room data is unavailable" (unit test). A bound table with records cannot be permanently deleted, so that state was not reproduced in the database test.
- **Move instead of drag:** custom apps receive clicks, not drags; Move opens the reviewed stage/interest edit.
- **"Give access" once linked** is a text pointer to the Data Room app: `integrations.list` does not return the provider's app ID, so the app cannot link to it.
- **Days in stage** use the last logged activity: record history is not available to the app (the scope's fallback).
- **Diligence depth** counts documents viewed; the shared-document count is not in `dataroom.v1`.
- **Adding an investor is two reviewed steps** (organization, then profile): record IDs exist only after approval, and the shared organizations table may already hold the investor.
- **Offer comparison "tranches" row** shows tranche notes from the offer; the round's tranches are on the Tranches table.

## Not verified here

- A live Claude or ChatGPT session, a deployed install, and real write restrictions on a deployed account.
- Automation setup and delivery on a deployed host: recipes were installed, activated and delivered only against the repository host with `APP_AUTOMATION_RECIPES_ENABLED=true`, a synthetic verified runner and a captured email transport. No real Claude or ChatGPT unattended cycle and no real email.
- The Add app dialog's automation rows were not rendered in a browser for Fundraise (the shared dialog is covered by `tests/visual/automation-recipes.spec.cjs`).
- Gallery screenshot and manifest entry: added at publication, as for Programs and Partnerships.
