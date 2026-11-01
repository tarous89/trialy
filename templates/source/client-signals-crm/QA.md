# CR06 1.0.1 — release verification

Validated 1 November 2026 against repository host contracts and template authoring/usage guidance 1.3.9. Catalog ID: `life.client-signals-crm`. This release registers the corrected uploaded candidate as 1.0.1; it does not overwrite published templates or migrate existing saved apps.

## Corrected publication blockers

- Updates and archives use the host's `recordId` and the version captured when the editor/confirmation opened, including version zero. Named editor forms emit the real `save-editor` submit action. Drafts survive validation, proposal, stale-version and review failure paths; a proposal is not a saved receipt.
- Read/write scope intersects authorized bindings. Unwritable controls are disabled and changed unwritable fields are rejected. Required cleared values and structured scalar values fail validation. Missing mappings, denied reads, unknown/changing totals, short pages and exhausted read budgets remain incomplete.
- Each of the eight roles has reachable backend register pages beyond the 400-record analytical limit. These pages explicitly describe their unfiltered scope and archived-row handling. Cached failed parent lookups prevent oversized/denied data from exhausting the host call budget. Protected edits still require complete validation sources.
- Company/contact/opportunity dependency archives remain guarded. Referenced signals cannot be archived, and any edit to a signal used by a reviewed briefing requires returning that briefing to Draft. Current source/version validation marks independently changed, inaccessible or invalid briefing evidence as `Needs evidence review` instead of displaying an unqualified Reviewed badge.
- Native screen/column layout changes persist through review and reload, preserve bindings, reject stale saves and honor Ignore. Required editor fields remain reachable.
- Text size and contrast satisfy the production design inspector. Monitoring actions and briefing metrics fit narrow screens without page-wide horizontal overflow. Desktop/mobile captures and the mobile editor were inspected.
- MCP-returned documentation includes all eight logical schemas, exact host kind translation (`long`/`ref` become scalar `text`), select options, physical mapping, null semantics, version/digest/requestKey handling, receipts, app-level access, revision and automation lifecycle. Optional research/email uses supported host review and one completion-delivery path; no automation is activated by publication.
- Canonical source/CSS/metadata/layout/schema/fictional fixtures generate the catalog and offline preview deterministically. The root production build checks generated drift. The preview is explicitly a local demonstration; acceptance uses production host code.

## Passed checks

| Check | Result |
| --- | --- |
| `node templates/source/client-signals-crm/test_runtime.cjs` | 17 passed. Existing workflow, calculations, partial-source, stale-version, duplicate, evidence, layout and no-automation regression fixtures. |
| `node --import tsx --test --test-concurrency=1 tests/client-signals-template.test.ts tests/client-signals-integration.test.ts` | 7 passed with the design gate enabled. Real QuickJS and schemas; all seven screens; 451-record paging for all eight roles; denied-parent/read-budget behavior; required/read-only controls; retained draft and host payloads; referenced-signal protection and stale briefing badges. |
| Real database integration | Migrated PGlite, eight exact schemas and fictional records created through reviewed APIs, actual receipt IDs for child links, catalog preparation/save/reopen, confirmed company creation and receipt replay, stale edit/archive rejection, confirmed soft archive, parent dependency rejection, reviewed briefing save, native layout persistence, stale layout rejection and Ignore. Included in the 7 tests above. |
| Production design gate | Passed real app preparation/save and explicit inspection of all seven screens at desktop/mobile widths. No host gate or sanitizer was weakened. |
| `node --import tsx scripts/test-client-signals-browser.ts` | Passed the production sanitized frame and host bridge with manifest attached. Text, URL, date, textarea, select and numeric controls; retained proposed draft and confirmed creation; native screen/field ordering after review/reload and Ignore; all seven screens at 320/390/768/1100/1440px; usable mobile editor; no page errors or page-wide horizontal overflow. |
| `APP_DESIGN_CHECKS=off node --import tsx --test --test-concurrency=1 tests/app-templates.test.ts tests/frontend.test.ts tests/frontend-reads.test.ts` | 6 passed. Catalog discovery/version/digest, template reuse, reviewed/access-controlled writes, stale/revoked access, read sharing and sandbox frame contracts. Gate opt-out applies to these generic host fixtures only; target acceptance above ran with the gate enabled. |
| `npm run build` | Passed every existing template generation check, CR06 generated-output verification, TypeScript and production web/embed bundles. Existing bundle-size advisory only. |

Total: 30 unique tests passed, plus browser acceptance and the production build. Earlier mobile overflow failures were corrected before the final passing browser run.

## Operational and verification boundaries

Analytics and protected changes require complete authorized sources within 400 records per role. Full registers provide unfiltered server pagination beyond that limit; they do not establish complete analytical coverage or make large-source protected edits safe. This is an explicit small-team workflow limit, not a hidden truncation.

App safeguards are not database-wide relationship constraints or transactional locks over independently edited parent/evidence records. Reconcile independent Database/API edits and renew affected human reviews. A dated run record is not proof of unattended execution, source truth, contact consent or actual email delivery.

Repository publication is separate from deployed MCP catalog propagation, connected ChatGPT acceptance and customer installation. Those live outcomes, unattended research and actual email delivery were not exercised or claimed. Browser acceptance uses the real production frame in a local host harness. No customer workspace, customer record, live automation or outbound message was created.
