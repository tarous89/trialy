# Literature Radar 1.2.2 — release QA

Reviewed 2026-11-01 against current guidance 1.3.9 and the actual catalog, database schema, reviewed mutation, QuickJS, production frame and native layout contracts. Original input: Literature_Radar_App10_v1_2_1_Architect_Complete.zip. No uploaded claims of host acceptance were treated as evidence.

## Corrected blockers

- Edit/archive now send recordId and the original expectedVersion; version conflicts retain drafts.
- Real design-gate font/contrast failures repaired without disabling the inspector or changing the sandbox.
- Errors appear inside editors/confirmation dialogs. Form-level submit action avoids duplicate focus targets, and proposals retain local inputs until a trusted receipt/reopen.
- Complete scalar schemas, exact mappings, null semantics and receipt-ID setup are embedded in the MCP catalog.
- Missing mappings, denied/unknown/short reads and arrays remain incomplete. Unsaved/read-only apps cannot propose changes.
- Copied records clear original IDs and approval state. Scope changes cannot reinterpret existing screening/findings; reviewed reports must be revised before supporting reviewed findings change.
- Native column visibility/order takes effect; editor fields remain reachable. Findings are paged, and the included-source preview is explicitly labelled. QuickJS date formatting is deterministic.
- Reproducible source package, generated catalog and preview; builder --check is part of npm run build. No automatic migration of existing apps.

## Commands and evidence

```sh
node scripts/build-literature-template.mjs --check
node --import tsx --test tests/literature-template.test.ts tests/literature-integration.test.ts
node --import tsx scripts/test-literature-browser.ts
APP_DESIGN_CHECKS=off node --import tsx --test --test-concurrency=2 tests/app-templates.test.ts tests/frontend.test.ts tests/frontend-reads.test.ts tests/shared-automations.test.ts tests/notification-guardrails.test.ts
npm run build
```

Five template/integration tests pass. The real database fixture creates seven documented scalar schemas through reviewed operations, substitutes actual parent receipt UUIDs, prepares the unmodified catalog through AppTemplates.operation, saves/reopens and runs all six screens. It passes the production design inspector, confirms create/edit/archive, rejects stale edits, and reviews/persists/reloads layout without changing the manifest. Runtime regressions cover denied/missing/unknown/short/array evidence, empty creation, scalar validation, draft retention and copied review state.

Connected-browser acceptance covers all six screens at 320/390/768/1100/1440px, zero document horizontal overflow, actual manifest-attached sanitized controls, visible validation error, text/textarea/number/date/select input, reviewed record creation, native screen/column movement and reload. Screenshots inspected at mobile and desktop sizes; no uncaught page errors. This uses the production frame and native layout UI against a synthetic local database.

The 36 shared regression checks cover catalog validation/digests, reviewed source and data access, actual MCP SDK transport, access revocation, pending reads, shared-runner failure isolation, duplicate/expired jobs, notification coalescing over 1,000 committed changes, cancellation, quotas and retry receipts. Email delivery is mocked. Full type/production build and generated-file checks pass; the existing Vite chunk-size advisory is nonblocking.

## Limits and separate deployment verification

Repository readiness is distinct from deployed MCP discovery, a live ChatGPT session, a customer saved-app receipt, unattended research quality and delivered email. Those live outcomes were not exercised or claimed. No customer records, schedules or messages were created. Optional research instructions are publisher guidance, not an implemented search algorithm; source quality still needs authorized review. Manual use with zero automations is supported.

The app reads at most 1200 records per role and has app-level access, not HTML-based security. Dependency/provenance checks are app logic, not cross-app database constraints; reconcile independent table edits. Narrow authorized scope or separately implement backend paging for larger datasets. asOf is a date-comparison reference, not historical reconstruction. Preserve prior versions and deploy the normal repository release before claiming MCP availability.
