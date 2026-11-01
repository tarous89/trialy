# CO05 1.0.1 — release verification

Validated 1 November 2026 against the current repository host contracts and authoring/usage guidance 1.3.9. Stable catalog ID: `life.trial-regulatory-submission`. The uploaded 1.0.0 candidate was not registered; this package adds 1.0.1 without replacing a released version or migrating a saved app.

## Corrected critical blockers

- Separate html/css/state output preserves styling through the production sanitizer.
- Updates and archives use recordId with the editor-open expectedVersion, including 0. Blank optional scalar fields become null. Proposed/rejected drafts remain until actual host review; stale edits cannot become replacement creates.
- Submission changes recalculate dossier, chooser and readiness in the same event render. Stored historical phase is distinguished from current evidence readiness.
- All logical fields need authorized mappings. Missing optional values/access, invalid scalar values, unknown/changed totals, duplicate or short pages remain incomplete. Archived booleans must be explicit.
- Bounded reads use 80 rows × 12 pages per role: 960 rows each, at most 84 reads across seven roles plus a proposal, below the 100-call host limit. Oversized sources withhold readiness/writes instead of crashing the renderer.
- Exact source references accept host version 0 and reject stale/cross-submission sources. Conflicting active review events cannot establish readiness. Approved/reviewed historical evidence cannot be silently downgraded or archived.
- Child proposals include an atomic same-status submission update pinned to its editor-open version. Concurrent app evidence changes are rejected at confirmation rather than approving a stale dossier. Actual version guards and atomic rollback were tested.
- Native layout screen/field ordering persists through review and reload. Hidden/unlisted fields remain reachable; validation reveals Additional fields. Full paginated review/milestone registers preserve access beyond summary cards.
- Undersized text and low contrast were corrected. Dark-gradient text was inspected visually; no design gate or permission bypass was added.
- The MCP catalog includes full schemas/mappings, null and version semantics, permissions, lifecycle/retry/receipt rules, native layout and complete optional shared-runner automation instructions. Optional notification configuration matches the typed single-step fixed-text contract. No job, grant, real message or regulatory filing is activated.
- Canonical source, CSS, metadata, schema and fictional data regenerate the catalog and preview deterministically. The production build checks drift.

## Passed checks

| Check | Result |
| --- | --- |
| `node --import tsx --test tests/regulatory-template.test.ts tests/regulatory-integration.test.ts` | 13 passed. Real QuickJS; populated/empty six screens; denied/missing/scalar/unknown/unstable/short sources; seven over-budget roles; same-render selection; null dates and version zero; retained drafts; stale/revoked/unsaved writes; linked and historical archive guards; reviewed references; conflicting evidence; native hidden fields; final-page review navigation; typed notification configuration; parent version guards. |
| Real database integration | Migrated PGlite; exact schemas through reviewed APIs; actual receipt IDs for parent links; catalog prepare/save/reopen; discard leaves no record; create/edit/archive receipts; stale edit rejection; reviewed source version 0; reset duplicate report; conflicting evidence proposals reject atomically; persisted native layout with unchanged manifest and stale-layout rejection. |
| Production design gate | Passed normal app save and all six populated screens at 1440px and 390px. Initial text/contrast failures were repaired before the final pass. Target package acceptance never disables the design gate. |
| `node --import tsx scripts/test-regulatory-browser.ts` | Passed all six screens at 320/390/768/1100/1440px in the actual sanitized frame with full manifest; text/textarea/date/select controls; automatic additional fields on validation; retained failed/proposed drafts; real create/edit/archive receipts; immediate dossier switch; mobile dialog; native screen/field order after review/reload. No page errors or horizontal page overflow. Desktop/mobile captures inspected. Schema has no numeric business fields; archive is the explicit boolean workflow. |
| `APP_DESIGN_CHECKS=off node --import tsx --test --test-concurrency=2 tests/app-templates.test.ts tests/frontend.test.ts tests/frontend-reads.test.ts tests/shared-automations.test.ts tests/notification-guardrails.test.ts` | 36 passed. Gate opt-out applies only to generic host fixtures; target package design/save/browser acceptance remains enabled. Covers host review/permissions/receipts, revoked and expired scopes, duplicate/missed jobs, notification cancellation/coalescing and mocked delivery failure. |
| `npm run build` | Passed all template drift checks, TypeScript, production web and embedded bundles. Existing bundle-size advisory only. |

Total: 49 unique tests passed, plus connected browser acceptance and production build. No customer workspace, customer record, live job, email or authority portal was changed.

## Verified boundary

Repository publication readiness is separate from deployed MCP propagation, a real ChatGPT embedded session, unattended monitoring and actual email delivery. Those live outcomes were not exercised or claimed; browser acceptance uses the real frame and host bridge in a local harness. Delivery is mocked. Independent Database/API edits need reconciliation: app guards are not database-wide foreign keys, legal validation or regulated signatures. No CTIS/FDA integration or legal/regulatory compliance certification is provided.
