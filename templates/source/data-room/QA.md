# Data Room 1.0.0: QA against DATA_ROOM.md §13

Run on 13 November 2026 with fictional data in disposable databases, under the runtime role with row security on party pages. No deployed account was used.

| Test | Result |
|---|---|
| `tests/data-room.test.ts` (8 tests: package, templates, set-up, go live, screens, CDA options, Q&A, preview and sync) | pass |
| `tests/data-room-integration.test.ts` (3 end-to-end tests through the real installer, app runtime, review, exchange, party pages, tracking and email delivery) | pass |
| `tests/exchange-rooms.test.ts` (platform room extension R1–R8, PR A) | pass |
| `scripts/test-data-room-browser.ts` (app in the production frame, 1440 and 390 px) | pass |
| `tests/visual/external-exchange.spec.cjs` (recipient room page, 1440 and 390 px) | pass |
| `node scripts/build-data-room-template.mjs --check` | verified |

## Package checklist

| Item | Evidence |
|---|---|
| Source under `templates/source/data-room/`; immutable `templates/apps/life.data-room-1.0.0.json`, a draft (not in the seed) | data-room.test "package" |
| Roles as in §7 (13 roles; app tables on `dataroom.v1`; people, programs and agreements optional) | data-room.test "package"; integration test: 13 tables at install |
| `dataroom.v1` registry: writer `life.data-room` and `partnering` added; schema fields equal the contract (keys, kinds, options) | data-room.test "package" |
| Fictional default templates for financing, licensing, partnering and M&A, each with the 9-section index and required items weighted by purpose | data-room.test "built-in index templates" |
| Email defaults per email type and room purpose; a saved text replaces the built-in one for its purpose only | data-room.test "go live" |
| `catalog.metadata.json` validates against the catalog schema and documents the outputs it writes | data-room.test "package" |
| Fictional `demo_data.json` (`.invalid` emails only) | data-room.test "package" |
| `templateLayoutSchema` with seven screen IDs (overview, rooms, index, parties, activity, qa, settings) | data-room.test "package" |
| Build `--check` in `npm run build`; browser test | above |

## Acceptance

| # | Criterion | Result and evidence |
|---|---|---|
| 1 | **Financing room end to end:** template → readiness gaps → documents at two levels → three investors invited in one confirmed send (default text, one personalised by the assistant; preview = sent). Two open the room; one views a document twice. Grants and engagement update automatically, and Fundraise sees them. | **Pass** (integration "Acceptance 1"). Readiness starts at 0% with the gaps listed. The room page, links and access are created on clicks with no review. The assistant prepares the batch with one personalised email but cannot send it. The person confirms it once, and the three delivered emails equal the preview. After tracking: Ana and Ben active, Dev invited; Ana's engagement shows 2 opens and ≥95 s. Fundraise does not exist yet, so the check uses the role registry a Fundraise "Use its data" dialog uses (`roleTables`, `readerAccepts`, `tableCompatible`): Data Room's two output tables are found as writable, compatible `dataroom.v1` providers. |
| 2 | **Licensing room with CDA (Contracts):** the party uploads the signed CDA; acceptance opens Confidential and sends an email on confirm; the CDA is filed as an agreement; a custom level "CMC" is added later for one party only. | **Pass** (integration "Acceptance 2"). Acceptance opens Confidential for Chloe only. The access-changed email reaches her, and a `cda_nda` agreement lands in the agreements table shared with Contracts. CMC is defined, a document placed and the level given to Chloe; Eli never sees it. Unit test "CDA options" also covers in place elsewhere (date recorded as the met entry step) and reuse of a signed CDA already in Contracts. |
| 3 | **Levels:** a party never sees a document above their levels, including in search, "what changed" and published answers; lowering a level hides those documents at once. | **Pass**. Integration "Acceptance 2": lowering Chloe hides the Confidential and CMC documents at once, and their URLs return 404. Platform test: search, "what changed", published level answers and the digest are limited to open levels. |
| 4 | **Versions:** a new version keeps its place, shows Updated, and appears in the daily digest when notifications are on. | **Pass** (integration "Acceptance 1"). "Use version" is one review covering the item and `replaceDocument`. The room page shows the new version in section 1 marked Updated. After the person approves the digest text (assistants cannot), three digests list "Presentation deck (updated)" and never a document above the person's level. They go out once a day. |
| 5 | **Q&A:** question → assign → draft (assistant) → approve → private answer (email); a second answer published to the room (asker anonymised, emails to the room's parties). | **Pass** (integration "Acceptance 2"). The assistant's draft is a proposed record change a person approves. Sending before approval is refused. The private answer emails only Chloe. The published answer reads "A party asked: …" without Eli's name and emails both parties. |
| 6 | **Assistants:** they draft but cannot send, grant, change levels, publish, accept or revoke; they never see links or documents without AI access. | **Pass**. Integration "Acceptance 1": AI confirmation is refused for send, revoke, levels, invite, publish and digest. Links are absent from AI reads. An assistant cannot run the app at all while the workspace holds documents that are not AI-readable. Unit test: tracked fields are never proposed. |
| 7 | **Modularity and archiving:** rule 9 and archive first; archiving a room or the app stops all links; restoring re-enables only unexpired grants; Fundraise keeps working with "data unavailable". | **Pass** (integration "Acceptance 7"). Steps covered: install alone (13 tables); Programs and Contracts added later share programs and agreements; Contracts archived; a tab hidden in the layout. Archiving the app stops links and tracking, and reinstalling offers the restore. Restoring re-enables the unexpired grant; the expired one stays closed and is tracked as expired. Fundraise does not exist yet: the readers' side is the platform rule that an archived provider's tables are not offered (role registry, PR A). |
| 8 | **Layout:** desktop 1440 and mobile 390, for the app and the recipient room page. | **Pass**. `scripts/test-data-room-browser.ts`: seven screens at both widths with no error banner and no page overflow; also the room picker, a drawer on mobile, a reviewed edit with nothing written before approval, and the layout gear event. `external-exchange.spec.cjs`: the room page at both widths, with keyboard, contrast, entry step, search, viewer, view-only and Q&A. |

## Decisions and limits

- Fundraise (03) and BD Pipeline (07) are not built, and they publish no opportunity or round roles. Parties are therefore chosen from shared organizations and people, and the round and opportunity are stored as references. The connection runs the other way: those apps read `dataroom.v1`.
- Set-up takes three reviews (room; levels and sections; checklist items), because records in one review cannot refer to each other's new IDs.
- "In place elsewhere" CDAs: the Confidential level has no entry step, and the date is recorded when the person grants the level. A "Use Contracts" room can also reuse a signed CDA on file, recorded as the met entry step.
- View-only hides downloads but cannot stop screenshots; the app says so. Not legal advice on what to disclose.
