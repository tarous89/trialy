# Inventory Management 1.0.2 — release evidence

Reviewed against authoring/usage guidance 1.3.9 and current TrialAgents host contracts on 2026-11-01. This replaces the uploaded 1.0.1 candidate; no existing saved app or released catalog contract is rewritten.

## Corrections

- Date-only ledger validates daily closing balances after aggregating all same-day effects. Random UUID order cannot invent historical negative stock.
- A posting batches an optimistic-version lot `stock_revision` increment with its movement create. The actual reviewed database transaction enforces the version and atomicity. Two prepared same-lot deductions cannot both commit. Same-preview receipt replay is idempotent; invalid creates roll back the counter update.
- Managed stock counter is declared in the scalar schema and full MCP data contract, initialized on lot creation, hidden from user editors and required for posting. Direct independent Database writes remain outside the app's business invariants; this boundary is documented.
- Movement kind/reversal metadata live in returned draft state, not disabled hidden inputs. Production sanitized form submission now creates the exact reviewed receipt. Drafts survive preparation/cancellation/failure; no optimistic saved-record claims.
- Malformed array/object scalar values fail closed. Existing completeness, access, original-version, unit, expiry, archive and approval guards remain intact.
- Text meets production font/contrast gates; narrow headers keep location actions on-screen. Six screens, native layout order/visibility and existing design structure remain.
- Canonical source/metadata/schema/demo/preview, complete setup and automation instructions, catalog registration, deterministic builder and repository build check are included. Stale upload patch scripts, screenshots and empty release manifest are not shipped as authoritative artifacts.

## Verification

Run from the repository root:

| Command | Evidence |
| --- | --- |
| `node scripts/build-inventory-template.mjs --check` | Exact generated catalog and fictional preview match canonical inputs. |
| `node templates/source/inventory-management/test_runtime.cjs` | Original six-screen fixture suite and architect regressions: pagination, partial/denied/unknown/over-budget reads, missing mappings, stale edits/archives, invalid dates/units, orphan/duplicate links, protected approvals and retained drafts. |
| `APP_DESIGN_CHECKS=off node --import tsx --test --test-concurrency=1 tests/inventory-template.test.ts tests/inventory-integration.test.ts tests/app-templates.test.ts tests/frontend.test.ts tests/frontend-reads.test.ts` | Whole-catalog loading and exact digest preparation, real QuickJS, scalar schemas, production design inspector, real reviewed PostgreSQL-compatible DB transactions, concurrency rejection, receipt replay, atomic rollback, layout versioning, existing frontend permission/review regressions. Inventory-specific final suite has four tests; shared suites have six. |
| `APP_DESIGN_CHECKS=off node --import tsx scripts/test-inventory-browser.ts` | Production sanitized iframe with manifest, real DB fixtures, text/select/date/number/textarea state, item and movement review/confirmation, native screen drag and column reorder, Ignore, reload, six routes at 320/390/768/1100/1440 widths, mobile drawer actions and no document overflow. |
| `npm run build` | All catalog builders, TypeScript, web and embed build. Existing bundle-size advisory remains informational. |
| `git diff --check` | No whitespace errors. |

The design test explicitly invokes the production design inspector even though the fixture environment disables redundant creation-time inspection. No manifest, sanitizer, access check or approval path is removed. Tests use the actual QuickJS runtime and host code with isolated synthetic PGlite data; they do not send real notifications or modify customer records.

Initial acceptance runs exposed contrast/font failures, a disabled hidden movement field and a 320px location-header overflow. Those failures were fixed and the affected checks rerun. The browser harness waits for the final close-editor render before shutting down its fixture database.

## Release boundaries

The repository package is ready for the existing deployment pipeline after the checks above pass. Repository publication does not itself prove deployed MCP availability, connected ChatGPT acceptance, a saved customer app, unattended automation execution or email delivery. These are separate operational outcomes, not claimed by this QA record. No automation is installed or enabled by this template; the no-automation path is fully functional.

Supported scope is nonhuman small-lab inventory with one unit per item, date-granular balances and complete authorized reads of at most 800 rows per role. Above that bound, totals/postings are explicitly withheld pending a vetted server aggregate. This is not GMP/LIMS validation, intraday chain-of-custody, supplier ordering or a guarantee over independent direct Database edits.
