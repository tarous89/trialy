# Investigator CRM CO04 1.0.1 — release verification

Validated 1 November 2026 against the repository's current authoring/usage and host contracts (authoring 1.3.9). Stable catalog ID: `life.investigator-crm`. The uploaded 1.0.0 candidate was not registered; this release adds a distinct 1.0.1 catalog without replacing existing apps or other templates.

## Corrected publication blockers

- Editor and quick-entry forms now emit the host's `save` and `save-quick` actions. Both were exercised in the real sanitized frame with a full manifest.
- Updates and archives use `recordId` and the version captured when editing/confirmation opened, including zero. Stale, missing and revoked writes retain drafts and cannot become replacement creates.
- All fields require authorized mappings. Missing optional access, non-scalar values, unknown/changed totals, denied reads and short pages remain incomplete. Archived/contact-preference booleans must be explicit; unknown preferences never imply permission to invite.
- Reads are bounded to 80 rows × 12 pages per role: 960 rows per role, 96 calls for all eight roles, below the host's 100-call limit. A larger source withholds dependent writes; it does not exhaust the renderer.
- Quick interaction and optional follow-up use one reviewed atomic proposal. The returned interaction ID may be linked once to the same investigator's follow-up; populated references cannot be reassigned. No message is sent.
- Read-only/unsaved controls cannot propose changes. Cross-investigator action references, invalid scalar inputs and changes to reviewed findings are rejected. Duplicates reset review evidence. Optional select/date/reference blanks become null.
- Native screen/field layout order and visibility persist through review/reload; hidden required fields stay reachable under Additional fields. Person selection reconciles with the current filters.
- Raised undersized text, corrected contrast and mobile network-control overlap, and preserved accessible control names. Dark-gradient text was visually reviewed separately from automated contrast checks.
- MCP-returned catalog documentation contains scalar schemas, mappings, required fields, lifecycle/retry/receipt rules and complete optional automation instructions. The optional notification is a typed single-step status transition with fixed text and authorized registered team recipients. Recurring research returns private monitoring results, with no invented report destination or automatic write grant.
- Canonical source, CSS, metadata, schema, fictional demo and preview now regenerate deterministically. The repository build checks catalog/preview drift.

## Passed checks

| Check | Result |
| --- | --- |
| `node --import tsx --test tests/investigator-template.test.ts tests/investigator-integration.test.ts` | 11 passed. Real QuickJS; all six populated/empty screens; missing/partial/denied/scalar sources; eight over-budget roles; stale/revoked edits; original archive identity; dependency guards; opt-out; reviewed-evidence immutability; atomic quick-entry; final-page navigation; native layout; typed email configuration. |
| Real database integration | Migrated PGlite; documented schemas through reviewed database APIs; receipt IDs for parent/child links; exact catalog prepare/save/reopen; create/edit/archive confirmations; quick-entry/follow-up receipts and later valid linkage; duplicate reset; native layout persistence, unchanged manifest and stale-layout rejection. |
| Production design gate | Passed all six screens at 1440px and 390px, including normal app save. No package-specific design bypass. The initially unavailable browser dependency was installed; initial contrast/overlap failures were repaired before the final pass. |
| `node --import tsx scripts/test-investigator-browser.ts` | Passed six screens at 320/390/768/1100/1440px in the production sanitized frame with manifest; text, textarea, date, select and boolean inputs; failed/proposed draft retention; editor and quick-entry receipts; mobile dialog; native screen/field order after reload. No page errors or horizontal page overflow. Desktop/mobile screenshots inspected. This schema contains no numeric business fields. |
| `APP_DESIGN_CHECKS=off node --import tsx --test --test-concurrency=2 tests/app-templates.test.ts tests/frontend.test.ts tests/frontend-reads.test.ts tests/shared-automations.test.ts tests/notification-guardrails.test.ts` | 36 passed. The opt-out applies to generic host fixtures only; Investigator CRM's own design/save/browser checks run with the gate enabled. Covers review/permissions, receipts, revoked/expired scopes, duplicate/missed jobs, notification coalescing/cancellation and mocked delivery failure. |
| `npm run build` | Passed template generation checks, TypeScript, production web and embedded bundles. Existing bundle-size advisory only. |

Total: 47 unique tests passed, plus connected browser acceptance and the production build. No customer records, live jobs or emails were created.

## Boundaries

Repository readiness is distinct from deployed MCP propagation, a real ChatGPT embedded session, unattended monitoring and actual email delivery. Those live outcomes were not exercised or claimed; browser acceptance uses the actual frame and host bridge in a local harness. Notification delivery is mocked. Independent Database edits require reconciliation: app guards are not database-wide foreign keys, verified consent, current investigator availability or regulated signatures. No server permission, sanitizer, design gate or automation policy was weakened.
