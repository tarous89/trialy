# CR06 Client Signals & CRM 1.0.1

Seven-screen small-CRO workflow for companies, professional contacts, opportunities, interactions, public signals, follow-ups, research metadata and account briefings. No proprietary CRM integration, automatic outreach or active scheduler is required.

- Immutable catalog: `life.client-signals-crm@1.0.1`, generated at `templates/apps/life.client-signals-crm-1.0.1.json`.
- Canonical inputs: `source.js`, `style.css`, `fields.json`, `layout.schema.json`, `catalog.metadata.json`, `schema_mapping.example.json`, `demo_data.json`.
- Build from repo root: `node scripts/build-client-signals-template.mjs`; verify with `--check`.
- Setup: `MCP_USAGE.md`, the catalog-returned instructions/data contract, and `schema_mapping.example.json`. All physical fields are scalar; parent records must be saved before linking actual receipt UUIDs.
- Validation: `QA.md`; local examples are fictional and never customer seed data. `preview.html` simulates reviewed local writes; native layout requires the host.
- Optional research/email: `AUTOMATION_RECIPES.md`; zero automation is fully supported.

Version 1.0.1 supersedes the uploaded unregistered 1.0.0 candidate. Previously saved apps are never silently changed.
