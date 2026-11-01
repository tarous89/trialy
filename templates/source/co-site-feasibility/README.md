# CO03 Sponsor Site Feasibility 1.1.1

A six-screen internal sponsor study workflow: overview, study-site directory, questionnaire inbox, evidence comparison, selection and selected-site startup tasks.

- Catalog: `templates/apps/life.co-site-feasibility-1.1.1.json`; immutable ID `life.co-site-feasibility`. Separate from `life.cro-site-feasibility`.
- Build: `node scripts/build-co-site-template.mjs`; verify generated files with `--check`. The root production build includes this gate.
- Source: `site.source.js` is the canonical isolated function body; the builder embeds `role_definitions.json`, `layout.schema.json` and `site.css`. Configuration/bindings are injected once by the host.
- Setup: `INSTALLATION_AND_MCP.md`, `schema.example.json` and catalog-returned documentation provide the complete scalar schemas, exact mappings, versioned manifest, reviewed writes, lifecycle and native layout handoff.
- Optional work: `AUTOMATION_RECIPES.md`. Manual use with no automation is fully supported; installing a template enables no schedules or email.
- Acceptance and boundaries: `QA.md`. `demo_data.json` and `site.preview.html` are fictional local demonstrations, never installation seed data.
