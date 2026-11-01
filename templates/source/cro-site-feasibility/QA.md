# Release validation — 1.2.1

The uploaded 1.2.0 failed catalog validation and production design checks. This release supplies the mandatory task prompt; enables study/site/candidate/filter controls; retains original archive versions; blocks parent archives with active or unreadable dependents; and requires fresh review after answer/rating/criterion changes. It also adds missing candidate creation and record management, pages the five-site comparison, withholds incomplete summaries and rejects orphan/duplicate-response ranking.

## Release checks

- Six QuickJS runtime/design tests cover the full catalog, exact scalar schemas, all screens, production design gate, dependencies, stale writes, approval resets, criterion revisions, unavailable/unknown/short/truncated reads, orphan institutions, draft retention, read-only handling, candidate creation, comparison pagination and valid selection with recorded sponsor approval.
- Disposable PGlite integration uses real reviewed schema/app/record creation, canonical UUID mappings, confirmed create/duplicate/archive, stale-version rejection, parent protection, response approval reset and native layout save/reopen/Ignore. Pending proposals leave records unchanged.
- Playwright uses the production sanitized frame with a manifest and native CustomToolLayout. It verifies study/site/candidate selectors, filters, draft retention, reviewed institution/candidate creation, layout drag/field ordering/save/reload, mobile keyboard/Ignore and all six screens at 390/768/1440px. Desktop/mobile screenshots were visually inspected.
- The existing catalog integration suite (3 tests) and production build/typecheck passed. The deterministic builder is included in the main build. Shared automation/notification runtime is unchanged; its guardrail suites passed at the parent release. Template recipes are inactive and use existing reviewed platform operations.

## Deployment boundary

This validates the repository package through production runtime and local host-bridge/database fixtures. It does not assert live Render deployment, a real ChatGPT-host session or a successful scheduled run/email. No customer data or real email is used in tests. Saved existing apps are not silently migrated. Ranking is a descriptive evidence checklist, not independent verification or predicted enrollment; recorded approvals and sources remain the team's responsibility.
