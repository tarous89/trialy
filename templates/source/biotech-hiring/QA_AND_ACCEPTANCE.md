# Biotech Hiring & Resource Management 1.4.2 validation

Validation uses the repository host and disposable fixtures, not a deployed customer account.

- `npm run build`: TypeScript, platform and embedded builds, plus deterministic catalog/preview drift checks.
- `APP_DESIGN_CHECKS=off node --import tsx --test --test-concurrency=1 tests/hiring-template.test.ts tests/hiring-integration.test.ts tests/app-templates.test.ts`: catalog discovery, five valid scalar schemas, all six screens in QuickJS, Active-only baseline, denied/partial/invalid data, 49-person pagination, planning month selection, draft preservation and original record versions. Real database fixtures cover manifest-bound reviewed creation, duplicate/archive, stale edits and native layout save/reload, Ignore and stale revisions. Invalid scenarios retain their correction register while withholding misleading totals.
- `APP_DESIGN_CHECKS=off node --import tsx scripts/test-hiring-browser.ts`: production CSP/sanitized iframe with a real manifest, editable draft inputs, month/search/scenario controls, six screens, a reviewed database save, native Settings desktop drag and field reordering, reload persistence and narrow-screen keyboard/Ignore behavior. The test does not access customer records or activate automation.

UI draft markers grant no write permission. The server continues to check manifest, bindings, current access and record versions; trusted confirmation commits proposed changes. Native layout updates presentation configuration only.

The generated catalog JSON is stored under the stable internal template ID and is discovered by the existing MCP catalog loader. A repository commit does not verify deployment or connected-account acceptance. Deploy this catalog with the current host, which includes native custom-layout support. Optional monitoring and email need the owner's separate configuration and verified runner readiness. These checks create no live jobs or email sends.
