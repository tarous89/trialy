# Investor CRM 1.0.1 — release evidence

Reviewed against authoring/usage guidance 1.3.9 and current TrialAgents host contracts on 2026-11-01. Replaces the uploaded 1.0.0 candidate without rewriting any released catalog version or existing saved app.

## Corrections

- Production font and contrast failures corrected; narrow headers and editor actions remain reachable.
- Pipeline lists use selected-round server filtering before pagination; follow-up counts and lists share the same round and completeness requirements. Missing dependencies cannot look like an empty healthy list.
- Research briefs have independent pagination and can be opened beyond the 800-row analysis ceiling. Stale page offsets clamp to available pages.
- Every saved-record editor exposes reviewed archive; round editing is reachable from Overview. Version checks and complete linked-record guards remain intact. Details and edit dialogs do not stack.
- Required-field clears fail explicitly with retained drafts. Currency changes cannot relabel existing values. Duplicate investor/round opportunities and structured values in scalar fields withhold authoritative totals.
- Fields without write permission are disabled and labelled read only, rather than accepting edits that would be ignored.
- Native layout title, advertised columns, finding-field order and visibility affect the rendered app. Hidden required inputs remain editable in full drawers.
- Schema field definitions now parse directly through the real field schema. Relationship documentation is outside field definitions, and fixtures substitute actual saved parent receipt IDs.
- Complete MCP instructions, canonical source, metadata, schemas, fictional preview, deterministic builder, build check and catalog entry are included. Stale uploaded scripts, screenshots and release manifests are not publication evidence.

## Verification

Run from the repository root:

| Command | Evidence |
| --- | --- |
| `node scripts/build-investor-template.mjs --check` | Catalog and fictional preview exactly match canonical inputs. |
| `node templates/source/investor-crm/test_runtime.cjs` | Original six-screen regressions: signed/indicative separation, scope changes, paging, incomplete/denied/unknown/over-budget evidence, stale edits/archives, protected signed evidence, duplicates, retained drafts, reviewed interaction/follow-up and no app authentication. |
| `APP_DESIGN_CHECKS=off node --import tsx --test --test-concurrency=1 tests/investor-template.test.ts tests/investor-integration.test.ts tests/app-templates.test.ts tests/frontend.test.ts tests/frontend-reads.test.ts` | Whole-catalog discovery and preparation, exact field schemas, real QuickJS, production design inspector, selected-round lists, brief paging, invalid values, currency guards, archive reachability and layout rendering. Real PostgreSQL-compatible reviewed schema/record/app creation, stale-version rejection, confirmation receipt replay, atomic interaction/task save, versioned native layout and Ignore. Shared frontend permission and review regressions. |
| `APP_DESIGN_CHECKS=off node --import tsx scripts/test-investor-browser.ts` | Production sanitized frame with manifest, real DB fixture, text/money/date/select/textarea drafts and confirmed investor creation; selected-round lists; native screen drag, field reorder, review, reload and Ignore; six routes at 320/390/768/1100/1440 widths; reachable mobile drawer actions and no document overflow. |
| `npm run build` | Generated package checks, TypeScript, web and embed production build. Existing bundle-size advisory is informational. |
| `git diff --check` | Whitespace validation. |

Tests use isolated synthetic PGlite records and actual host code. They do not weaken the sanitizer, remove the manifest or bypass review. The design test explicitly calls the production inspector; the environment flag only avoids redundant fixture creation-time checks. No customer records or external notifications are used.

Final result: all 14 acceptance tests passed with no failures, skips or cancellations; the original runtime suite, deterministic generation check, production build and complete browser run passed. Desktop, 320px mobile and mobile editor screenshots were visually inspected. The browser run confirmed all six routes at five widths, actual reviewed creation, native layout persistence/Ignore and reachable edit/archive actions.

Initial runs exposed schema annotation and contrast errors, then two browser harness assumptions: navigation actions also appear in overview cards, and reordering navigation does not change the default open screen. Responsive checks then caught overlapping round controls and a clipped interaction action at phone widths; the header action group, wrapping and control sizing were corrected. Failed or timed-out attempts are not passes.

## Release boundaries

The package is ready for the existing deployment pipeline after the checks above pass. Repository publication is separate from deployed MCP discovery, connected ChatGPT acceptance, saved customer-app receipts, scheduler readiness and delivered email. This QA does not claim those live outcomes. No monitoring or email is activated by the template.

The supported scope is internal small-team fundraising coordination with bounded complete evidence, not securities solicitation, accounting, legal execution, cap-table administration or a guarantee over independent Database edits. The 800-row analysis and dependent-view limits are documented in README.md and MCP-returned catalog limitations.
