# CO06 Trial Monitoring & PV Oversight

`life.co-trial-monitoring-pv` v1.1.1, aligned with TrialAgents guidance v1.3.9.

Five screens: Overview, Monitoring events, PV agreements, PV activity calendar, Briefings. Eight scalar roles separate monitoring visits/findings from agreement versions, pinned obligation definitions and dated activity occurrences. No patient safety cases or statutory reporting.

Canonical inputs are oversight.source.template.js, oversight.css, role_definitions.json, layout.schema.json, catalog.metadata.json, schema.example.json and demo_data.json. The repository builder generates templates/apps/life.co-trial-monitoring-pv-1.1.1.json and preview.html. The preview uses fictional data and simulated local review; it does not validate real permissions, save customer records, configure native layout or deploy an app.

From the repository root:

```sh
node scripts/build-monitoring-pv-template.mjs
node scripts/build-monitoring-pv-template.mjs --check
node --import tsx --test --test-concurrency=1 tests/monitoring-pv-template.test.ts tests/monitoring-pv-integration.test.ts
node --import tsx scripts/test-monitoring-pv-browser.ts
npm run build
```

See MCP_USAGE.md for installation, revisions and migration; AUTOMATION_RECIPES.md for separately approved optional automation; QA.md for release evidence. Do not use the superseded candidate Python generators or local-only test claims. The package requires current host review, manifests, native layout and the shared automation engine. Repository availability does not establish live deployment.
