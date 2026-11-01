# Release validation — 1.2.1

This release fixes the uploaded 1.2.0 catalog validation errors (example count and missing task prompt), disabled production selectors, ambiguous relationship schema, unsafe archive checks and mixed-currency display. Additional host checks corrected stale bid selection, library-copy version retention, readability/contrast and mobile toolbar overflow. Paginated library/review rendering bounds larger responses.

## Verified locally against production code

- Full catalog discovery and digest-pinned preparation through AppTemplates; deterministic catalog/preview builder included in npm run build.
- Nine runtime/design tests: all six screens, explicit scalar schema, input retention, stale edits/archive/reuse, complete child reads, unavailable/unknown/short/truncated data, invalid array references, mixed currency grouping, mandatory approvals and library pagination. Real QuickJS and production design inspector; no substitute runtime for these checks.
- Disposable PGlite integration: actual schema creation and canonical UUID mappings; reviewed app creation; records unchanged before confirmation; confirmed create/duplicate/archive and library-copy writes; stale versions rejected; linked bids protected; native layout save/reopen/Ignore and unchanged bindings/manifest.
- Playwright production sanitized frame with manifest, database-backed proposals and native CustomToolLayout: enabled bid/filter/destination selectors, draft retention, confirmed records and library reuse, drag/field ordering, save/reload, mobile keyboard/Ignore. All six screens checked at 390, 768 and 1440px; screenshots visually inspected. The bridge harness serializes events like FrontendCodeRuntime.
- Production build/typecheck passed. Existing catalog tests (3), shared automation tests (14), and notification guardrail tests (16, including 1,000-update coalescing) passed. Optional workflows remain inactive; no customer data, live emails or scheduler jobs are created by these tests.

## Deployment boundary

Repository publication provides catalog JSON, canonical source/CSS/metadata, exact schemas, fictional preview and maintenance tests. Existing saved apps are not migrated. The actual ChatGPT host, production deployment and a real scheduled automation run must be verified separately before claiming they are live; the browser harness validates the production frame and bridge locally. No app-level authentication, external sponsor delivery, FX conversion or independent evidence verification is promised.
