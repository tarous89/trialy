# CR03 — PI Network Management 1.0.1

CRO-side professional investigator intelligence: PI dossiers, dated institution affiliations, sourced trial experience, engagement history, follow-ups and study-specific human-reviewed matching. For small teams; no patient data, proprietary provider data, inferred recruitment capacity or automatic outreach.

Stable catalog ID: `life.pi-network-management`. This release adds 1.0.1 to the catalog; the uploaded 1.0.0 candidate was not registered. It does not replace published versions or migrate saved apps. CR03 is distinct from sponsor-side CO04 Investigator CRM.

## Canonical package

- `source.js`, `style.css`, `catalog.metadata.json`: renderer and self-contained MCP instructions.
- `schema_mapping.example.json`: ten scalar schemas, exact field kinds/options and logical-to-physical mappings.
- `demo_data.json`: invented test records; never import these into a customer workspace.
- `preview.html`: generated fictional local preview with simulated review, using the canonical source and CSS.
- `MCP_USAGE.md`, `DATA_CONTRACT.md`: setup and evidence rules.
- `AUTOMATION_RECIPES.md`, `automation.example.json`: optional shared-runner research and typed internal notification; neither activates anything.
- `QA.md`: reproducible acceptance and verification boundaries.

From the repository root run `node scripts/build-pi-network-template.mjs` to generate the catalog JSON and preview. `--check` verifies exact reproducibility and is included in the production build. The catalog embeds the usage contract and full schemas/mappings: ChatGPT does not need ZIP/repository access to install it correctly.

Stable native screen IDs: overview, directory, sites, experience, engagements, matching. Native `tracker:layout` reviews and persists tabs/cols/visible. Field ordering affects registers and forms; hidden/unlisted fields remain under Additional fields. Custom layout is presentation only and inherits the host's app/table/field access.
