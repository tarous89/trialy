# Fundraise 2.0.0 (`life.investor-crm`)

Investor pipeline for a round, from first contact to signed commitment. Scope: [FUNDRAISE.md](../../../docs/product/app-template-blueprints/apps/FUNDRAISE.md). It follows [modular apps and shared data](../../../docs/product/MODULAR_APPS_AND_SHARED_DATA.md) (§4 core contract, §6 archive first, §7 role-based connections and in-app integrations) and template guidance 1.3.20. It replaces Investor CRM 1.0.1 as a new major version; the released 1.0.1 catalog JSON is unchanged and its source package is archived byte-for-byte under [`archive/1.0.1/`](archive/1.0.1/). Saved 1.0.1 apps are not migrated.

**Catalog status:** 2.0.0 is a **draft** catalog version until the owner approves it. `templates/catalog-seed.json` still names 1.0.1, so galleries and `list_app_templates` keep showing 1.0.1; tests approve 2.0.0 only inside their disposable databases.

## Files

| File | Purpose |
| --- | --- |
| `fundraise.source.js` | The `frontend-js` renderer: seven screens, round thermometer, funnel, stale and due, pipeline board, investors with proposals, lead and syndicate, offer comparison, tranches and milestones, activity, pass patterns, data-room engagement, integration lines; reviewed `records.propose` writes. It starts with the single-line `templateLayoutSchema` declaration. |
| `fundraise.css` | Vivid forest theme (`#087B58`) with a dark-teal hero and rail (`#243B40`), light canvas, one page scroll, the pipeline board scrolling inside its card, responsive 390–1440 px. |
| `catalog.metadata.json` | Catalog fields: options, instructions and the MCP-served documentation (data and interaction contracts, lifecycle, limitations, examples, tasks). |
| `schema.example.json` | Installer schema, registered in `templates/catalog-installers.json` (see roles below). |
| `demo_data.json` | Fictional preview records only (also the hand-checked dataset in the tests). Never seed it into a workspace. |
| `fundraise.preview.html` | Generated offline preview, fixed as of 11 Nov 2026. |
| `QA.md` | Commands, results, hand calculations, acceptance criteria and unverified boundaries. |
| `AUTOMATION_RECIPES.md` | The three optional automations and the no-automation path. |

Edit the source, CSS and metadata, then run `node scripts/build-investor-template.mjs`. This regenerates `templates/apps/life.investor-crm-2.0.0.json` and the preview; `--check` runs in `npm run build`. Do not edit a released version: publish a new version and archive the previous package first.

## Roles (installer schema, section 5 of the scope)

| Role | Contract | Mode |
| --- | --- | --- |
| `organizations` | core.v1 | read/write; investors are `org_type` investor |
| `people` | core.v1 | read/write; investor contacts |
| `fundraise.settings`, `fundraise.investor_profiles`, `fundraise.rounds`, `fundraise.opportunities`, `fundraise.activities` | fundraise.v1 | Fundraise's own tables |
| `fundraise.tranches` | fundraise.v1 | **output**, exactly the registry entry in `templates/contracts/outputs.json`; Fundraise is its single writer; read by Runway and Investor Updates |
| `dataroom.access_grants`, `dataroom.engagement` | dataroom.v1 | `optional` + `integration`: own table for manual entry; the provider's table read-only once linked |
| `programs.plan_items` | programs.v2 | `optional` + `integration`, binds only `name`, `program_id`, `item_type`, `end_date`, `status`, `is_key`: own milestone entries until linked to Programs |

Installed alone: 11 tables. With a Data Room provider and Programs already in the workspace, the "Use existing data?" dialog connects their tables (Connect is the default) read-only and no own tables are created for them.

## Integrations

Engagement shows one subtle line, rendered as `<button data-trialy-integration="install|connect <role>">`, only when `integrations.list` returns an offer: "Works with Data Room. **Add Data Room**" or "Data Room is in your workspace. **Use its data**" (access first, then "Use its view data"). The Round screen shows "Works with Programs. **Add Programs**" / "Programs is in your workspace. **Use its milestones**". The platform opens the dialog; once linked, the data is read-only, own entries stay in Database and nothing is merged. "Add Data Room" appears only once a Data Room template is approved in the catalog (the registry writer is the planned Data Room app); until then a custom app providing `dataroom.v1` can be linked with "Use its data".

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
