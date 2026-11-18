# Platform app catalog

The website and MCP read approved versions from `app_template_catalog`. The catalog stores the immutable template payload, digest, installation schemas, and `status` (`draft` or `approved`). Runtime database roles have SELECT only, with an approved-only RLS policy. Publishing is an operator action, not a tenant permission.

Migration 056 and `db:migrate` import repository versions once. `templates/catalog-seed.json` approves the existing 23 life-science versions requested for launch. Do not extend this bootstrap approval list for future releases. Owner-approved exceptions: on 11 November 2026, `life.cash-runway` was moved from 1.2.2 to Runway 2.0.0, then to Runway 2.1.0, and `life.project-oversight` was moved from Project Oversight 1.0.1 to Programs 2.0.0. On 12 November 2026 the owner approved Programs 2.1.0: the seed names it for new databases, and one-time migration 062 approves the draft row an earlier deployment had imported (a later withdrawal is not undone). Existing statuses and payloads are never overwritten by deployment. New versions default to draft; older approved versions remain available until replaced or withdrawn.

Contracts (`life.contracts`) 1.0.0 was added on 12 November 2026 as a draft (#140) and approved the same day at the owner's request: the seed names 1.0.0 and migration 063 approves the draft row imported by that deployment, once. On 14 November 2026 the owner approved Contracts 1.1.0 in place of 1.0.0:
- the seed names 1.1.0, so the sync after migrations imports it approved;
- migration 073 withdraws 1.0.0 once (`templates/catalog-retirements.json`);
- the 1.0.0 source is archived under `templates/source/contracts/archive/1.0.0/`, and its installer entry points there.

Installed 1.0.0 apps keep working.

On 15 November 2026 the owner approved Programs (`life.project-oversight`) 2.2.0 in place of 2.1.0 ([PROGRAMS.md §14](product/app-template-blueprints/apps/PROGRAMS.md#14-programs-220-assistant-control-team-notifications-and-the-weekly-digest)):
- the seed names 2.2.0, so the sync after migrations imports it approved;
- migration 075 withdraws 2.1.0 once (`templates/catalog-retirements.json`);
- the 2.1.0 source is archived under `templates/source/project-oversight/archive/2.1.0/`, and its installer entry points there;
- the gallery adds `life.project-oversight@2.2.0`.

Installed 2.1.0 apps keep working.

CRO Selection (`life.cro-selection`) 2.0.0 was added on 13 November 2026 as a draft. It replaces CRO Selection 1.0.1 and Sponsor RFP Management (`life.sponsor-rfp-management`) 1.0.1. The revision for the platform changes of 14 November and AI-native control ships as 2.1.0 (15 November 2026, draft): 2.0.0 had already been imported as a draft and imported rows never change, so its package is archived under `templates/source/cro-selection/archive/2.0.0/`, its installer entry points there, and both retirements now name 2.1.0 as the replacement. The owner approved 2.1.0 on 15 November 2026: the seed names it, so the sync after migrations imports it approved; Sponsor RFP Management is no longer in the seed; one-time migration 077 withdraws both 1.0.1 versions. Gallery card and media were updated. Installed 1.0.1 apps keep working. Versions to withdraw on a replacement's approval are listed in `templates/catalog-retirements.json`; deployment does not act on that file.

Data Room (`life.data-room`) 1.0.0 was added on 13 November 2026 as a draft, built on the exchange room extension (EXTERNAL_EXCHANGE.md §5). It is a new template, so nothing is retired. It writes the `dataroom.v1` outputs: in `templates/contracts/outputs.json` its writer is now `life.data-room`, and `room_purpose` gains `partnering` (an additive change). It is not in the seed until the owner approves it.

Data Room 1.1.0 was approved by the owner on 15 November 2026: the seed names it, so the catalog sync imports it approved. 1.0.0 was never approved; it stays a draft and byte-identical, with its source archived under `templates/source/data-room/archive/1.0.0/` and its installer entry pointing there. Nothing is retired. Gallery card and screenshot added. Scope: [DATA_ROOM.md §14](product/app-template-blueprints/apps/DATA_ROOM.md#14-data-room-110-platform-standards-assistant-control-and-notifications).

Partnerships (`life.partnership-tracker`) 2.1.0 was approved by the owner on 14 November 2026 in place of Partnership Tracker 1.1.1. The first build, 2.0.0 (#164), had already been imported as a draft, and a published row never changes, so the revision with the platform automation declarations and customization ships as 2.1.0. 2.0.0 stays a draft with its files under `templates/source/partnership-tracker/archive/2.0.0/`. The seed names 2.1.0, so the catalog sync that runs after migrations imports it approved. One-time migration 071 withdraws 1.1.1, and its gallery card and media were updated. Installed 1.1.1 apps keep their saved source and data.

Partnerships 2.2.0 was approved by the owner on 15 November 2026 (app commands, the integration standard, research with its digest email as one automation and run-time fields; [PARTNERSHIPS.md §12b](product/app-template-blueprints/apps/PARTNERSHIPS.md)). As for Runway 2.2.0, the seed names 2.2.0 and there is no migration: 2.1.0 stays approved in existing catalogs, the gallery shows the latest approved version, and installed copies keep their source. The 2.1.0 package is archived byte-identical under `templates/source/partnership-tracker/archive/2.1.0/`, where its installer entry now points.

Fundraise (`life.investor-crm`) 2.0.0 was approved by the owner on 14 November 2026 in place of Investor CRM 1.0.1. 2.0.0 had never been imported (PR #137 was revised before merging), so the version stays 2.0.0: the seed names it, the catalog sync after migrations imports it approved, and migration 072 withdraws 1.0.1 once (listed in `catalog-retirements.json`). Installed 1.0.1 apps keep their saved source and data; the 1.0.1 JSON is unchanged and its package is archived under `templates/source/investor-crm/archive/1.0.1/`. Note that main has two migrations numbered 071 (`071_app_function_dependencies.sql`, `071_approve_partnerships_2_1_0.sql`); both run, in file-name order.

Trial Radar (`life.trial-radar`) 1.0.0 was approved by the owner on 15 November 2026 (#179): the seed names it, so the catalog sync imports it approved. The other seven Bio Radars were approved the same day, each an independent app: Pipeline, Deal, Funding, Patent, Market and Regulatory Radar 1.0.0 and Literature Radar 2.0.0. None had been imported; the seed names them, and migration 074 withdraws Literature Radar 1.2.2 once (listed in `catalog-retirements.json`). Installed 1.2.2 apps keep their saved source and data; the 1.2.2 JSON is unchanged.

Investor Updates (`life.investor-updates`) 1.0.0 was built on 15 November 2026 (#189) and approved by the owner on 17 November 2026. It had never been imported, so the seed names it and the catalog sync after migrations imports it approved; no migration. It is a new template, so nothing is retired. Gallery card and screenshot added. Scope: [INVESTOR_UPDATES.md](product/app-template-blueprints/apps/INVESTOR_UPDATES.md); deviations required by platform contracts are listed in `templates/source/investor-updates/QA.md`.

For CRO Selection, when the owner approves 2.0.0, the publication change does four things:
- names 2.0.0 in the seed;
- adds a one-time migration that approves the 2.0.0 draft row and sets both retired versions to `draft` (withdrawn);
- removes the `life.sponsor-rfp-management` seed entry and gallery card;
- regenerates the gallery media.

Released files, installer schemas and installed apps stay unchanged.

## Channel switches (platform, ChatGPT, Claude)

`templates/catalog-availability.json` gives every app in the seed three switches: `platform` (website template gallery and installer), `chatgpt` (the ChatGPT MCP endpoint, including the plugin gallery) and `claude` (the Claude MCP endpoint). A switch covers every version of the app. When it is `false`, that channel neither lists, reads, previews nor installs the app (`list_app_templates`, `read_app_template`, template media, `read_template_installation`, data access step, `install_app_template` and the website equivalents answer "Template unavailable"). Approval status is unchanged and saved apps keep working everywhere. The public landing page is a separate site and is not affected.

The channel comes from the caller: signed-in website sessions are `platform`; MCP tokens are AI principals of ChatGPT or Claude. Apps outside the file (test fixtures, unreleased drafts) are not switched off, so a newly approved app must be added to the file; `tests/template-availability.test.ts` fails when a seed app has no entry.

17 November 2026 (owner): the 16 current apps (Runway, Programs, Fundraise, Contracts, Partnerships, Data Room, Investor Updates, CRO Selection and the eight Bio Radars) are on for all three channels. The 16 older apps (Inventory Management, PI Network Management, Grant Pipeline, Site Feasibility Management — Sponsor, Experiment Notebook, Client Signals & CRM, Trial Regulatory Submission, CRO Oversight, Publication Management, Biotech Hiring & Resource Management, CRO Resource Planning, RFP Management, Site Feasibility Management, Investigator CRM, Sponsor Updates — CRO, Trial Monitoring & PV Oversight — Sponsor) are off for all three.

Use the migration/operator database connection in `MIGRATION_DATABASE_URL`:

```
node --import tsx scripts/template-catalog.ts sync
node --import tsx scripts/template-catalog.ts list
node --import tsx scripts/template-catalog.ts approved life.example 1.0.0
node --import tsx scripts/template-catalog.ts draft life.example 1.0.0
```

Before approval, review the source, documentation and installation schema stored in the row. For each new template version, add a `templateId@version` entry to `templates/catalog-installers.json` pointing to its role-keyed installation schema (name, fields, logicalFields). Sync imports both source and schemas into a draft database row. Run the installer integration tests for that version before approval. Never include sample records, customer data or credentials. Schema changes require a new version; never mutate a released JSON file.

Use app is an explicit user action on the website or inside the ChatGPT/Claude plugin. The app-only `install_app_template` MCP action requires `confirmed:true`, preserves the connected assistant’s access principal, finalizes the approved template preview and reuses the normal confirmation path. It returns the saved app ID, which the plugin opens in place. Do not send plugin users to the web installer. It creates empty tables and a saved app in one transaction using existing permission, schema, audit and confirmation paths. Retries reuse an actor/workspace-scoped receipt. Failed installations roll back entirely. No connectors, automations or outgoing messages are enabled. Installed copies remain usable when a catalog version is withdrawn. When existing tables can serve the template's roles, Use first shows the [Use existing data? dialog](product/MODULAR_APPS_AND_SHARED_DATA.md#data-access-step-at-install-only): Connect or Create new per table. Its Add app (`confirm_data_access`, app-only inside the plugins) runs the same installer with those choices; everything not connected gets a new table. The installer records each installer role with a contract on the app manifest (`manifest.roles`).

Apps open in the same platform tab, under the TrialAgents header. Platform navigation is expanded by default; app navigation is collapsed until opened. Assistant customization actions offer separate ChatGPT and Claude links. ChatGPT and Claude research use their own separately authorized shared runners.

Templates is not in the sidebar. Reach the dedicated page through New → App or Browse app templates on Apps. The web header always has Open ChatGPT and Open Claude CTA buttons; the plugin uses Open TrialAgents instead. Cards have only Preview and Use actions and an always-visible customization/usability note for both assistants. Full descriptions open with the preview.

The Templates page has Team/Workflow filters, screenshots and sandboxed interactive sample previews. Apps only links to this dedicated destination. Card metadata lives in `src/shared/template-gallery.ts`. Generate versioned screenshots and the digest manifest with `node scripts/build-template-screenshots.mjs` after installing Playwright Chromium. The script only renders repository sample HTML and blocks external requests. For new catalog versions, add their reviewed metadata and installer mapping (without expanding bootstrap approval), generate media, and approve through the operator flow. Media endpoints check approval and exact catalog digest; preview HTML is also hash checked and sandboxed without account, network, forms, popups or top navigation access. Preview does not install anything.

On 18 November 2026 the owner approved a batched-read patch release of all 16 switched-on apps in one decision: Runway 2.2.1, Contracts 1.1.1, CRO Selection 2.1.1, Data Room 1.1.1, Fundraise 2.0.1, Investor Updates 1.0.1, Partnerships 2.2.1, Programs 2.2.1, Literature Radar 2.0.1 and Deal, Funding, Market, Patent, Pipeline, Regulatory and Trial Radar 1.0.1. Each is its predecessor with `records.readMany` in its read helper and no feature change:
- the seed names the new versions, so the sync after migrations imports them approved;
- migration 078 withdraws the sixteen replaced versions once, as listed in `templates/catalog-retirements.json`;
- each released version is archived unchanged under its app's `archive/<version>/` folder and its installer entry points there;
- the screens are unchanged, so each new version's gallery image is its predecessor's.

Installed apps keep their saved source and keep working; they gain the faster reads only when their source is updated to the new version.
