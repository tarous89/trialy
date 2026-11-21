# Contracts 2.0.0 (`life.contracts`)

Register of CDAs, MSAs, SOWs and other agreements with key dates and obligations. Scope: [CONTRACTS.md](../../../docs/product/app-template-blueprints/apps/CONTRACTS.md) (BT2-04). 2.0.0 is the catalog rebuild of package 7.3 ([platform decisions, session 7](../../../docs/scopes/PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md)): the same tables, fields, options and calculations as 1.1.1, rebuilt on the v2 app contract and the kit, following `templates/APP_GUIDE.md` 2.0.0. It follows [modular apps and shared data](../../../docs/product/MODULAR_APPS_AND_SHARED_DATA.md).

**Status: draft.** 2.0.0 is not in `templates/catalog-seed.json`; the owner approves versions (O4). 1.1.1 stays the published version and is archived byte-identical under `archive/1.1.1/` (its installer entry points there). `upgradeFrom: ["1.1.0", "1.1.1"]` names the versions an owner can upgrade an installed copy from (package 7.1): their installer schema is byte-identical.

## What 2.0.0 changes (decisions G2–G8, G11, G14, P3–P5)

- **v2 contract and kit.** The first line of the body is `'use trialagents v2';`. Screens are built with `kit.page`, `kit.nav`/`kit.layout` (side navigation when wide, tabs in the assistant panel and on phones), `kit.table` (cards below 720 px), `kit.cell`/`kit.edit`, `kit.panel`, `kit.board`/`kit.move`, `kit.empty`, `kit.pager`, `kit.settings`, `kit.undo`, `kit.notice` and `kit.stat`. `contracts.css` keeps only about 60 app-specific rules on the `--k-*` tokens (1.1.1 carried 20 KB of its own Vivid copy).
- **No own chrome (G2).** No header, title, eyebrow, "As of" pill, layout gear, rail footer, disclaimer bar or fixed bars. The 15 banners of 1.1.1 are gone: messages are `output.notice`; partial data is a quiet line where totals are withheld; the as-of date control appears only when the runtime has no date.
- **Direct saves (P5, G5).** Every record change is one `records.save` from the person's click, edit or form, with the version captured when editing started; no "prepared for review" texts. Status, Expiry and Owner (agreements), Status (obligations), name/type/country (counterparties) and name/date/status/key (milestones) are edited in place. The Pipeline is a drag-and-drop board (with a move menu on every card). Delete is `archive_record`. Undo is offered after a save (`undo.list`, `undo.run`).
- **Data lists on their own screens (G6).** Milestones and Counterparties moved out of Settings to their own screens. Settings holds only business choices (default currency, reminder windows, agreement types and obligation kinds offered) and is shown to the app's owners only (`input.appRole`). The access, assistants, automations and layout notes are gone; details link to `platform:logs`.
- **Each screen reads only its data (P3).** Reads are grouped (settings; agreements + terms + organizations; obligations; milestones + programs; people + studies), one `records.readMany` per group, only for the groups a screen or panel shows. A pending read shows as loading. Filters, search and paging work on loaded rows. Documents, quotes and integrations are read only by the panels and the screen that show them.
- **Every empty screen offers its first action (G5);** no example records (G11). The labelled fictional demo is only in `contracts.preview.html`.
- **Works at 400 px (P9).** 1.1.1's verification dialog had overlapping controls at the assistant-panel width; the verification panel now lists each proposed value as one block (value, quote, quote check, decision) and every screen and panel passes the design inspector under the current rules at 1440, 400 and 390 px.
- **Options.** `tableMap`, `pageSize`, `readOnly`, `asOfOverride` stay. `heading`, `layoutProfile` and `demoLabel` (presentation of the old design) are dropped.
- **Working context.** The current screen is returned as `output.context` and restored on the next visit.

## Files

| File | Purpose |
| --- | --- |
| `contracts.source.js` | The v2 app: nine screens (Overview, Agreements, Families, Obligations, CDAs, Pipeline, Counterparties, Milestones, Settings), side panels, calculations, verification, documents and direct saves. |
| `contracts.css` | The few app-specific styles on the kit's tokens. |
| `catalog.metadata.json` | Catalog fields: options, `upgradeFrom`, assistant instructions and the MCP-served documentation. |
| `schema.example.json` | Installer schema (unchanged from 1.1.0/1.1.1), registered in `templates/catalog-installers.json` for 2.0.0. |
| `demo_data.json` | Fictional records only. Used by the preview and the tests; never seeded into a workspace. |
| `contracts.preview.html` | Generated offline gallery preview with labelled fictional data (D40), the kit ahead of the code as the runtime adds it. |
| `QA.md` | Commands, results and what was not verified. |
| `AUTOMATION_RECIPES.md` | Why Contracts has no automations. |
| `archive/1.0.0/`, `archive/1.1.0/`, `archive/1.1.1/` | Released packages, unchanged. 1.1.1 is still built by the builder (its JSON and preview stay byte-identical). |

Edit the source, CSS and metadata, then run `node scripts/build-contracts-template.mjs`. It regenerates `templates/apps/life.contracts-2.0.0.json` and the preview, and rebuilds 1.1.1 from `archive/1.1.1/`; `--check` (in `npm run build`) verifies both. Do not edit a released version.

## Roles

Unchanged from 1.1.x:

| Role | Contract | Mode |
| --- | --- | --- |
| `agreements` | core.v1 + Contracts-owned optional fields `parent_id`, `program_id`, `study_id`, `total_value`, `currency`, `signed_on`, `owner` | read/write |
| `organizations` | core.v1 | read/write |
| `people`, `programs`, `studies` | core.v1 | optional, read/write |
| `programs.plan_items` | programs.v2 | optional + integration: own milestone entries until Programs is linked in the app, then read only |
| `contracts.settings`, `contracts.terms` | contracts.v1 | app tables |
| `contracts.obligations` | contracts.v2 (v1 + `counterparty_id`) | published output (writer `life.contracts`) |

## Calculation contract

Unchanged from 1.1.x: notice deadline = `expiry_date − notice_days` when renewal is automatic or option; confidentiality end = (`expiry_date`, else `effective_date`) + `confidentiality_years` × 12 calendar months, day clamped; family value per currency, never converted, with the change-order share; next due of a recurring obligation = first occurrence on or after the as-of date; overdue = open, non-recurring, due before the as-of date; reminder windows from `reminder_days` (default 30, 60, 90); expires before milestone = active agreement whose program has a key, open milestone ending after its expiry. The app calculates these from the fields whenever it shows them and stores `notice_deadline` and `confidentiality_end` in the same save as the terms or an agreement date change (an inline Expiry edit included). Reads are bounded to 800 rows per table; a partial read withholds totals and "none found" answers and says so.

## Host interactions

- `data-trialy-document="upload attach:<id>"` buttons open the platform upload; the host returns `document:uploaded:<context>` with the version ID and the app opens the attach panel with it selected.
- `data-trialy-integration="install|connect programs.plan_items"` on the Milestones screen opens the in-app integration dialog.
- Forms in side panels send `save:<panel>` on submit; a choice inside an open form (kind `change`) is kept in state and saves nothing.
- After a direct save the platform renders the app again with an `open` event: the app then lists Undo (`undo.list`, server only) and repeats the save's message, which the platform's re-render would otherwise drop.
- No app login, browser storage, network calls or automation reads.
