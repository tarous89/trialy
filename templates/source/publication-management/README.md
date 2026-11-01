# Publication Management — app 12

Version `1.0.1`, catalog ID `life.publication-management`, engine `frontend-js`.

Seven internal editorial screens cover publication overview, manuscript pipeline, authors, review rounds, journal/congress targets, submission timelines and reports. The existing TrialAgents account, authorized data, reviewed writes and official host watermark remain the platform boundary. No extra login, journal submission, signature service or patient-data workflow is supplied.

`source.js`, `style.css` and `catalog.metadata.json` are canonical. `schema_mapping.example.json` supplies the exact eight scalar schemas and physical/logical mappings. Full setup contracts also travel in catalog documentation through MCP. `demo_data.json` and `preview.html` contain fictional review-only examples; never seed production with them. `automation.example.json` is an inactive substitution example, not an automation definition to install unchanged.

Build with `node scripts/build-publication-template.mjs`; verify with `node scripts/build-publication-template.mjs --check`. The generated catalog lives at `templates/apps/life.publication-management-1.0.1.json`; the main build checks for drift. No server route, migration, new service, credential or environment change is required. Existing saved apps retain their source until explicitly revised.

See MCP_USAGE.md for setup/recovery, AUTOMATION_RECIPES.md for optional background work, and QA.md for release evidence and deployment boundaries.
