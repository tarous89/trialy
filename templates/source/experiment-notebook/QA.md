# Release QA — Experiment Notebook 1.2.2

Validated 1 November 2026 against TrialAgents repository baseline `48dd7a4f2677b389ca06724451b61ff5e248bcdb`, authoring/usage contract 1.3.9. This replaces the unpublished uploaded 1.2.1 candidate. No previously released catalog JSON or saved user app is rewritten.

## Passed checks

- `node scripts/build-notebook-template.mjs --check`: reproducible catalog and fictional preview. Whole catalog read/list parses the new entry, including required tasks.promptExample; all seven scalar schemas and complete mapping instructions are included in MCP-returned documentation.
- `node --import tsx --test tests/notebook-template.test.ts`: **10 passed**. Real QuickJS and production design inspector; six routes; empty creation; marked controls; retained input and proposal drafts; denied/unknown/short/over-budget/array reads; original archive and editor versions; dependency rechecks; reviewed-evidence freezes and explicit reset; restricted field writes; time-point-separated means; normalized duplicate evidence; pagination; native layout parsing and actual field order/visibility.
- `APP_DESIGN_CHECKS=off node --import tsx --test tests/notebook-integration.test.ts`: **1 passed**. All migrations and real scalar schemas in isolated PGlite; reviewed parent/child records with actual saved UUIDs; actual AppTemplates.operation preparation, save and reopen; reviewed CRUD; concurrent conflicts; native layout save/reload/stale rejection. Design checks are separately exercised above without disabling the inspector.
- `APP_DESIGN_CHECKS=off node --import tsx scripts/test-notebook-browser.ts`: **passed**. Production sanitized iframe with the real manifest and database-backed host, all six screens at 320/390/768/1100/1440px. Enabled selectors and search, retained text/textarea/number/date/select controls, no write before trusted confirmation, confirmed create, native layout drag/save/reload, no page errors or horizontal page overflow. Browser harness waits for completed renders before the next dependent action.
- Final screenshot inspection and pagination-label readability at all five widths: **passed**. A narrow memo-navigation pager initially wrapped vertically; corrected CSS and fresh generated preview verified after that correction. Design inspector rerun passed on final CSS.
- Shared suite: `APP_DESIGN_CHECKS=off node --import tsx --test --test-concurrency=2 tests/app-templates.test.ts tests/frontend.test.ts tests/frontend-reads.test.ts tests/notification-guardrails.test.ts tests/shared-automations.test.ts`: **36 passed, zero failed/cancelled/skipped**. Includes 1,000-update coalescing, production notification roles, mocked delivery, authorization, expiry, deduplication, failure isolation and scheduler/callback independence. No real email sent.
- `npm run build`: **passed** including generated-package checks, TypeScript, Vite and embed build. Existing large-bundle advisory remains informational; no build errors.

## Fixed publication blockers

Required catalog task documentation; complete on-demand schemas; disabled host inputs/selectors; no empty project creation; archive version substitution and dependency races between local confirmation steps; unknown totals and incomplete mappings; lost draft values; misleading reviewed evidence after edits; inaccessible record actions; fixed-slice registers; nonfunctional column ordering; protocol/evidence provenance; time-point mixing; insufficient font/contrast; drawer expansion retention; narrow pager labels. No sandbox, authorization, database review or logging controls were relaxed.

## Verification boundaries

These are production-code integration fixtures, not a live customer account. Actual ChatGPT extension acceptance, deployed MCP discovery and unattended automation/email delivery are separate post-deployment outcomes and are not claimed here. The offline preview is fictional, not proof of authorization or persistence. No subscriptions, production records or email jobs are created by this package or its tests. Every app works with zero automations.

The 700-row-per-role window is explicit and fails closed when incomplete; scope must be narrowed for larger datasets. Protocol/review/dependency guards apply within this app; they do not add foreign keys or prohibit independently authorized Database edits. Do not describe this notebook as a validated ELN or signed scientific record.
