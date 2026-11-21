# Partnerships 3.0.0 (`life.partnership-tracker`)

Out-licensing, in-licensing, co-development, research, academic and platform deals by asset, from first contact to signature: conferences, follow-ups and partner news, with the assistant doing the research and the admin. Scope: [PARTNERSHIPS.md](../../../docs/product/app-template-blueprints/apps/PARTNERSHIPS.md) (BT2-07).

3.0.0 is the rebuild on the v2 app contract and the shared kit (platform decisions G2-G8, G11, G14, P3-P5; package 7.3). It is a **draft** until the owner approves it (O4); the seed still names 2.2.1. The installer schema, recommended automations and the 50 app command names and inputs are unchanged, so installed 2.1.0, 2.2.0 and 2.2.1 copies can be upgraded (`upgradeFrom`). The published 2.2.1 package is archived byte-identical under [`archive/2.2.1/`](archive/2.2.1/), where its installer entry points; earlier releases stay under `archive/` (1.1.1 is built by `scripts/build-partnership-template.mjs`).

## What changed in 3.0.0

- No header, title, "As of" pill, layout gear, footer or banner of its own: the platform header shows the app name and messages come back as `notice`. Side navigation (kit) with eight screens: Overview, Pipeline, Partners, Conferences, Activity, Research, Lists and Settings (owners only).
- Record edits save directly with `records.save` and the version captured when editing started; every "(reviewed)" button and "prepared for review" text is gone. Values are edited where they are shown (inline cells in the pipeline list, partners, contacts, follow-ups, meetings and panels); the side panel is for new records and many fields; delete archives (`archive_record`); Undo offers the person's own last change.
- The pipeline board is a drag-and-drop board (`kit.board`); every card also has a move menu. Lost and On hold ask for a reason in a small panel before saving. Stage history is written in the same save.
- Settings holds only business choices (stalled days, how the pipeline opens, rows per page, digest intro line) and is shown to owners only. The `key | Label | hidden` text areas and team member IDs are gone from the screens: team names, lost reasons, stage labels and hidden stages, activity kinds, deal types and tag categories are edited row by row on the Lists screen; member IDs are set by an assistant (`settings.save team_members`). The access and automation notes and "where data comes from" text are gone (links to `platform:automations` where useful).
- Each screen reads only its tables, in fixed `records.readMany` batches (core tables; Contracts, Data Room and saved views; research), so changing screens, filters and sorting make no new request. Reads still on their way show Loading; the overview's open-deal count comes from `records.summarize`. Every empty screen offers its first action.
- The conference and "You are" are the remembered working context (`output.context`).
- Activity, materials and disclosure records stay (D42).
- Options: `heading`, `layoutProfile` and `demoLabel` are dropped (they served the old design); `tableMap`, `pageSize`, `readOnly` and `asOfOverride` stay. `layout.save` is still declared and answers that screens and columns now change with an app change.
- Catalog source 185,541 characters (2.2.1: 225,866) with the kit's styles and helpers supplied by the runtime; the app keeps about 2 KB of its own styles on `--k-*` tokens.

## Files

| File | Purpose |
|---|---|
| `partnerships.source.js` | Readable app source. Line 1 is `'use trialagents v2';`, line 2 is `appCommands` (50 commands, single-line JSON). Both are kept verbatim by the build. |
| `partnerships.css` | The few app-specific styles, on kit tokens. |
| `catalog.metadata.json` | Catalog entry: description, options, `upgradeFrom`, instructions and documentation for assistants. |
| `schema.example.json` | Installer schema (unchanged from 2.1.0); `templates/catalog-installers.json` points here for 3.0.0. |
| `demo_data.json` | Fictional assets, partners, contacts, opportunities, stage history, a conference with briefs, signals (`.invalid` emails); used only by the gallery preview and tests (D40). |
| `automation.examples.json` | Fictional follow-up reminder actions set up in chat. |
| `partnerships.preview.html` | Offline gallery preview with labelled fictional data (generated; kit included). |
| `AUTOMATION_RECIPES.md` | The install recommendations and the chat-set-up reminders. |
| `QA.md` | Test results per version. |

Build: `node scripts/build-partnerships-template.mjs` writes `templates/apps/life.partnership-tracker-3.0.0.json` and its preview, and rebuilds 2.2.1 from `archive/2.2.1/` (byte-identical to the released JSON). `--check` (part of `npm run build`) fails when any of them is stale.

## Roles

