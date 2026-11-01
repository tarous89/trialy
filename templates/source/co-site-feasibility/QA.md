# CO03 Site Feasibility 1.1.1 — release evidence

Reviewed on 2026-11-01 against template authoring/usage guidance 1.3.9 and current repository host contracts. This release supersedes the uploaded unregistered 1.1.0 candidate; it does not migrate existing saved apps or replace the separate CRO feasibility template.

## Corrections

- Field mappings intersect actual authorized bindings. Required clears and malformed scalar/date records fail explicitly, preserving drafts. Unwritable and managed assessment fields are visibly read only.
- Study/country scopes apply before paging. Direct filters reach records beyond the 600-row analysis budget; linked filters require complete bounded dependencies and explain how to clear scope for backend paging. Unknown totals and incomplete comparison counts stay unavailable. Raw source totals explicitly disclose hidden archived rows.
- Evaluations cannot be moved between candidates. Existing evidence-version, mandatory-question, explicit selection, duplicate, archive and stale-edit safeguards remain in place.
- Font size and contrast pass the real production design inspector. Mobile navigation no longer covers page actions; startup milestone rows fit a 320px viewport. Native layout heading, ordering and field visibility persist through reviewed host configuration.
- Canonical source/schema/config/fixture/docs package, deterministic builder, production build gate and new immutable MCP catalog entry. Installation instructions now name the actual repository commands and distinguish local acceptance from deployed discovery.

## Reproduce from repository root

| Command | Acceptance |
| --- | --- |
| `node scripts/build-co-site-template.mjs --check` | Catalog and fictional preview match canonical source, role definitions, layout and CSS. |
| `node templates/source/co-site-feasibility/test_runtime.cjs` | Original six-screen behavior, exact event fields, unknown/denied/over-budget sources, duplicates, orphans, stale versions, approvals, selection, review and large-page access. |
| `node templates/source/co-site-feasibility/test_design_v110.cjs` | Study scope, worklists, inbox, three-site comparison/mobile structure, selection, startup and native columns. |
| `APP_DESIGN_CHECKS=off node --import tsx --test --test-concurrency=1 tests/co-site-template.test.ts tests/co-site-integration.test.ts tests/app-templates.test.ts tests/frontend.test.ts tests/frontend-reads.test.ts` | 11 tests: whole catalog/schema/QuickJS, real design inspector, permission and malformed-data guards, scoped pages and unknown totals. Actual reviewed PGlite schema/parent/child saves, app preparation and confirmation, record creation, receipt replay, stale edit/archive rejection, dependency archive guard, managed evidence approval and selection. Native layout save/reopen/Ignore/version conflict and shared host access/frame regressions. |
| `APP_DESIGN_CHECKS=off node --import tsx scripts/test-co-site-browser.ts` | Production sanitized frame with complete manifest and real database; text/number/date/select/textarea drafts and confirmed creation; study scope; native screen drag/column reorder/save/reload/Ignore. Six screens at 320/390/768/1100/1440px without document overflow, reachable mobile editor controls and no browser errors. |
| `npm run build` | Every catalog generation gate, TypeScript, web and embed production build. Existing bundle-size advisory is informational. |
| `git diff --check` | Whitespace validation. |

The production design inspector runs explicitly in the template test; `APP_DESIGN_CHECKS=off` avoids redundant design checks during database fixture creation. The actual sanitizer, manifest, permissions, review path and database transactions remain in use. All fixture data is fictional; no customer records or notifications are involved.

All 11 acceptance tests, original runtime/design regressions, complete browser run and production build passed. Desktop, mobile and editor screenshots were visually inspected. Earlier failing assertions and mobile overflow were corrected and affected checks rerun; failed or unfinished attempts are not passes.

## Release boundaries

This establishes repository publication readiness and local acceptance of production code. Deployed MCP discovery, connected ChatGPT execution, customer installation, unattended runner readiness and email delivery are separate operational outcomes. No automation is created or enabled by this release.

Analytics/approvals require complete evidence within 600 rows per role. Unscoped registers remain backend-pageable; linked filters disclose their bounds. This is internal institutional planning, not validated GxP qualification, enrollment permission or a transactional guarantee across independent Database edits. The host enforces record versions and permissions; the frontend cannot supply foreign keys or prevent separate authorized writers from invalidating evidence. Current records with a deadline cutoff are not historical snapshots.
