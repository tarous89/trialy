# CO05 — Trial Regulatory Submission 1.0.1

Internal, non-patient regulatory operations: jurisdiction dossiers, applicable requirements, immutable document versions and exact-version reviews, authority questions, milestone history, and evidence-linked briefings. No official filing, portal connection, statutory deadline calculation, electronic signature or validated compliance claim.

Catalog ID: `life.trial-regulatory-submission`. The uploaded 1.0.0 candidate was not registered. This release adds a distinct 1.0.1 catalog; it does not overwrite published versions or migrate saved apps.

## Canonical package

- `source.js`, `style.css`, `catalog.metadata.json`: renderer and complete MCP-delivered setup/lifecycle documentation.
- `schema_mapping.example.json`: exact scalar schemas and logical-to-physical mappings.
- `demo_data.json`: invented evidence for tests and the standalone preview only; never import into a customer workspace.
- `preview.html`: generated fictional local interaction preview with simulated review.
- `automation.example.json`, `AUTOMATION_RECIPES.md`: optional typed shared-platform automation configuration; nothing is enabled by the package.
- `MCP_USAGE.md`, `DATA_CONTRACT.md`, `QA.md`: installation, data rules, reproducible acceptance and verified boundaries.

Run `node scripts/build-regulatory-template.mjs` from the repository root to regenerate `templates/apps/life.trial-regulatory-submission-1.0.1.json` and `preview.html`. The same command with `--check` fails on drift and is included in `npm run build`. The catalog contains its own complete usage contract; a ChatGPT consumer does not need repository access.

Six stable native layout screen IDs: `desk`, `tracker`, `plan`, `documents`, `questions`, `readiness`. Native gear `tracker:layout` changes screen/field order and visibility through reviewed persistence. Hidden/unlisted fields remain accessible under Additional fields, which opens on validation failure. Custom views inherit app/table/field access; layout visibility is not a security control.
