# Project Oversight 1.0.1 — release evidence

Reviewed against authoring/usage guidance 1.3.9 and current host contracts on 2026-11-01. New catalog version replaces the uploaded unregistered 1.0.0 candidate without modifying existing saved apps.

## Corrections

- Unsupported field annotations removed from field definitions; relationship notes moved to role-level documentation. Exact required fields are included in MCP-returned dataContract.
- Authorized table/field mappings intersect real template bindings. Structured scalar values and invalid required/date data fail closed.
- Project selectors remain reachable in the directory and reports; reviewed update counts follow the selected project while approved management reports are explicitly company-wide.
- Project filtering occurs in server reads before paging; stale page offsets clamp and large registers remain reachable beyond the 600-row analytics budget.
- Required clears reject explicitly; restricted fields are labelled read only; existing budgets cannot be relabelled by changing currency. Drafts survive review failures and stale-version conflicts.
- Parent reassignment cannot leave linked milestones/deliverables in another project. Existing archive and approval guards retained.
- Font size and contrast corrected while preserving the six-screen design. Native layout heading affects the app, with source-backed screen/column settings.
- New canonical package, deterministic Node builder, build gate, catalog registration and complete MCP/automation instructions. Notification wording does not falsely imply that a Draft research report is approved.

## Acceptance commands

Run from repository root:

| Command | Evidence |
| --- | --- |
| `node scripts/build-project-template.mjs --check` | Generated catalog and fictional preview match canonical inputs byte-for-byte. |
| `node templates/source/project-oversight/test_runtime.cjs` | Original behavioral regressions, now using declared bindings and real filter semantics: six routes, denied/partial/over-budget data, stale edits, immutable baselines, required completion evidence, copied approvals, archive guards and large-page access. |
| `APP_DESIGN_CHECKS=off node --import tsx --test --test-concurrency=1 tests/project-template.test.ts tests/project-integration.test.ts tests/app-templates.test.ts tests/frontend.test.ts tests/frontend-reads.test.ts` | Whole-catalog validation, exact field schemas, real QuickJS/design inspector, scoped pagination, currency/required/permission guards, malformed and unavailable sources. Actual reviewed PGlite schema/records/app preparation, confirmed CRUD, stale edit/archive rejection, parent archive protection, receipt replay, native layout review/save/reopen/Ignore and version conflicts. Shared frontend access and review regressions. |
| `APP_DESIGN_CHECKS=off node --import tsx scripts/test-project-browser.ts` | Production sanitized frame with full manifest and actual DB fixture; text, number, date, select and textarea draft entry and confirmed save; selected-project pagination; native screen drag and column reorder/save/reload/Ignore; six screens at 320/390/768/1100/1440px; mobile editor save/close actions and no document overflow. |
| `npm run build` | All catalog builders, TypeScript, web and embed production build. Existing bundle-size advisory is informational. |
| `git diff --check` | Whitespace validation. |

The design test invokes the real production inspector even though creation-time repeat inspection is disabled for fixtures. Tests retain the actual sanitizer, manifest, review path and database transactions; all records are synthetic. No customer records or external notifications are used. Initial schema annotation failures were fixed and affected checks rerun; a failed or timed-out attempt is not a pass.

Final result: all 12 acceptance tests passed with no failures, cancellations or skips. Original runtime regressions, generation check, production build and complete browser run passed. Desktop, mobile and editor screenshots were visually inspected; all six screens were exercised at five widths.

## Release boundaries

Repository publication and local production-code acceptance do not prove deployed MCP discovery, connected ChatGPT acceptance, customer-app installation, unattended runner execution or delivered email. Those are separate operational outcomes. No automation or external connection is installed or enabled by this release.

Supported scope is internal small-team coordination with bounded complete evidence, not GxP, CTMS, legal approval, accounting or a guarantee over independent direct Database writes. Timeline dates outside its seven-month window are clipped with exact dates available in Details. Current owner health is not a reconstructed historical snapshot.
