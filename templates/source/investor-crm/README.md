# Fundraise 3.0.0 (`life.investor-crm`)

Investor pipeline for a round, from first contact to signed commitment. Scope: [FUNDRAISE.md](../../../docs/product/app-template-blueprints/apps/FUNDRAISE.md). It follows [modular apps and shared data](../../../docs/product/MODULAR_APPS_AND_SHARED_DATA.md) and, since 3.0.0, the app guide ([`templates/APP_GUIDE.md`](../../APP_GUIDE.md)) and the v2 contract with the platform kit ([`templates/APP_REFERENCE.md`](../../APP_REFERENCE.md)).

**Catalog status:** 3.0.0 is a **draft** (session 7, package 7.3; decisions G2–G8, G11, G14, P3–P5). It is not in `templates/catalog-seed.json`; the owner approves it (O4). The seed still names 2.0.1, which stays approved for installed copies. 3.0.0 declares `upgradeFrom: ["2.0.0","2.0.1"]`, so an owner can upgrade an installed 2.0.x copy (package 7.1): the installer schema, helpers, automations and output contracts are identical. Gallery media for 3.0.0 is not generated yet (the preview HTML is).

## 3.0.0: rebuilt on the kit and the v2 contract

| Before (2.0.1) | 3.0.0 |
| --- | --- |
| Own header (eyebrow, `<h1>`, as-of pill, layout gear), footer line, rail footer | None: the platform header shows the app name. Side navigation from `kit.nav`/`kit.layout` (tabs on phone and panel widths). |
| 14 banners (notice, preview, partial data, as-of control, currency flags, editor hints) | Messages are `output.notice` (`kit.notice`). Partial data and excluded amounts are short notes next to the totals they qualify. |
| Every write a `records.propose` review ("Nothing changes until you approve it") | `records.save` from the person's own click, change or submit, with the version captured when the value was drawn. Inline values (`kit.cell`), a side panel only to create a record, delete = `archive_record`, Undo (`undo.list` on open/refresh, `undo.run` on click). |
| Pipeline: Move opened a reviewed stage dialog | `kit.board` drag and drop with a move menu on every card; interest edited on the card; moving to Passed asks the pass reason in a panel. |
| 7 Settings panels incl. "Where data comes from", "Access, automations and links", Customization and layout notes | Settings has only the business choices (default currency, stale threshold, stages, pass reasons, fit lists) in `kit.settings`, for app owners only (`input.appRole`). Research runs link `platform:automations`. |
| All twelve tables read on every screen | Each screen reads only its tables in one `records.readMany` (the rest of a long table in a second call); a side panel's extra tables in their own call; pending reads show Loading. Integrations are read only on Round and Engagement. |
| Round picker in state | The selected round is the working context (`output.context` / `input.context`). |
| Options `heading`, `layoutProfile`, `demoLabel` | Dropped (they served the old header, gear and preview label). `tableMap`, `pageSize`, `readOnly`, `asOfOverride` stay. |

Kept unchanged: all calculations below, the activity and engagement screens (business records, D42), the integration lines, custom fields, stage labels and preferences, the two automations and both helpers.

Build: `node scripts/build-investor-template.mjs` writes `templates/apps/life.investor-crm-3.0.0.json` and `fundraise.preview.html` (labelled fictional demo, D40) from this folder, and rebuilds 2.0.1 byte-identically from [`archive/2.0.1/`](archive/2.0.1/). The builder inserts `const FUNDRAISE_CSS=…` after the `'use trialagents v2';` marker line. Tests: `tests/fundraise-v2.test.ts`, `tests/fundraise-v2-integration.test.ts`.

The sections below describe the data and calculation contracts, which are unchanged since 2.0.0; the 2.0.x screens and files are documented in `archive/2.0.1/README.md`.

## Files

| File | Purpose |
| --- | --- |
| `fundraise.source.js` | The v2 app (first line `'use trialagents v2';`): seven screens on the kit, direct saves, Undo, working context. |
| `fundraise.css` | The few app-specific styles (thermometer, funnel, notes, pills, cards), written against the kit's `--k-*` tokens. |
| `catalog.metadata.json` | Catalog fields: options, `upgradeFrom`, instructions and the MCP-served documentation. |
| `schema.example.json` | Installer schema, byte-identical to 2.0.1, registered in `templates/catalog-installers.json`. |
| `demo_data.json` | Fictional preview records only (also the hand-checked dataset in the tests). Never seed it into a workspace. |
| `fundraise.preview.html` | Generated offline gallery preview with labelled fictional data, fixed as of 11 Nov 2026. |
| `functions/round_digest.js`, `functions/research_brief.js` | Read-only app helpers (E7), identical to 2.0.1. |
| `QA.md`, `AUTOMATION_RECIPES.md` | Validation notes; the two install recommendations. |
| `archive/<version>/` | The released 1.0.1, 2.0.0 and 2.0.1 packages, unchanged. |

## Roles (installer schema, section 5 of the scope)

