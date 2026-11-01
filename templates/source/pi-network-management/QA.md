# CR03 1.0.1 — release verification

Validated 1 November 2026 against current repository contracts and authoring/usage guidance 1.3.9. Catalog ID: `life.pi-network-management`. The uploaded 1.0.0 candidate was not registered. This release adds a distinct 1.0.1 catalog and does not overwrite published versions or migrate saved apps.

## Corrected publication blockers

- The actual editor emits `data-action="save"`; transient controls retain their real name/action/UI-state markers in the production sanitized frame with a manifest.
- Updates and archives use `recordId` and the version captured when editing/confirmation opened, including zero. Proposed drafts remain until host confirmation; ignore/failure/stale/missing/revoked paths retain work and cannot silently create a replacement record. Optional date/reference/number/select blanks become null.
- Missing optional mappings/fields, unknown booleans, invalid scalars, unstable/unknown totals, short/duplicate pages and denied reads mean incomplete coverage. Incomplete evidence, opt-outs, orphan PIs and duplicate assessments cannot produce a comparable score. Changed fields outside write scope are rejected instead of silently omitted.
- Reads are capped at 80 rows × 9 pages per role: 720 rows each and 90 reads across all ten roles, leaving room below the host's 100-call limit. Oversized sources withhold dependent decisions rather than exhausting the renderer.
- Reviewed findings and ratings cannot be downgraded or archived. Active reviewed criteria/evidence require a closed brief/new revision before material changes. Copies reset approval/identity fields. Follow-up references must belong to the same investigator.
- Child proposals include direct-parent version guards in one atomic batch: same status for people/requests, same name for other populated parents. Guards require explicit write scopes, advance host versions and reject concurrent rating/criteria/source edits. Real confirmation conflicts and rollback were tested.
- Native screen/field ordering and visibility persist after review/reload; hidden or unlisted required fields remain reachable and errors reveal Additional fields. Full advertised registers retain paging and correction actions. Request selection immediately updates its brief; displayed historical request state is explicit.
- Corrected undersized text, contrast and clipped selector labels without changing the visual concept. Selectors retain accessible names. Desktop/mobile screenshots were inspected.
- Catalog instructions include the complete scalar schemas/mappings, current host lifecycle and permission rules, null/version semantics, parent guards, native layout and optional automation contracts. No per-app task, automatic grant, actual notification or external contact is activated.
- Canonical source/CSS/metadata/schema/fictional fixtures generate the catalog and preview deterministically. The production build checks for generated drift.

## Passed checks

| Check | Result |
| --- | --- |
| `node --import tsx --test tests/pi-network-template.test.ts tests/pi-network-integration.test.ts` | 14 passed. Real QuickJS; all six populated/empty screens; complete/denied/missing/scalar/unknown/unstable/short/oversized sources; correct host forms; retained drafts; version zero and recordId; dependency archives; score/opt-out/orphan/duplicate safeguards; protected criteria/evidence; scalar/boolean handling; cross-PI links; native hidden fields; immediate scope change; final-page navigation; typed email configuration; parent version guards. |
| Real database integration | Migrated PGlite; all ten exact schemas created through reviewed APIs; actual receipt IDs for parent links; full catalog prepare/save/reopen; discard leaves no new record; create/edit/archive receipts; stale edit rejection; numeric/null rating writes; duplicate review reset; conflicting criteria/rating and evidence/rating proposals reject atomically; native layout persists with unchanged manifest and stale-layout rejection. |
| Production design gate | Passed normal app save and all six screens at 1440px and 390px. Initial small-text/contrast/clipped-label failures were repaired before the final pass. Target package acceptance never disables the gate. |
| `node --import tsx scripts/test-pi-network-browser.ts` | Passed all six screens at 320/390/768/1100/1440px in the real sanitized frame and host bridge with full manifest; text, textarea, date, select, boolean and numeric inputs; retained failed/proposed drafts; PI creation and numeric rating receipts; mobile editor; native screen/field order after review/reload. No page errors or page-wide horizontal overflow. Desktop/mobile captures inspected. |
| `APP_DESIGN_CHECKS=off node --import tsx --test --test-concurrency=2 tests/app-templates.test.ts tests/frontend.test.ts tests/frontend-reads.test.ts tests/shared-automations.test.ts tests/notification-guardrails.test.ts` | 36 passed. Gate opt-out applies only to generic host fixtures; CR03's save/design/browser checks run with the gate enabled. Covers catalog discovery, review/access/receipts, revoked/expired scopes, duplicate/missed jobs, notification cancellation/coalescing and mocked delivery failure. |
| `npm run build` | Passed all template generation checks, TypeScript, production web and embedded bundles. Existing bundle-size advisory only. |

After the concurrent CO03 release reached main, its package and build hook were preserved. The combined production build and all three catalog tests passed again against that newer baseline.

Total: 50 unique tests passed, plus connected browser acceptance and production build. No customer record, customer workspace, live automation, email or PI outreach was created.

## Verification boundaries

Repository publication readiness is separate from deployed MCP propagation, a real ChatGPT embedded session, unattended monitoring and actual email delivery. Those live outcomes were not exercised or claimed; browser acceptance uses the real production frame and local host harness. Notification delivery is mocked. Independent Database/API edits require reconciliation and new human review; application guards are not database-wide relationship constraints or proof of professional availability, consent, source truth or recruitment performance. No server permission, sanitizer, design gate or automation policy was weakened.
