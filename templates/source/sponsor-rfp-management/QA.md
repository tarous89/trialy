# Sponsor RFP Management 1.0.1 — release verification

Validated 1 November 2026 against the repository host and current deployed authoring guidance 1.3.9 (all four pages; SHA-256 `989103afa88c520cd79f68a861363e5d37b39e8ff4be7ecda61a5ec56dc21662`). Catalog ID `life.sponsor-rfp-management` remains separate from the existing CRO-side RFP template. No prior released catalog or saved app is replaced.

## Critical repairs

- Updates and archives use host `recordId` and the original `expectedVersion`, including version zero. Missing/stale records and revoked writes retain the draft and produce no replacement record.
- Map every field, including mandatory/archived and optional evidence. Missing, denied, unknown-total, short-page, invalid scalar and over-budget sources remain incomplete. Null mandatory flags are unknown, not optional. All writes require complete authorized sources.
- Compare and approve against the submitted invitation's project, independently of the currently selected screen. Require a received bid, mandatory responses, 100% explicit weights, unique evidence and dated reviewed scores. The known sample score is 83%: weights 30/25/20/15/10 times scores 4/5/4/4/3 divided by five.
- Project evidence writes include the original project version in the same atomic reviewed proposal. Concurrent approval proposals cannot both confirm. Final decisions and their supporting evidence are protected from edits. A new linked approval atomically supersedes its current predecessor, saves the replacement and updates the project. Changed scope/evidence requires a new RFP revision.
- Copied projects, bids, reviews and awards reset protected state. Edited parent links cannot silently reinterpret saved evidence. Dependent archive checks require complete reads.
- Empty responses render safely. Forms remain usable in the production sanitized frame, preserve failed/proposed input and reveal hidden required fields through Additional fields. Native screen/field order persists after reload without changing the manifest.
- Corrected unreadable text and small labels. All six production screens pass the real design gate; no gate bypass is used for this package.
- MCP-returned instructions include exact scalar schemas, mapping, lifecycle/retry/revision, atomic proposal and optional automation contracts. The typed email example uses a scoped Approved transition, fixed text and one separate delivery step. Recurring drafting has a real private monitoring-result destination, no invented report table, no automatic award or supplier email.
- Canonical files deterministically generate the registered catalog and fictional local preview. Repository build checks drift.

## Passed checks

| Command / check | Result |
| --- | --- |
| `node --import tsx --test tests/sponsor-rfp-template.test.ts` | 11 passed: actual QuickJS catalog source, populated/empty screens, incomplete evidence, stale/revoked writes, archive guards, reset copies, cross-project approval, atomic replacement, final evidence protection, hidden fields, typed notification and paging |
| `node --import tsx --test tests/sponsor-rfp-integration.test.ts` | 1 passed: real migrated PGlite database; reviewed schema and receipt-based parent/child creation; exact catalog preparation/save/reopen; production design inspector on all six screens; create/edit/archive; conflicting pending approvals; three-row supersession; immutable evidence; native layout/stale layout rejection |
| `node --import tsx scripts/test-sponsor-rfp-browser.ts` | Passed: real production sanitized frame with full manifest, six screens at 320/390/768/1100/1440px, text/textarea/number/date/select/boolean controls, retained invalid/proposed drafts, confirmed receipts, mobile dialog and native screen/field reorder after reload. No page errors or horizontal page overflow. Desktop/mobile screenshots inspected. |
| `APP_DESIGN_CHECKS=off node --import tsx --test --test-concurrency=2 tests/app-templates.test.ts tests/frontend.test.ts tests/frontend-reads.test.ts tests/shared-automations.test.ts tests/notification-guardrails.test.ts` | 36 passed. The opt-out applies only to generic host fixtures; Sponsor-specific save/design/browser checks above run with the gate enabled. Includes permission isolation, exact review, retry receipts, automation expiry/revocation, duplicates, missed occurrences, notification coalescing/cancellation and mocked delivery failure. |
| `APP_DESIGN_CHECKS=off node --import tsx --test tests/app-templates.test.ts` | 3 passed again after incorporating the concurrent Project Oversight release; entire catalog remains valid. These repeat existing coverage, not additional unique tests. |
| `npm run build` | Passed all template drift checks including Sponsor RFP, TypeScript, production web and embedded bundles. Existing bundle-size advisory only. |

Total: 48 unique tests passed, plus connected browser acceptance and production build. All source fixtures are synthetic and use the actual host preparation, execution and reviewed mutation paths. No customer records, jobs or messages were created.

## Verification boundaries

This is repository publication readiness, not proof of a deployment or a customer installation. Live MCP catalog propagation, a real ChatGPT embedded session, unattended monitor execution and email delivery require separate live receipts and were not claimed or exercised. Browser acceptance uses the real frame/host bridge in a local harness. Notification provider delivery is mocked in shared tests.

The app's guards are not database-wide foreign keys or regulated electronic signatures. Independent Database edits must be reconciled; the award screen withholds a current verified award when current accessible evidence fails its checks. Reads are bounded to 960 rows per role (at most 96 read calls); larger sources withhold dependent writes and authoritative coverage. No global gate, sanitizer, permission, scheduler or server policy was weakened for this release.