| Role | Contract | Mode | Use |
|---|---|---|---|
| `organizations` | core.v1 | read/write | Partner companies, universities, investors |
| `people` | core.v1 | read/write | Partner contacts (professional only) |
| `programs` | core.v1 | read/write | Assets |
| `agreements` | core.v1 | optional, read-only, core fields | CDA, term sheet, signed agreement (Contracts writes them; new ones are proposed in Contracts) |
| `dataroom.access_grants`, `dataroom.engagement` | dataroom.v1 | optional integration | Data Room's outputs read-only once linked ("Use Data Room's data"); until then the app's own table for access entered by hand |
| `partnerships.settings`, `.asset_profiles`, `.opportunities`, `.stage_history`, `.activities`, `.follow_ups`, `.conferences`, `.briefs`, `.signals`, `.tag_categories`, `.views`, `.research_reports` | partnerships.v1 | app tables | §7 |

Additions beyond §7 (all optional, scalar):
- `settings.team` (names who own deals) and the customization fields `team_members`, `custom_fields`, `option_lists`, `stage_config`, `preferences` (JSON, see PARTNERSHIPS.md §12a). The schedule, recipients and on/off are not settings: they live on the automations.
- `follow_ups.owner_member_id`, `briefs.status` (draft / reviewed), `views.columns` and `views.sort`, and the `research_reports` table (one row per research run).
- `asset_profiles.research_sources` (preferred sources for the research worker).
- `activities.outcome` and `activities.status` (conference meeting request and schedule status: requested / confirmed / held / declined / cancelled).
- `briefs.activity_id` (the meeting a brief prepares).
- `views.archived` (removing a view archives it).

## How it works

| Topic | Behaviour |
|---|---|
| Writes | Every change is one `records.propose` batch (≤ 50) a person approves in the TrialAgents review. Assistants only propose. A stage change always writes `stage_history` in the same review. Panels and editors keep the record version from when they opened. |
| Stages | Standard stages (identified → contacted → non-confidential → CDA → confidential evaluation → term sheet → exclusivity and diligence → signed; lost; on hold). Lost and on hold need a reason from the editable list. |
| Calculations (§8) | Stalled: open, no activity, stage change or completed follow-up for `stalled_days` (default 21). Overdue: open follow-up past due. Funnel: an opportunity counts at every pipeline stage up to the furthest stage it reached in its stage history (and its current stage); conversion = next ÷ stage. Win/loss: signed vs lost, with reasons, per asset, direction and source. History check: earlier opportunities with the same organization, declines first, on every new opportunity, contact, accepted target and conference meeting. |
| Tags and views | Standard categories Conference, Channel, Asset group (Settings → Add the standard categories), plus custom ones with values. Filters by asset, direction, owner, stage, priority, source, partner, any category and registered custom fields; list sort; saved views keep their own columns and sort, private (listed only for their owner, chosen in "You are") or shared. A conference's name is a Conference value, so "Open its pipeline view" is one click. |
| Gates | CDA, term sheet and agreement link `agreements` records when Contracts is connected, otherwise manual references. Data room: the Data Room `room_id` from `dataroom.access_grants`, with the partner's access and engagement. |
| Digest | Settings shows the digest as the research worker composes it (§6), for the cadence of the latest research report: subject line, Moved / Due / Stalled / Coming up / New about your targets / Suggested targets, at most 3 items per section, about 150 words, empty sections left out, no deal terms, notes, briefs or rationales. Each run saves it as a research report; the same automation then emails it to registered members only. |
| Automations | `recommendedAutomations`: `partner_research` (research, then the digest email after each completed run: one automation, E5) and `meeting_briefs`, selected by default at install, with create-only write permission on signals, research reports and briefs. Reads are `fields:"all"` with confidential `exceptFields` (E6), so custom fields never stop them. The app links to them and never stores schedules. |
| App commands | `list_app_commands` / `run_app_command`: 18 read, 31 propose and 1 layout command covering every screen and control (PARTNERSHIPS.md §12b). Propose commands replay the screens' own handler, so the review equals the click path, and buffer to one review. |
| Integrations | Agreements (from Contracts) and linked Data Room access are labelled "From *App*" with Edit in *App* (`data-trialy-open`); hand-entered access is refused while Data Room is linked. Bound fields this version does not know are shown read only as "Additional fields". |
| Customization | Columns per list (layout gear, six groups; visibility keys `group:column`, earlier `group.column` still read), saved views with columns and sort, stage labels / hidden / custom stages, activity kinds and deal types, preferences and custom fields, all through reviewed changes by a person or Claude / ChatGPT (PARTNERSHIPS.md §12a). |
| Outreach | None. No screen or automation emails partners; there are no mail links; contacts' emails are shown as text. |
| Reads | Bounded (8 × 100 rows per table). An unbound, unavailable, short, unknown-total or over-budget read is labelled partial and disables changes. |

The sanitized frame strips `open` from `<details>`, so filters and panel forms are inline sections rather than disclosures (each change event re-renders).
