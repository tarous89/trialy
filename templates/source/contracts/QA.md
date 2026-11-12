# Contracts 1.0.0 validation

Validated against the repository host on 12 November 2026 with disposable PGlite databases, the real catalog sync, installer, Add app step, in-app integration dialog, reviewed write path, document upload, the text-extraction worker and the real MCP endpoints, using fictional data only. Not a deployed account.

**Catalog status:** draft. `templates/catalog-seed.json` is unchanged, so the catalog sync imports 1.0.0 as `draft`; tests approve it only inside their own databases. Publication needs the owner's approval (seed or operator approval), as for Runway and Programs.

**Guidance:** built against template guidance 1.3.20 and the contract registry; this package adds the documents capability and bumps the guidance to **1.3.21** (`templates/TEMPLATE_AUTHORING.md`, `templates/TEMPLATE_USAGE.md`, `templateGuidance.version`).

## What was added outside the package

| Change | Where |
| --- | --- |
| Contracts-owned optional `agreements` fields `parent_id`, `program_id`, `study_id`, `total_value` (money), `currency` (select, Runway's 12 codes), `signed_on`, `owner` with `owner: life.contracts` | `templates/core-contract/v1.json`; `MODULAR_APPS_AND_SHARED_DATA.md` §4 |
| Output role `contracts.obligations`, contract `contracts.v1`, writer `life.contracts` (17 fields exactly as scope §5) | `templates/contracts/outputs.json` (registry version 2026-11-12); §7.3 |
| App capabilities `documents.list`, `documents.search`, `documents.text`, `documents.quote` for saved apps, with the actor's own document permissions (previews: unavailable) | `src/workspace/app-documents.ts`, `src/workspace/service.ts` |
| Upload hook: sanitized `data-trialy-document="upload <context>"` → `trialy.document` → host `DocumentUploadDialog` (`preview_document_upload` + `commit_change`, AI-readable choice on the website) → app event `document:uploaded:<context>` with the version ID | `src/shared/frontend-frame.ts`, `src/shared/FrontendCodeRuntime.tsx`, `src/shared/DocumentUploadDialog.tsx`, `src/web/foundation-client.ts` |
| Installer registration and build check | `templates/catalog-installers.json`, `scripts/build-contracts-template.mjs`, `package.json` build |

## Decisions and deviations from the scope (with reasons)

- **`contracts.terms` has two fields beyond scope §5:** `source_quotes` (JSON `{field:{quote,page}}`, so proposed terms carry their quotes like obligations do) and `status_since` (the scope asks for “days in status” but no field held a status date). Both are additive app-table fields.
- **`agreement_type` and `status` stay `text`** in the core contract (shared schemas never retype); Contracts writes only the scope's option values and validates them.
- **Verification is enforced by the app and, optionally, by column rules.** The app records verification only from a named person's reviewed save. Assistants are instructed never to verify, and owners can enforce it with Database column rules (Claude and ChatGPT: no write to `verified`, `extraction_status`, `verified_by`, `verified_on`); the integration test proves both principals are then refused (“Editing is restricted for one or more fields”). Without those rules the platform's review step is the only barrier; the test shows an assistant could otherwise prepare such a change.
- **Obligations a person enters in the app are saved as verified** (they are that person's own entry). Proposals from assistants arrive with `verified: false`.
- **New agreement → key terms in a second save.** One review batch cannot reference a record it creates, so the starting key terms (status date; CDA purpose and direction) are offered as a one-click follow-up once the agreement exists (“Save key terms”).
- **Confidentiality end without an expiry** uses the effective date as the base (the data model has no separate term field). Years are applied as 12 calendar months each, day clamped to the month end.
- **Families start collapsed in the hosted app:** the frame sanitizer does not keep `open` on `<details>`, so each family shows its name and total and expands on click (desktop and mobile).
- **Renewal decision:** recorded as a dated line in the key-term notes; *renegotiate* also moves the agreement to In negotiation; *terminate* does not change status before expiry (notice is given through the user's channel).
- **Payments feed Runway** only through a future Runway integration (scope §9); Contracts shows payments by month and currency and publishes them in `contracts.obligations`.

## Commands and outcomes

| Command | Result |
| --- | --- |
| `node scripts/build-contracts-template.mjs --check` | Passed |
| `npm run build` (all template drift checks, `tsc --noEmit`, `vite build`, embed build) | Passed |
| `APP_DESIGN_CHECKS=off node --import tsx --test tests/contracts.test.ts` | 12/12 passed, including the production design inspector (seven screens plus the verification and details panels, 1440 and 390 px) |
| `APP_DESIGN_CHECKS=off node --import tsx --test tests/contracts-integration.test.ts` | 5/5 passed |
| `APP_DESIGN_CHECKS=off node --import tsx scripts/test-contracts-browser.ts` | Passed |
| `npm test` (full suite) | FULL_SUITE_RESULT |

Browser-based checks (design inspector, browser test) ran against this container's Chromium through a `PLAYWRIGHT_BROWSERS_PATH` that maps the repository's pinned Playwright 1.51.1 browser names to the installed build, as for Programs. Test code was not changed for this. The Programs design-inspector test fails identically without that mapping.

## Hand calculations (fictional set, `demo_data.json`, as of 12 Nov 2026)

| Agreement | Inputs | Expected | App |
| --- | --- | --- | --- |
| Helix MSA | expiry 14 Jun 2027, automatic, notice 90 d | notice 16 Mar 2027 (124 days away) | same |
| Corvane supply | expiry 30 Sep 2027, option, notice 180 d | notice 3 Apr 2027 | same |
| Brightwater DPA | expiry 31 Dec 2026, automatic 12 months, notice 30 d | notice 1 Dec 2026 → hero “Cancel … by 1 Dec 2026 or it renews for 12 months (in 19 days)” | same |
| Brightwater DPA, notice edited to 45 d | | 16 Nov 2026, stored in the same review | same |
| Brightwater DPA, expiry moved to 31 Mar 2027 | | notice 1 Mar 2027, stored with the date change | same |
| Kestrel advisory, renewal set to none | | stored notice deadline cleared | same |
| Northwind CDA | expiry 1 Mar 2027 + 5 y | confidentiality end 1 Mar 2032 | same |
| Lumen CDA | no expiry; effective 10 Jan 2026 + 3 y | 10 Jan 2029 | same |
| Meridian CDA 2023 | expiry 29 Feb 2024 + 2 y | 28 Feb 2026 (month-end clamp) | same |
| CDA signed in the app | expiry 29 Feb 2028 + 2 y | 28 Feb 2030 | same |
| Helix family | SOW 1 EUR 1,200,000; SOW 2 EUR 850,000; CO 1 EUR 150,000; CO 2 USD 40,000; MSA no value | EUR 2,200,000; USD 40,000 listed separately; change orders EUR 150,000 = 6.8 %; earliest active expiry 31 Dec 2026; next notice 16 Mar 2027 | same |
| Recurring obligations | quarterly from 31 Mar 2025; monthly from 28 Feb 2025; annual from 30 Sep 2025 | next due 31 Dec 2026; 28 Nov 2026; 30 Sep 2027 | same |
| Payments Dec 2026 | SOW 1 fee EUR 100,000 + retainer EUR 2,000; CO 2 fee USD 40,000 | EUR 102,000 and USD 40,000 in separate columns | same |
| Expires before milestone | Corvane expires 30 Sep 2027; PX-101 key milestone Phase 1 topline 31 Mar 2028 | flagged | same |

## Acceptance criteria (CONTRACTS.md §11)

1. **Notice deadline and confidentiality end computed on save, matching a hand-checked set:** passed (table above; unit test 2 and integration test 1, where the stored value in the database is 3 Apr 2027).
2. **Family value per currency, other currencies separate:** passed (unit test 3; browser test).
3. **Extraction by Claude and by ChatGPT, each via its own connection; quotes and pages; nothing verified without a person; non-AI-readable originals reported:** passed in the repository host (integration test 4). Three fictional PDFs were uploaded through the platform upload (two AI-readable, one not) and extracted by the real worker (`poppler-layout`, page sections). Through the real MCP endpoints — `/claude` as the Claude principal and `/mcp` as the ChatGPT principal — each assistant listed only the two AI-readable originals and was refused the scan (not found); Claude read the CDA and ChatGPT read the DPA with `read_document_text`, and each proposed the agreement, terms (`extraction_status: proposed`, `source_quotes`) and an obligation (`verified: false`, exact quote, page, document version) with `prepare_change`, approved by the person. The proposals were written by this assistant (Claude) from the extracted text; the ChatGPT-principal path used the same reading on the ChatGPT endpoint. In the app, `documents.quote` confirmed the CDA quotes on pages 2 and 3 and flagged the DPA obligation quote as “Found, but on page 2” (stated page 1). Nothing was verified until the person entered a name and approved the review; with the column rules in place both principals were refused when trying to set `verified`. **Not run:** a live ChatGPT conversation and a live Claude conversation against a deployed account (this template is a draft and not deployed).
4. **CDA check returns the right agreement, direction and confidentiality end:** passed (unit test 6: Northwind mutual, confidential until 1 Mar 2032; Meridian only an expired incoming CDA plus one out for signature; unknown organization; partial reads answer “Not sure”), and on extracted, verified data in integration test 4.
5. **Pipeline status changes are reviewed; signing prompts for the document:** passed (unit test 7; browser test: move reviewed with nothing written before approval, Mark signed stores the dates and confidentiality end, the upload button reaches the host and the returned version is attached by a reviewed save).
6. **Integration test (Contracts alone → add Programs → Use its data → read only → archive Programs → keeps working; reverse order connects at install):** passed (integration test 1). Alone: nine tables and own milestone entries; the offer is “Add Programs”. Programs added: it reuses Contracts' programs table; Contracts offers “Use its milestones”; the dialog shows both sources (1 own entry, 1 in Programs); assistants cannot choose; after the user's choice the role is read only (`writableFields` empty, manifest mode `read`), the own entry stays in Database, and a milestone-linked obligation shows Programs' milestone and the “expires before First patient dosed” check. Programs archived: every screen still opens with the same milestones. Reverse order: Contracts connects Programs' plan items and programs at install, source `linked`, no hint; explicit separate data creates its own tables.
7. **Runway first: Runway plan lines can link to agreements created in Contracts:** passed (integration test 2). Contracts reuses Runway's agreements, organizations and programs tables (one agreements table) and adds exactly the seven owned fields; Runway still opens; Runway's plan-line editor lists the agreement created in Contracts and a Runway line stores its record ID.
8. **Data Room or a custom app reads `agreements` and `contracts.obligations` per the registry:** passed with a custom app (integration test 3): roles `agreements` core.v1 and `contracts.obligations` contracts.v1 declared read-only are accepted and read; declaring the output writable is refused while Contracts is its writer. The Data Room app itself is not built yet.
9. **Modularity (rule 9) and archive-first:** passed (integration test 1): install alone; with Programs (reuse, never copy); Programs deleted (archived); one tab removed (people) and re-added (same table reconnects, records unchanged); archive keeps every field, restore brings the attached automation back switched off, the archived app is listed for the owner and a reinstall is refused with “Restore your archived Contracts app”.
10. **Desktop 1440 / mobile 390; family tree usable on mobile:** passed (browser test: no page overflow on any screen at 390; the family tree expands and collapses; screenshots inspected; design inspector clean).

Also covered: every input has `data-ui-state`; record versions are captured when editors open and a stale save is rejected by the server; a failed proposal keeps the draft; read-only users get disabled controls and no proposals; partial, unavailable and unknown-total reads disable totals; native layout save, reload and stale-state precedence; the as-of date from the runtime.

## Not verified here

- Live Claude and ChatGPT sessions on a deployed account, real installs, and the upload dialog inside the ChatGPT and Claude hosts (it uses the existing `preview_document_upload` app tool and `commit_change`; only the website client route was added and exercised by the browser harness's equivalent calls).
- Automation setup or delivery: no digest or extraction automation was configured and no email was sent.
- The gallery screenshot and manifest entry (generated after approval).
- `npm run test:visual` (the platform visual suite) — see the PR for its CI result.
