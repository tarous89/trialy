# Sponsor RFP Management 1.0.1

Sponsor-side CRO outsourcing, manually collected bids, weighted reviews and human-approved decisions. This is app #16 from the supplied Sponsor RFP package. It is distinct from the existing CRO bid-team template `life.cro-rfp-management`; neither its catalog nor existing apps are replaced.

Stable catalog ID: `life.sponsor-rfp-management`. Six screens: sourcing desk, projects, scope/criteria, responses, evaluation and award memo. Eight scalar table roles are specified in `schema_mapping.example.json`; all demo records and preview actions are fictional and local only. Never seed those rows in a customer's app.

Canonical files are source.js, style.css, catalog.metadata.json, schema_mapping.example.json and demo_data.json. The builder generates the server-discovered catalog under templates/apps and the self-contained preview.html from these same files. Setup and optional automation instructions are embedded in the MCP-returned catalog, not just in this directory.

```sh
node scripts/build-sponsor-rfp-template.mjs
node scripts/build-sponsor-rfp-template.mjs --check
node --import tsx --test tests/sponsor-rfp-template.test.ts tests/sponsor-rfp-integration.test.ts
node --import tsx scripts/test-sponsor-rfp-browser.ts
npm run build
```

The repository build checks generated-file drift. See MCP_USAGE.md for setup/recovery, AUTOMATION_RECIPES.md for optional behavior and QA.md for the exact release evidence and verification boundaries.

Final approvals and their sourcing evidence are immutable in the app. Correct a decision by approving a new linked decision: one reviewed transaction supersedes its predecessor and updates the new award/project. Changed scope/evidence requires a new RFP revision. Each project evidence write version-checks the project as well as its target row, serializing app proposals. Independent Database writes require separate reconciliation; this app does not create database-wide foreign keys or regulated electronic signatures.