| Role | Contract | Mode |
| --- | --- | --- |
| `organizations` | core.v1 | read/write; investors are `org_type` investor |
| `people` | core.v1 | read/write; investor contacts |
| `fundraise.settings`, `fundraise.investor_profiles`, `fundraise.rounds`, `fundraise.opportunities`, `fundraise.activities` | fundraise.v1 | Fundraise's own tables |
| `fundraise.research_reports` | fundraise.v1 | Own table written only by weekly investor research (create only); read-only in the app (Investors → Proposed → Research runs) |
| `fundraise.tranches` | fundraise.v1 | **output**, exactly the registry entry in `templates/contracts/outputs.json`; Fundraise is its single writer; read by Runway and Investor Updates |
| `dataroom.access_grants`, `dataroom.engagement` | dataroom.v1 | `optional` + `integration`: own table for manual entry; the provider's table read-only once linked |
| `programs.plan_items` | programs.v2 | `optional` + `integration`, binds only `name`, `program_id`, `item_type`, `end_date`, `status`, `is_key`: own milestone entries until linked to Programs |

Installed alone: 12 tables. With a Data Room provider and Programs already in the workspace, the "Use existing data?" dialog connects their tables (Connect is the default) read-only and no own tables are created for them.

## Integrations

Engagement shows one subtle line, rendered as `<button data-trialy-integration="install|connect <role>">`, only when `integrations.list` returns an offer: "Works with Data Room. **Add Data Room**" or "Data Room is in your workspace. **Use its data**" (access first, then "Use its view data"). The Round screen shows "Works with Programs. **Add Programs**" / "Programs is in your workspace. **Use its milestones**". The platform opens the dialog; once linked, the data is read-only, own entries stay in Database and nothing is merged. "Add Data Room" appears only once the Data Room template (`life.data-room` 1.0.0, currently a draft) is approved in the catalog; until then any app providing `dataroom.v1` can be linked with "Use its data". `dataroom.v1` gained the additive `room_purpose` option `partnering` on 13 November; Fundraise's own table matches it.

## Calculation contract

- **Raised** = Σ `amount_committed` where interest = signed, in the round currency. **Verbal** and **soft** = Σ `amount_committed`, else `amount_indicated`, and are never added to raised. A signed commitment without a committed amount is flagged and not counted.
- **Currency:** an amount in another currency than the round is flagged and excluded, never converted.
- **Progress** = raised ÷ target (empty without a target).
- **Pipeline membership:** opportunities whose investor profile is proposed or rejected are hidden from the board and all totals.
- **Stale** = stage contacted … term_sheet and `last_activity_on` more than `stale_days` (default 14) before the as-of date, or no activity logged.
- **Due** = `next_due` (open opportunities) or an activity's `follow_up_due` within as-of + 6 days; earlier dates are overdue. An activity follow-up closes when a later activity is logged on the same opportunity.
- **Funnel** = count per stage; days = average since the last logged activity (record history is not available to the app).
- **Engagement:** hot = ≥ 3 views (sum of `view_count` on rows last viewed) in the last 7 days; never opened = active grant without views; re-opened = latest view date ≥ 14 days after the previous one, within the last 14 days; depth = distinct documents viewed.
- **Tranche on track** = its milestone's status: done → met candidate; at risk or cancelled → flagged; milestone after the expected date → flagged; no milestone → "No milestone".
- **As-of date:** today's date from the app runtime; `asOfOverride` only in previews and tests. Bounds: 800 rows per table, 80 reads per render; partial reads disable totals and say so.

## Automations

Two install recommendations, on by default in Add app: weekly investor research (Mondays 07:00, saves proposed investors and a report in the app) and one weekly digest email (Mondays 09:00, written by the helper `round_digest`: round progress and this week's research). Details in [AUTOMATION_RECIPES.md](AUTOMATION_RECIPES.md). Settings stores none of their schedules or recipients.

## Customization by Claude and ChatGPT

Each change is one reviewed proposal; records, IDs, bindings and access are kept, and the app body does not change.

| What | How |
| --- | --- |
| Screens and columns | An app revision through an assistant, approved by a person (3.0.0 has no layout gear). |
| Business settings | Reviewed update of the `fundraise.settings` row: stages, pass reasons, fit vocabularies, stale threshold, default currency. |
| Stage labels | `settings.stage_labels` JSON `{stage:label}`; stored keys never change. |
| Preferences | `settings.preferences` JSON `{default_screen, page_size, overview_hidden}` (`funnel`, `stale_due`, `engagement`). |
| Custom fields | (a) schema change adds the field to opportunities, investor profiles, rounds, activities, organizations or people; (b) app revision adds it to the role's table map (`fields`, `writableFields`), the `templateBindings` line, the binding and the manifest, keeping execution and helpers; (c) register it in `settings.custom_fields` as `{table,key,label,kind,options}`. It then shows in create and detail panels; select and yes/no fields on opportunities filter the Pipeline. Core and contract fields can never be shadowed. |
