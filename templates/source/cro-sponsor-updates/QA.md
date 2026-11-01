# CR05 v1.0.1 release verification

Verified 2026-11-01 against repository baseline 3c8e40bc8c739d1cc5899a1514ee773c29e06d6f and TrialAgents template guidance v1.3.9. Changes were prepared and tested in an isolated working copy before repository publication.

Critical corrections:

- Optional and required fields must be mapped, authorized, present and valid scalars. Archive booleans are explicit. Missing evidence, unknown totals, short pages, duplicates, changing totals and over-budget reads withhold authoritative coverage. Page caching prevents repeated missing-parent lookups from exhausting runtime capabilities.
- Changed non-writable fields, blank required inputs, invalid selects/scalars and overlong text fail visibly with retained drafts. Optional blanks persist as null; writes require a saved writable app. Record versions, including zero, remain pinned from editor opening.
- Accepted team inputs/deliverables, approved/rejected decisions, approved reports and manual distribution history cannot be archived to bypass their historical role. Dependencies and approved-report references are checked. Baselines and cross-project associations remain protected. Independent review comparisons ignore case and acceptance dates cannot precede submission.
- Source and report writes include an atomic project-version guard; project changes also guard their sponsor version. A source edit between report proposal and confirmation rejects the entire approval, leaving the report In review. SHA-256 replaces the short non-cryptographic digest and includes all relevant IDs/versions plus project business data. Same-name project guard writes do not invalidate unchanged evidence. Stale sources require a new report revision.
- Drawers show validation errors and retain inputs. Management directories expose all permitted parents, filtered paging resets correctly, and revoked selected-project access cannot silently switch to another sponsor. Long display values and linked lists are bounded, with full values in details/editors and full history in paginated registers. Open drawers omit duplicate background registers to avoid the host HTML limit.
- Host-readable typography/contrast, one-line toolbars and labelled mobile navigation pass the real design gate. Native presentation changes preserve the manifest and saved app identity. The five-screen purple visual design is retained.
- The canonical source/schema/demo/metadata, deterministic catalog and preview builder, main build hook, MCP usage/recovery instructions and typed optional internal notification example form one versioned release. Obsolete candidate generators and local-only QA claims are not published as acceptance evidence.

Verification:

- `node --import tsx --test --test-concurrency=1 tests/sponsor-updates-template.test.ts tests/sponsor-updates-integration.test.ts`: 13 tests passed. Actual QuickJS, migrated PGlite, reviewed schema creation, real record receipts, AppTemplates.operation, saved app rendering, discard/confirm, stale writes, atomic approval conflict rollback, fresh report approval, historical archive protection and native layout save/reopen. CR05 design checks remain enabled; all five screens plus management pass at 1440/390 pixels.
- Shared catalog, frontend, frontend-read, automation and notification suites: 36 tests passed. Their existing fixture-only APP_DESIGN_CHECKS=off setting does not bypass CR05's independent design checks.
- `node --import tsx scripts/test-sponsor-updates-browser.ts`: actual sanitized host frame and native React layout panel; five screens at 320/390/768/1100/1440 pixels; real create/edit/archive receipts; retained mobile error draft; reviewed layout persisted after reload. Screenshots visually inspected. No uncaught browser errors.
- SHA-256 matches Node crypto for empty, ASCII, Unicode and long multi-block input. Large parent-list/editor and incomplete/orphaned-source fixtures stay within tested HTML/read limits. Optional fixed-content email configuration passes the actual typed single-step action schema.
- `node scripts/build-sponsor-updates-template.mjs --check`: generated catalog and fictional preview are byte-for-byte reproducible.
- `npm run build`: all catalog builders, TypeScript, Vite and embed build passed. Existing shared bundle-size warning is non-blocking.

Boundaries:

Production code paths were verified in isolated fixtures; no customer workspace was modified and live MCP deployment is not established by these tests. No schedule, grant or email was activated. Demo records are fictional and must never be seeded into production. Coverage is bounded to 600 rows per role and 100,000 JSON characters per read page; report source references are capped at 50,000 characters with a visible failure before writing. Direct Database edits and other apps do not participate in the app's parent guards; reconcile those changes before approving evidence. This is an internal operational reporting package, not a sponsor portal, patient system or automatic disclosure service. See MCP_USAGE.md and AUTOMATION_RECIPES.md for installation, migration and separately authorized setup.
