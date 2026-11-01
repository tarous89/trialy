# CO06 v1.1.1 release verification

Verified 2026-11-01 against repository baseline 583d699d54af436ae264d858fe7e0b64e5cb82f5 and TrialAgents template guidance v1.3.9. Release changes were prepared and tested outside the repository before publication.

Critical corrections:

- Every optional and required field must be mapped, authorized, present and a valid scalar; archive flags must be booleans. Missing evidence, denied data, duplicate IDs, unstable totals and truncated pages withhold authoritative metrics. Cached bounded reads prevent missing-parent lookups from exceeding the runtime's 100-call limit.
- Required fields cannot be cleared silently; changed unauthorized fields, invalid values and overlong input fail with visible retained drafts. New optional fields use null. Original record versions, including zero, are retained. All writes require a saved writable app and trusted host review.
- Completed activities, verified findings, final monitoring reports and reviewed briefings preserve history. Archive cannot bypass those protections. Linked agreement/definition evidence and original dates are protected. Existing records cannot move between studies. Child writes carry an atomic original study-version check; conflicting reviews roll back the entire proposal.
- Reviewed briefing evidence uses complete SHA-256 fingerprints, with no 3,500-character truncation. Legacy or changed evidence is explicitly historical. An unchanged submit cannot silently re-attest an old reviewed briefing. SHA-256 agrees with Node crypto for empty, ASCII, Unicode and long multi-block inputs.
- Studies and institutions have usable registers. Errors are visible inside drawers. Calendars and registers are bounded and paginated; long labels indicate truncation while full details remain available. Open drawers omit duplicate background registers, keeping large authorized parent lists within the host HTML limit.
- Fonts, contrast and narrow-screen wrapping satisfy the actual host preparation/design gates. Native layout review and persistence work without altering the manifest.
- Deterministic catalog/preview builder and the main build hook register the exact 1.1.1 package. Complete schema, version/digest preparation, identity-preserving revision, review/conflict, migration and optional automation instructions accompany the source.

Verification commands and evidence:

- `node --import tsx --test --test-concurrency=1 tests/monitoring-pv-template.test.ts tests/monitoring-pv-integration.test.ts`: 14 tests passed. Includes actual QuickJS execution and migrated PGlite using real schema proposals, committed record receipts, AppTemplates.operation, saved app rendering, proposal discard/confirm, atomic conflict rollback, immutable evidence and native layout save/reopen. CO06 design checks stay enabled; all five screens pass at 1440/390 pixels.
- Shared catalog, frontend, frontend-read, automation and notification suites: 36 tests passed. Their existing fixture-only APP_DESIGN_CHECKS=off setting does not bypass CO06's independent real design checks.
- `node --import tsx scripts/test-monitoring-pv-browser.ts`: actual sanitized frame and native React layout panel, five screens at 320/390/768/1100/1440 pixels, real create/edit/archive receipts, retained mobile validation drafts and layout reload. Desktop/mobile screenshots visually reviewed; no uncaught browser errors.
- `node scripts/build-monitoring-pv-template.mjs --check`: byte-for-byte reproducibility.
- `npm run build`: catalog checks, TypeScript, Vite and embed build passed. The existing shared bundle-size warning is non-blocking.

Operational boundaries:

The release verifies the actual production code paths in isolated fixtures, not live customer records or live MCP deployment. No schedule, email, grant or live deployment is activated. Preview records are fictional and must never be seeded into customer workspaces. Data completeness is bounded to 600 rows per role and 100,000 JSON characters per source page. Oversized or denied sources remain explicitly incomplete. Independent Database edits and other apps do not participate in the study-version guard; reconcile them before evidence approval. Dates and obligations are manually approved operational records, not statutory calculations or clinical safety determinations. See MCP_USAGE.md for existing-app migration and AUTOMATION_RECIPES.md for explicitly approved optional setup.
