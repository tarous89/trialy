# Grant Pipeline 1.0.1 release acceptance

Date: 2026-11-01. Catalog ID: `life.grant-pipeline`. General guidance: 1.3.9. Scope: critical runtime, data correctness, host integration and user-confusion issues in the supplied app 9 package.

## Corrected blockers

- Removed the duplicate host configuration declaration; the unmodified catalog is prepared by the real AppTemplates operation and executed by QuickJS.
- Enabled all transient controls under the connected manifest and retained named drafts across rerenders, validation errors and proposed changes. Removed a duplicate submit action that made focus restoration call the form's field named `focus` as a function. Validation/conflict messages now appear inside the open dialog.
- Preserved the original edit/archive version, including zero. Concurrent changes cannot silently overwrite newer data.
- Required complete mapped, authorized scalar reads; unknown/denied/short/over-budget reads withhold dependent totals and approvals. Funding totals also require recorded currencies and amounts.
- Corrected same-render grant selection, reachable register/board/timeline paging and native layout persistence. Hidden fields remain editable through Additional fields.
- Blocked orphan links, duplicate criteria and evidence changes underneath Eligible decisions. Copies clear protected approval/submission/award evidence. Hidden numeric/date drafts and copied empty dates normalize to valid scalars/null before proposal.
- Prevented silent currency relabelling and future completed-event dates; fixed QuickJS-compatible date/amount formatting and same-day deadline reverification.
- Embedded complete scalar schemas, installation, revision/recovery and optional automation instructions in MCP-returned metadata. Added deterministic canonical source packaging and build drift checks.

## Reproducible checks

Run from the repository root with its existing dependencies:

```sh
node scripts/build-grant-template.mjs --check
node --import tsx --test tests/grant-template.test.ts tests/grant-integration.test.ts
node --import tsx scripts/test-grant-browser.ts
APP_DESIGN_CHECKS=off node --import tsx --test --test-concurrency=2 tests/app-templates.test.ts tests/frontend.test.ts tests/frontend-reads.test.ts tests/shared-automations.test.ts tests/notification-guardrails.test.ts
npm run build
```

- Grant-specific checks: **11 passed**. Includes current schema validation, all six screens, production design inspector, incompleteness/read-only cases, paging, independent currency/date assertions, hidden values, original versions, copied approvals, and typed optional email validation.
- Real database integration: the suite creates the documented four schemas and parent/child records through normal review/commit with actual receipt UUIDs, prepares/saves/reopens the app through the real catalog path, confirms create/duplicate/archive, tests conflicts, and persists/reloads native layout without changing the manifest.
- Connected browser: six routes at 320/390/768/1100/1440px; text/date/number/select/textarea retention; selected-call consistency; search; reviewed create with no premature write; native screen/column changes and reload; mobile validation, Additional fields, long content and cancellation. Production sanitized frame retains its manifest. Desktop/mobile screenshots inspected; no page overflow or uncaught page errors. Cancellation waits for the asynchronous host render before asserting closure.
- Shared regression checks: **36 passed**, including real MCP SDK transport, stale content/digests, access revocation, failure isolation, duplicate-safe shared jobs, expired permission, notification coalescing across 1,000 committed changes, recipient revocation, current-state cancellation, quotas and retry receipts. Delivery is mocked; no email was sent.
- Full build/type checks and every generated-template drift check passed. The existing Vite large-chunk advisory is nonblocking and unrelated to this template.

## Publication and verification boundaries

The canonical package and generated catalog are ready for repository publication. The catalog loader discovers the new entry; no manual plugin manifest registration is required. Preserve all older catalog versions and saved app identities. No backend auth, sandbox, scheduler or email-delivery code changed.

The browser test uses the real production frame/native layout/runtime against a synthetic local database, not an authenticated live ChatGPT session. Repository publication does not prove deployed MCP availability. No customer app/records were created, no real grant eligibility was adjudicated, and no live research schedule or email delivery was tested or activated. Verify deployed catalog discovery and the actual saved-app receipt after deployment before claiming those outcomes.

The optional research prompt is a documented policy, not an executed research algorithm. Duplicate/partial/no-result/expired-permission behavior is specified explicitly and the shared executor is regression-tested; source selection and research quality still require the authorized owner’s live review. Zero automations is a fully supported path.

Read limits are 200 records per role, app sections inherit app-level access, and relation/provenance checks are application guards rather than database-wide integrity constraints. Independent database edits must be reconciled before relying on decisions. `asOf` compares dates; it does not reconstruct a historical snapshot.
