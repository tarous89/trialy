# Life-science interface templates

23 independently discoverable templates, 143 screens, generated from one shared pure render/event implementation and domain configurations. Version 1.0.0. Authoring contract: `templates/TEMPLATE_AUTHORING.md` 1.1.1.

## Files

- `definitions.mjs`: domain screens, roles, logical fields and fictional standalone-only examples.
- `renderer.js`: pure synchronous frontend-js; no browser/network/service credentials. Uses the existing Vivid component engine for headings, tabs, stats, tables, details and pills.
- `theme.css`: requested light interfaces, dark KPI accents, shared typography/chart styles. Canonical Vivid assets are unchanged.
- `standalone-host.js`: reference browser harness, fictional in-memory data, explicit local-only review. Not included in catalog runtime source.
- `contracts/*.json`: screen/schema authoring contracts and source hashes.
- `../apps/life.*-1.0.0.json`: immutable generated catalog packages with current documentation and optional task recipes.
- `../standalone/*.html`: self-contained interactive references, no CDN, remote images or embedded font files. `index.html` is the gallery.

Run `node scripts/build-life-science-templates.mjs` after changing shared authoring sources. Publish a **new version** after a catalog contract has been released; never overwrite an existing published version. Generated app sources intentionally remain pinned to their version, like other custom app sources. Do not hand-edit one generated copy. Changing the shared authoring renderer requires regenerating and explicitly releasing a new catalog version; existing apps are never silently migrated.

## Install from ChatGPT

Read the current template usage guidance, choose a template with `list_app_templates`, then `read_app_template`. Reuse or separately create/review authorized schemas. For each role in `configuration.tableMap`, supply its real `typeId`, a logical-to-physical field map, and `writableFields` containing only keys granted write-mode by the manifest. UI email/url/longtext kinds are stored as `text`. Relationship targets are actual table IDs. Empty mapping is intentionally read-only and empty, not fictional live data.

Supply matching bindings and current schemaVersion/modes in the manifest to `prepare_app_from_template`. Preview, review and confirm using existing host operations; reconcile the actual save receipt. No templates auto-create customer records, duplicate an app to recover a preview, grant access, issue external requests or create recurring tasks.

## Deliberate MVP limits

These are functional **interface templates**, not full ERP/CTMS/ELN or all 572 candidate-scope capabilities. Bounded record editing, status filtering, page-local search/sort, pagination, details, pipeline, timelines, comparison weighting, local cash scenarios, source-linked research/report views and nonclinical plots are implemented. Deep financial reconciliation, automated stock ledger, verified global resource optimization, scientific significance testing, legal/regulatory submissions and live integrations are not.

Charts state their loaded-page scope except dashboard count queries. Cash forecasting is driven by explicit local assumptions, not invented financial data. Inventory on-hand is a reviewed snapshot; stock movement reconciliation is not implied. Task/report pages provide ChatGPT instructions; no active schedule or LLM execution is simulated. Actual ChatGPT host acceptance is separate from local/browser/bridge/backend test results.
