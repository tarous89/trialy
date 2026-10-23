# Connected workspace redesign

Implements [issue #11](https://github.com/tarous89/trialy/issues/11). Both production entry points use the branded Home / Database / Logs shell, with account Settings at the bottom. The plugin drawer starts closed. Generated resource frames keep their own styles.

## Home

The server normalizes permitted components, external collection links, saved functions and existing scheduled jobs. Functions and their schedules share one card. Unclassified components use a neutral Custom interface label, remain in All, and are not silently reclassified. Project and resource permissions are evaluated before metadata is returned.

Home combines project, resource type, search and sort filters. Responses are bounded to 40 resources by default (100 maximum); Load more retains the same filters. The current authorization routines still inspect candidate resources server-side, so very large catalogs may need indexed catalog optimization later. No full source or record values are sent for Home cards.

Field-layout thumbnails contain permitted field labels, never sampled values. Other resources use branded structural fallbacks. No automation or generated interface runs to create a thumbnail. The approved tracker reference remains the default for creating actual tracker content.

Grid/list preference is scoped to viewer/workspace/browser surface. Home state stays mounted across primary navigation; opening and returning from a resource retains filters, layout and scroll context. Project selection supports a bounded searchable expansion. Documents, project management, collections and legacy scheduled jobs remain contextual destinations.

## Current-action saves

There is no Needs review item, deferred approval inbox, or retrospective validity task. The authenticated confirmation tools can complete an action agreed in the current conversation. They set an internal current-action flag while preserving the AI actor. They do not impersonate a human or bypass workspace, field, project, role, digest, revision, expiry or stale-access checks. Receipts remain the evidence of saving. Background/generated code cannot use this flag and still needs an existing scoped grant for automatic writes.

Owner-only account/security policies that require a human session remain in Settings. Temporary unsaved proposals still exist as transaction inputs and expire; they are not presented as a later work queue. Historical review evidence is retained rather than deleted. External source submissions remain source material until explicitly accepted into working records; this is separate from retrospective approval of completed changes.

## Database and Logs

Database keeps on-demand paginated reads, project filtering, table search, permitted-value search/sort and field-type schema filtering. Restricted fields/tables remain schema-only.

Logs uses an explicit metadata feed rather than exposing raw audit snapshots. It combines audit events, queued/running code executions and existing automation runs. Unrestricted human audit readers retain their existing inspection boundary. Other users, including AI, receive permitted resource/table activity and their execution statuses; no private record values, source, raw diagnostic text or bearer links are returned.

Category, outcome, dates, actor, project, resource and text filters run on the server. Event details expose stable references and current context. Historical events without reliable project linkage remain workspace-level. CSV traverses all matching pages with a fixed upper time boundary, includes event references, UTC timestamps and filter context, and escapes spreadsheet formula prefixes. Exports above 50,000 rows fail explicitly and request a narrower filter; no partial file is downloaded. Permission changes are rechecked on each page.

Migration `036_execution_activity.sql` records terminal execution outcomes in the append-only audit store before temporary runs expire, and backfills outcomes still present at migration time. It cannot reconstruct outcomes already deleted before the migration. Terminal outcomes are not also listed as live runs. Infrastructure/network outages that never create application events are outside this feed.

## Verification

- `npm run check`, `npm run build`, and all 63 backend tests pass.
- `tests/home-activity.test.ts` covers current-action vs worker authorization, digest mismatch, repeated saves, metadata pagination/filtering, hidden-project exclusion, audit payload redaction, export pagination and outcome retention after run deletion.
- `scripts/test-workspace-ui.ts` exercises the production React entry point against synthetic API responses: Home → resource → Home, composed filters, layout retention, Database redaction, multi-page CSV and 390px mobile navigation/overflow.
- `scripts/test-home-design.ts` covers the shared presentation and keyboard menu/drawer behavior using the design fixture.
- Screenshots below use synthetic content. Real ChatGPT host interaction and download behavior require host acceptance; standalone Chromium is not proof of that integration.

[Home](home/workspace-home.png) · [Database](home/workspace-database.png) · [Logs](home/workspace-logs.png) · [Mobile](home/workspace-mobile.png)

The existing deployment process runs the additive migration before rollout. No new environment variables, services or credentials are required.
