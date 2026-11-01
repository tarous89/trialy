# Investigator CRM — CO04, version 1.0.1

Internal sponsor investigator relationship management: professional profiles, institutions, dated affiliations, public trial experience, interactions, collaborations, follow-ups and reviewed research evidence. Six screens use the existing TrialAgents account and app-level permissions. No separate authentication, patient data, investigator outreach or automatic scheduler is added.

Canonical source.js, style.css, catalog.metadata.json, schema_mapping.example.json and demo_data.json generate templates/apps/life.investigator-crm-1.0.1.json and the self-contained preview.html. Demo profiles are fictional and never seeded into real apps. The catalog embeds the setup, data, lifecycle and optional automation instructions used by MCP consumers.

```sh
node scripts/build-investigator-template.mjs
node scripts/build-investigator-template.mjs --check
node --import tsx --test tests/investigator-template.test.ts tests/investigator-integration.test.ts
node --import tsx scripts/test-investigator-browser.ts
npm run build
```

All fields must be mapped and scalar; archived and optOut are explicit booleans. Unknown preferences are never permission to invite. Reads stop at 960 rows per role; incomplete sources withhold dependent mutations. Dates use an explicit reporting cutoff asOf, not a fictional default or a historical snapshot. New interactions and optional follow-ups form one reviewed batch; receipt IDs may be linked after confirmation. Ordinary edits and archives retain the original version, and reviewed findings remain immutable.

See MCP_USAGE.md, DATA_CONTRACT.md, AUTOMATION_RECIPES.md and QA.md for the exact setup and validation boundaries. Database-wide foreign keys, external delivery and live deployment are not implied by package tests. Native Layout controls change presentation without widening permissions.
