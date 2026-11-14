# Partnerships 2.0.0 (`life.partnership-tracker`)

Out-licensing, in-licensing, co-development, research, academic and platform deals by asset, from first contact to signature: conferences, follow-ups and partner news, with the assistant doing the research and the admin. Scope: [PARTNERSHIPS.md](../../../docs/product/app-template-blueprints/apps/PARTNERSHIPS.md) (BT2-07). It replaces Partnership Tracker 1.1.1, whose released files are archived unchanged under [`archive/1.1.1/`](archive/1.1.1/) (built by `scripts/build-partnership-template.mjs`). There are no existing users, so there is no migration.

## Files

| File | Purpose |
|---|---|
| `partnerships.source.js` | Readable app source (`frontend-js`). Line 1 is `templateLayoutSchema` with seven screen IDs. |
| `partnerships.css` | Vivid kit styles, theme forest (`#087B58`). |
| `catalog.metadata.json` | Catalog entry: description, options, instructions and documentation (setup, data contract, automations). |
| `schema.example.json` | Installer schema with the roles below; `templates/catalog-installers.json` points here. |
| `demo_data.json` | Fictional assets, partners, contacts, opportunities, stage history, a conference with briefs, signals (`.invalid` emails). |
| `automation.examples.json` | Fictional follow-up reminder actions set up in chat (they need `status = open`); research, digest and briefs are `recommendedAutomations` in the catalog entry. |
| `partnerships.preview.html` | Offline fictional preview (generated). |
| `AUTOMATION_RECIPES.md` | The install recommendations and the chat-set-up reminders. |
| `QA.md` | PARTNERSHIPS.md §13 results. |

Build: `node scripts/build-partnerships-template.mjs` writes `templates/apps/life.partnership-tracker-2.0.0.json` and the preview. `--check` (part of `npm run build`) fails when either is stale. The version is a draft until the owner approves it; `templates/catalog-retirements.json` lists 1.1.1 for withdrawal on approval.

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
| Digest | Settings shows the digest as the research worker composes it (§6), for the cadence of the latest research report: subject line, Moved / Due / Stalled / Coming up / New about your targets / Suggested targets, at most 3 items per section, about 150 words, empty sections left out, no deal terms, notes, briefs or rationales. Each run saves it as a research report; the `partner_digest` automation emails it to registered members only. |
| Automations | `recommendedAutomations`: `partner_research`, `partner_digest`, `meeting_briefs`, selected by default at install, with create-only write permission on signals, research reports and briefs. The app links to them and never stores schedules. |
| Customization | Columns per list (layout gear, six groups), saved views with columns and sort, stage labels / hidden / custom stages, activity kinds and deal types, preferences and custom fields, all through reviewed changes by a person or Claude / ChatGPT (PARTNERSHIPS.md §12a). |
| Outreach | None. No screen or automation emails partners; there are no mail links; contacts' emails are shown as text. |
| Reads | Bounded (8 × 100 rows per table). An unbound, unavailable, short, unknown-total or over-budget read is labelled partial and disables changes. |

The sanitized frame strips `open` from `<details>`, so filters and panel forms are inline sections rather than disclosures (each change event re-renders).
