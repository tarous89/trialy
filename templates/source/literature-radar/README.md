# Literature Radar 1.2.2 — app 10

Applicant-independent public scholarly metadata and evidence review for small research/biotech teams. Six screens: overview, topics, publications, reading queue, synthesis and monitoring instructions. No app-specific accounts, live search backend, publisher credentials or full-text ingestion.

Canonical inputs: source.js, style.css, catalog.metadata.json, schema_mapping.example.json, demo_data.json. Generate preview.html and ../../apps/life.literature-radar-1.2.2.json with `node scripts/build-literature-template.mjs`; use `--check` to detect drift. The repository build enforces it. Catalog loading discovers the version automatically; preserve old released versions and saved app identities.

All mandatory schemas/mappings/instructions are included in the MCP catalog. Examples in the standalone preview are fictional in-memory data, never seeds. The preview demonstrates reviewed changes; actual host integration is tested separately. The app works without automations. See MCP_USAGE.md, AUTOMATION_RECIPES.md and QA.md.
