# Life-science template collection — authoring evidence

23 versioned, publisher-managed `frontend-js` template packages and 23 standalone HTML demonstrations cover the user-approved 143 screen names. They follow `templates/TEMPLATE_AUTHORING.md` version 1.1.1; source and canonical Vivid hashes are recorded in `BUILD_MANIFEST.json`.

## Verified before release

- Standalone browser inspection: all 143 screens at 320, 390, 768, 1100 and 1440 pixels; page-width, navigation and toolbar-row checks, no browser errors. The reference harness runs the same pure render source as the installed package, with explicitly fictional, local-only records.
- All 23 standalone apps: create/edit proposals, local review/cancel, search, record details, filter disclosure without a database read, and versioned local changes. These local confirmations never write to TrialAgents.
- Seven focused catalog/backend tests: immutable version/digest, full metadata, allowed schema mapping, all screens filled and empty under render limits, explicit writable fields, proposal-only inputs and actions. Existing app-template tests now recognize optional Tasks metadata rather than assuming all templates are non-recurring.
- Real PGlite backend fixture: four tables with 28 fields each; preview, confirmed save, reopening and receipt recovery; proposed record update distinct from commit; stale revision rejected; revoked AI access denied. Uses actual migrations and shared services, not a simulated storage layer.
- Official `inspectAppDesign` pass for every screen at 1440/390, retaining its existing text-size, contrast, overflow and overlapping-control checks. No quality gate or platform CSS was weakened. The template's table names, empty-lane contrast, supporting labels and forecast headers were corrected.
- Actual shipped sandbox-frame bridge tested at 1440/768/390 for all apps: navigation, sanitization, toolbar behavior, transient failure retaining the displayed view, input focus/drafts across repaint, and proposal-only submission. This caught and fixed unique input-action identities. The trusted platform frame remains unchanged.

## Reproduce

```sh
node scripts/build-life-science-templates.mjs
npm run build
APP_DESIGN_CHECKS=off node --import tsx --test --test-concurrency=1 tests/life-science-templates.test.ts tests/app-templates.test.ts
node --import tsx tests/life-science-design.check.mjs
node --import tsx tests/life-science-frame.check.mjs
```

The fixture-only `APP_DESIGN_CHECKS=off` avoids repeated browser launches inside the database regression suite; the separate design command runs the production design checker unchanged. CI additionally runs the existing full build/unit/visual suites and three bounded interface-test groups. Optional `QA_START`/`QA_END` select a slice; `CHROMIUM_EXECUTABLE` can select a local installed browser for test harnesses only.

## Scope of the delivered interfaces

This is a functional interface-template MVP, not a claim that every one of the 572 previously proposed business capabilities is a completed SaaS module. Tables, forms, reviewed field proposals, basic visualizations, timelines, comparisons and report displays are implemented. Formula scenarios are explicitly local assumptions; inventory cards show recorded stock snapshots, not a full reconciled movement ledger. Capacity is bounded allocation analysis, not a global optimizer. Searches and sort clearly state their loaded-page scope. Relationships outside the loaded choices retain their original value and require a guided selection.

Catalog packages contain no fictional records. They start empty without authorized `tableMap`/bindings; schema creation, record import and application saving remain separately reviewed. Provider search, web monitoring, LLM synthesis and reports stay in ChatGPT. No Task is created or shown as active by these interfaces; setup guidance has a manual fallback.

## Not established by these tests

Synthetic iframe testing is not proof of the actual ChatGPT host UI or an unattended ChatGPT Task. No live customer records, outbound emails, patient data, provider account, proprietary dataset, clinical validation, electronic signature, or automatic recurring write permission was created. Availability in the deployed catalog must be verified through the live plugin after the release deployment. No plugin archive change is needed for this compatible catalog expansion.
