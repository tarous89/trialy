# Publication Management 1.0.1 release evidence

Review scope: app 12, critical service failures and misleading behavior; current template authoring/usage guidance 1.3.9 and the repository's actual runtime contracts. All fixtures are synthetic and isolated. No customer records, scheduled work or email delivery were created.

## Corrected release blockers

- Edit/archive proposals now use the real `recordId` contract and the original optimistic version, including zero. Stale/deleted/revoked edits fail with retained drafts.
- Withdrawal requires a separately recorded dated confirmation. Candidate target/version evidence is checked before submission; historical submission/withdrawal evidence and original deadlines are protected. Copies clear original identity and protected approval/outcome state.
- Full schemas, scalar flags, required fields, select options, logical/physical mappings, parent receipt substitution and recovery instructions are returned by MCP catalog documentation. They are not dependent on repository access.
- Every control uses the host event/state contract. Optional empty select/reference values use null. Validation appears inside dialogs; proposals retain drafts until host confirmation/reconciliation. Additional fields keeps hidden required inputs reachable.
- Empty projects can be created. Submission history is paginated. Source links use the trusted host adapter. Date labels are explicit day/month/year in QuickJS. Native screen/field order and visibility persist through reviewed layout saves.
- Fonts and foreground colors meet the production design gate. No sandbox, manifest, permission or design enforcement was weakened.
- Canonical files generate the registered semantic-version catalog and fictional preview deterministically; the main repository build checks both.

## Checks

- `node --import tsx --test tests/publication-template.test.ts tests/publication-integration.test.ts`: 12 tests pass, including runtime regressions and a real migrated PGlite fixture. Covers all eight documented schemas, real parent receipt IDs, catalog preparation/save/reopen, seven QuickJS screens, production design inspection, reviewed create/edit/archive, stale writes, copied manuscripts, evidence-backed withdrawal, native layout save and stale layout rejection. Unit coverage also includes denied/unknown/short/missing/non-scalar/over-budget data, empty creation, scope changes, hidden fields, event pagination and a typed inactive email example.
- `node --import tsx scripts/test-publication-browser.ts`: passes in the connected production sanitized frame with manifest attached, seven screens at 320/390/768/1100/1440px, typed text/textarea/number/date/select/boolean inputs, visible validation and retained values, actual reviewed database receipts, native screen/field reorder and reload. Desktop/mobile screenshots reviewed locally.
- `APP_DESIGN_CHECKS=off node --import tsx --test --test-concurrency=2 tests/app-templates.test.ts tests/frontend.test.ts tests/frontend-reads.test.ts tests/shared-automations.test.ts tests/notification-guardrails.test.ts`: 36 shared platform tests pass. Shared suite uses its existing design bypass for unrelated fixtures; Publication fixture/browser/design checks run with the gate enabled. Includes catalog discovery, stale digest, reviewed data boundaries, shared-runner failures, retries/deduplication, revocation and notification burst/delivery guardrails with mocked delivery.
- `node scripts/build-publication-template.mjs --check` and `npm run build`: pass: generated-file drift checks, TypeScript, production web bundle and embed build.

## Operational boundaries

Repository publication makes this package ready for the existing deployment path. It does not prove that a deployed MCP service has loaded this commit or that an installed/cached ChatGPT connector has refreshed. Live MCP discovery, connected ChatGPT acceptance, scheduled execution and delivered email remain separate deployment checks; none is claimed here.

The app reads at most 1,200 rows per role, up to 96 read calls and one proposed write within the 100-call runtime budget. Larger/partial datasets are explicitly incomplete, never sufficient to establish approval or absence of dependent evidence. `asOf` is a date-comparison reference, not a historical database snapshot. Relationships and publication guards are application logic, not database foreign keys or protection against independent database edits. All historical evidence should be reconciled after such edits.

No new migration, server service, credential or environment setting is required. Optional automations remain inactive and independent of app reads and saves. Existing saved apps are not silently upgraded.
