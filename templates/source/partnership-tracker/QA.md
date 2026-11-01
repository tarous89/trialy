# Partnership Tracker 1.1.1 release evidence

App 14 was reviewed against template authoring/usage guidance 1.3.9 and the actual catalog, database, runtime, sanitizer, design and native-layout contracts. Fixtures use only synthetic isolated data. No customer records, automations or outgoing messages were created.

## Critical fixes

- Updates/archives use recordId and the original optimistic version, including zero. Stale and revoked changes fail without discarding the draft.
- A partner change requires complete reads of evaluations, meetings and milestones and no linked evidence. Linked company identity and program scope cannot silently reinterpret existing evidence. Criteria versions cannot roll backward into old approvals. Copies clear original identity and reviewed state.
- Complete field mapping and scalar values are required. Incomplete, denied, unknown-total, short-page, invalid and over-budget data cannot establish authoritative scores or absence of dependent evidence.
- Dialog errors remain visible, proposals retain drafts until host confirmation, and forms submit through the real frame contract. Native field order/visibility applies to tables or editors; Additional fields preserves access to required hidden inputs.
- The reference date defaults to current UTC, explicit dates render consistently in QuickJS, saved programs have a reachable register, and source links open through the trusted host adapter. Add contact uses the organization actually shown after filtering.
- Font sizes, contrast and narrow Discovery controls pass production checks. The original six-screen relationship-workbench design is retained. No permission, manifest, sandbox or design enforcement was weakened.
- MCP-returned documentation includes complete scalar schema/mapping rules, recovery behavior, stable automation keys, fixed completion-email content and a typed inactive example. It never implies that optional background work is active.
- Canonical source, style, metadata, fictional data/preview, mappings, instructions and release tests are registered in the repository. The main build checks deterministic catalog/preview output.

## Validation

`node --import tsx --test tests/partnership-template.test.ts tests/partnership-integration.test.ts`: 11 tests pass. Includes all six QuickJS screens, complete/missing/denied/array/short/unknown/over-budget reads, score 93.0% from independently specified 5/5/4/4 dimensions, stale/revoked edits, version-zero updates, empty creation, archive identity/conflicts, partner-change dependency coverage, copied approvals, criteria revision, filtered company selection, hidden fields, comparison paging and typed manual completion-email validation.

The integration fixture creates all eight documented schemas and records through normal reviewed database operations after applying real migrations to PGlite. Child references use committed parent receipt UUIDs. It saves/reopens the actual catalog app, inspects six screens with the production design gate, confirms real creates/updates/archives, blocks evidence-changing partner reassignment, saves copied evaluations as Draft, and persists native layout without modifying the manifest. Stale layout updates fail.

`node --import tsx scripts/test-partnership-browser.ts`: passes using the production sanitized frame with manifest attached and the real backend fixture. Exercises six screens at 320/390/768/1100/1440px, text/textarea/number/date/select forms, visible errors and retained values, trusted review confirmations and database receipts, native screen/field reordering and reload. Desktop/mobile and mobile form screenshots were visually inspected locally. The discovered 320px Discovery overflow was fixed before the passing run.

`APP_DESIGN_CHECKS=off node --import tsx --test --test-concurrency=2 tests/app-templates.test.ts tests/frontend.test.ts tests/frontend-reads.test.ts tests/shared-automations.test.ts tests/notification-guardrails.test.ts`: 36 shared regression tests pass. Includes catalog discovery/digest, reviewed writes/access revocation, shared-runner failure isolation, retry/deduplication and notification burst/delivery guardrails with mocked mail. Design checking is bypassed only for unrelated shared fixtures; app-specific design, integration and browser checks run with production validation enabled.

`node scripts/build-partnership-template.mjs --check` and `npm run build`: pass generated-file checks, TypeScript, production web and embed builds. Final catalog tests and build include the concurrently published Investor CRM package without changing it.

## Release boundaries

The repository package is ready for the existing deployment path. Repository publication does not verify that a deployed MCP server has loaded this version or that cached ChatGPT tools have refreshed. Live MCP discovery, connected ChatGPT acceptance, scheduled research and actual delivered email remain separate checks; none is claimed here.

Reads are bounded to 800 rows per role (at most 64 read calls and one proposal within the 100-call runtime budget). Larger datasets require narrowed authorized scope or a separate backend paging implementation. Partial results cannot establish completeness. asOf is a reference date, not a historical snapshot. Scalar references and app guards are not database-wide foreign keys and do not prevent independent Database edits; reconcile those before relying on reviewed evidence.

No migration, service, credential or environment change is required. Existing saved apps retain their published source until explicitly revised. No automation is enabled by installing this template.
