# CR05 Sponsor Updates

`life.cro-sponsor-updates` v1.0.1, aligned with TrialAgents template guidance v1.3.9.

Five screens: Overview, Delivery, Risks & decisions, Team updates, Sponsor reports. Manage sponsors & projects opens the parent directories. Eight scalar roles keep sponsor/project identities, delivery evidence, functional inputs, independently reviewed reports and manually confirmed distribution separate.

Canonical inputs: sponsor.source.template.js, sponsor.css, role_definitions.json, schema.example.json, layout.schema.json, catalog.metadata.json and demo_data.json. The repository builder generates templates/apps/life.cro-sponsor-updates-1.0.1.json and preview.html. The standalone preview uses fictional data and simulated review; it cannot prove permissions, save customer records, configure the real native layout or deploy an app.

From the repository root:

```sh
node scripts/build-sponsor-updates-template.mjs
node scripts/build-sponsor-updates-template.mjs --check
node --import tsx --test --test-concurrency=1 tests/sponsor-updates-template.test.ts tests/sponsor-updates-integration.test.ts
node --import tsx scripts/test-sponsor-updates-browser.ts
npm run build
```

See MCP_USAGE.md for installation and safe revisions, AUTOMATION_RECIPES.md for optional explicit setup, and QA.md for release evidence. The superseded candidate Python generators and local-only QA claims are not release inputs. This package enables no automation and sends nothing to sponsors. Repository publication and deployment are separate outcomes.
