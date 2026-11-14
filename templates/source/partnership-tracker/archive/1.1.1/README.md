# Partnership Tracker — App 14

Catalog `life.partnership-tracker`, version `1.1.1`, engine `frontend-js`.

Six internal screens cover partnering overview, partner directory, deal pipeline, opportunity evaluation, meetings/agreements and partner discovery. The relationship workbench and company profile design are retained. Identity, access, review, logs, native layout and the official linked TrialAgents watermark belong to the host. No app-level login or email sending is included.

Canonical inputs: source.js, style.css and catalog.metadata.json. schema_mapping.example.json defines eight scalar roles with exact physical keys and select values. demo_data.json and generated preview.html are fictional review-only materials; never seed production. automation.example.json requires real saved identifiers and explicit authorization before use.

Generate with `node scripts/build-partnership-template.mjs`; verify with `node scripts/build-partnership-template.mjs --check`. The main build checks the generated `templates/apps/life.partnership-tracker-1.1.1.json` and preview for drift. Full setup instructions travel through the MCP catalog, with no repository access required.

No new database migration, service, environment variable or credential is required. Saved instances retain their source until explicitly revised. See MCP_USAGE.md, AUTOMATION_RECIPES.md and QA.md for setup, optional background work and verified release boundaries.
