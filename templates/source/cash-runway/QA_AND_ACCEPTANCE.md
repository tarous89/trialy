# Cash Runway 1.2.2 validation

Validated against the repository host, not a deployed account:

- `npm run build`: TypeScript, platform build, embedded build and deterministic catalog/preview drift checks.
- `APP_DESIGN_CHECKS=off node --import tsx --test tests/cash-runway.test.ts tests/cash-runway-integration.test.ts tests/app-templates.test.ts`: catalog discovery and schema, six screens in real QuickJS, exact cash baseline, inclusive cutoff, opening date/future opening exclusion, invalid dates, incomplete reads, draft preservation, stale-record version, live manifest-bound reviewed creation/archive, layout persistence, Ignore, stale layout and unauthorized access.
- `APP_DESIGN_CHECKS=off node --import tsx --test tests/tracker-experience.test.ts tests/frontend.test.ts`: existing tracker/runtime behavior, permissions, proposals and sanitized frame contract.
- `APP_DESIGN_CHECKS=off node --import tsx scripts/test-cash-runway-browser.ts`: real production CSP/sanitized iframe with manifest attached, six screens, editable form inputs and exact DB confirmation, native Settings mouse dragging, keyboard/pick-and-place, reload persistence, narrow-screen Ignore. Test fixture uses a disposable database and does not access customer records or activate automation.

No sandbox/security restrictions were removed. UI draft markers do not authorize writes. The server still checks manifest, bindings, record version and access. Native layout changes touch presentation configuration only.

Deploy the host and catalog together. The catalog becomes available through the existing MCP discovery loader after deployment; repository storage alone does not establish a live deployment or connected-account acceptance. Automation setup and delivery still require the actual owner's reviewed configuration and runner readiness. No live jobs or email sends were created by these checks.
