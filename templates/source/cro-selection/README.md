# CRO Selection 3.0.0 (`life.cro-selection`)

Choose CROs, CDMOs and labs: from the need to a signed award and a clean handover. Scope: [CRO_SELECTION.md](../../../docs/product/app-template-blueprints/apps/CRO_SELECTION.md) (BT2-05). 3.0.0 is the rebuild on the TrialAgents kit and the v2 app contract (platform decisions of 19 November 2026, session 7, package 7.3: G2–G8, G11, G14, P3–P5, P9). It is a **draft**: it is not in `templates/catalog-seed.json`; the owner approves versions (O4). 2.1.1 stays published and byte for byte.

**What stays identical to 2.1.1** (so the owner-approved upgrade, package 7.1, carries the data across; `upgradeFrom: ["2.1.0","2.1.1"]`): the installer schema (`schema.example.json`, byte for byte), the 27 app commands with their ids, modes and inputs, the `croselection.awards` output contract, the calculation rules, the exchange rules, and the options `tableMap`, `pageSize`, `layoutProfile`, `readOnly` and `asOfOverride`. The layout screens keep their 2.x ids, so a saved layout profile stays valid. There are no helper functions and no recommended automations, before or after.

**What 3.0.0 changes:**

- **v2 contract.** `'use trialagents v2';` is line 1. The kit (`kit.page`, `kit.nav`/`kit.layout`, `kit.table` styles, `kit.cell`/`kit.edit`, `kit.panel`, `kit.board`/`kit.move`, `kit.empty`, `kit.pager`, `kit.picker`, `kit.undo`, `kit.notice`, `kit.stat`) and the platform styles come from the runtime; `cro-selection.css` holds only the bid grid, chips, messages and a few layout rules, written against `--k-*` tokens (about 6 KB instead of 14 KB).
- **No own header or messages.** No header, title, eyebrow, "As of" pill, layout gear, side-rail footer or banners. Messages are the platform's one notice (`output.notice`); an error about a value comes back as that notice. Partial or missing data is still said, in a line on the screen it concerns.
- **Direct saving (P5, G5).** Every record edit is `records.save` from a person's own click, change or submit, with the version captured when editing started. Values are edited where they are shown (`kit.cell`): request budget, deadlines and owner; vendor name, type and country; criterion weight and mandatory; checklist status, owner and due date; proposal line amounts; the award's start date. Side panels only add a record or edit many fields. Requests move stage by drag and drop on the Overview board (or the menu on each card). Archive is `archive_record`. After a save, the app offers Undo for the person's last action (`undo.list`, `undo.run`). Every "prepared for review", "(reviewed)" and "nothing changes until approved" wording is gone.
- **The one confirmation stays.** Exchange operations that reach suppliers (send, reminders, replies, clarifications, acceptances, notices, extend and stop with notice) keep the platform's single confirmation; record changes made by the same click (invited, submitted, selected, stage, award) travel with it and commit in the same transaction.
- **Screens.** Overview, Requests, Vendors, Messages, Proposals, Evaluation, Decision, Emails (new: invitation texts per request kind, the workspace invitation default and the decision notices, moved out of Settings) and Settings (owners only, `input.appRole`: default currency, question-deadline default, confidentiality text, blind scoring). The Display panel (opening screen, stage names) and the Access and automations panel are gone; stage names saved earlier still show.
- **Per-screen reads (P3, P4).** Each screen reads only its own tables in one `records.readMany` batch whose reads are always the same for that screen; app commands read every table. A read still on its way (`pending`, in the frame) shows the screen as loading, never as empty or zero; so does exchange data on its way.
- **Working context (G4).** The chosen request is `output.context` and comes back as `input.context` on the next visit.
- **Empty screens** each offer their first action (new quick quote or full selection, add vendor, create the round, apply the criteria set, record the decision).
- **Commands** save directly when an assistant with Data level Edit runs them (`saved` instead of `prepared` in the result). `layout.save` remains an app change the owner approves.
- Options `heading` and `demoLabel` are dropped (they served the old header and preview label).

## Files

| File | Purpose |
| --- | --- |
| `cro-selection.source.js` | The canonical, readable `frontend-js` source. Line 1: the v2 marker; line 2: `templateLayoutSchema` (screens, column groups and form groups for `layout.save`); line 3: `appCommands`. |
| `cro-selection.css` | The few app-specific styles, on kit tokens. |
| `catalog.metadata.json` | Catalog fields: options, `upgradeFrom`, instructions and the documentation served to assistants. |
| `schema.example.json` | Installer schema, identical to 2.1.1; `templates/catalog-installers.json` names it for 3.0.0 and the archived copy for 2.1.1. |
| `demo_data.json` | Fictional records and exchange state for the preview and the tests. Never seeded into a workspace. |
| `cro-selection.preview.html` | Generated offline preview of 3.0.0 with the kit and labelled fictional data. It contacts nobody. |
| `QA.md` | Commands, results and what was not verified. |
| `archive/2.1.1/` | The released 2.1.1 package, unchanged; the builder rebuilds its catalog JSON and preview from here and `--check` proves them byte for byte. |
| `archive/1.0.1/`, `archive/2.0.0/`, `archive/2.1.0/` | Earlier packages, unchanged. |
| `../../../tests/cro-selection-v2.test.ts`, `../../../tests/cro-selection-v2-integration.test.ts` | 3.0.0 unit tests (every screen, reads, saving, notices, settings, empty screens, loading, commands) and the install-and-run test on the real platform. The 2.1.1 tests are unchanged. |

Edit the source, CSS and metadata, then run `node scripts/build-cro-selection-template.mjs` (it builds 2.1.1 from the archive and 3.0.0 from this folder; `--check` runs in `npm run build`). The catalog copy is the canonical file with whitespace and redundant syntax removed by esbuild; lines 1 to 3 are kept verbatim and the CSS constant follows them.

## Roles (scope §7)

| Role | Contract | Mode |
| --- | --- | --- |
| `organizations` | core.v1 | read/write (vendors: `org_type` cro, cdmo, other for labs) |
| `people`, `programs`, `studies` | core.v1 | optional, read/write |
| `agreements` | core.v1 | optional, read/write; core fields only (Contracts-owned fields are left to Contracts) |
| `croselection.settings`, `.requests`, `.invitations`, `.proposals`, `.proposal_lines`, `.criteria`, `.scores`, `.checklist_items` | croselection.v1 | app tables (no template table: built-in defaults; questions and cost categories live on the request) |
| `croselection.awards` | croselection.v1 | published output (writer `life.cro-selection`) in `templates/contracts/outputs.json`, registry version 2026-11-13 |

At install the Use existing data? dialog connects existing organizations, people, programs, studies and agreements tables by default, for example those of Contracts, Runway or Programs. Everything else gets new tables.

`croselection.proposals` is also the response table of every exchange group. The platform requires every database-required field of a response table to be a question on the supplier page. So `invitation_id`, `round`, `version`, `submitted_on`, `source` and `currency` are not database-required: the app sets and checks them at acceptance. This is the one deviation from the `*` marks in scope §7.

## Platform exchange (scope §6, guidance 1.3.23)

| Need | How the app does it |
| --- | --- |
| RFI and RFP rounds | `exchange.createGroup` per round with `appRef` `request:<id>:rfi\|rfp`. The config holds the brief (scope, assumptions, bid-grid categories, numbered questions from the request), `documents`, `typeId` croselection.proposals with the round's fields and questions, `slots` and `gate`, the confidentiality text, and the invitation text of the request kind; other email types use the platform defaults. Applied on click: nothing reaches anyone yet. |
| One exchange per supplier | `exchange.invite` with `recordId` = the invitation record, applied on click. Status, links and rounds are read from the exchange; no IDs are copied into records. |
| Request pack | `exchange.shareDocuments` with platform documents, applied on click until the first email; reviewed afterwards. Upload uses `data-trialy-document="upload rfp_pack:<request>"`. |
| Invitation | `exchange.prepareEmail` (batch text, per-supplier personalisation, display name, optional scheduled reminder), shown exactly as returned. `exchange.sendEmail` is **one review** that also marks the suppliers invited, sets `cda_status: sent` and moves the request stage, in the same transaction. |
| Signed CDA | Slot `signed_cda`, and with the gate on, `gate: signed_document`. `exchange.acceptFile` for the signed CDA marks it signed in the same review and unlocks the pack. "Use Contracts" files it as a CDA agreement; "skip" records "in place elsewhere". |
| Answers and prices | Only the latest submission per supplier is shown. `exchange.acceptSubmission` with `target:"new"` creates the proposal and marks the supplier submitted in one review. Files are accepted separately, with the AI-readable choice. |
| Messages | `exchange.reply` (private) and `exchange.publishClarification` (anonymised, email notice to all). |
| Decision notices | `exchange.replyAll`: one private message and email per supplier, using the winner text or the text for the others (with the debrief offer). This is in the same review as the decision when "Notify all" is ticked, or a separate "Notify all" review. |
| Status and deadlines | `exchange.list` (by `appRef`) and `exchange.status`. `exchange.extend` and `exchange.revoke` are in the supplier panel. |

Assistants never confirm, and for them every exchange operation is a review. Recipient links are never stored, rendered or passed to assistants, except inside the send review, which the platform returns.

## Calculation contract (scope §8)

- **Proposal total** = Σ lines in the proposal currency, or the stated total when there are no lines. Lines in other currencies are listed, never converted or compared. A stated total that differs from the lines is flagged.
- **Grid** = the request's cost categories (or the built-in ones for its service type), then the sponsor baseline, then any category a proposal adds. **Deviation** = amount − baseline and % of the baseline; line deviations and stated deviations are flagged.
- **Weighted score** = Σ(mean reviewer score × weight) ÷ 100, rounded on the ×100 scale. A mandatory criterion with a mean below 3 fails. **Spread** = max − min. No score is inferred for an unscored criterion.
- **Blind scoring** (a setting, default off) hides prices in Evaluation until every reviewer who has scored has scored every scored supplier on every criterion, or a person reveals them for the session.
- **Latest proposal** = highest accepted version per invitation and round. **Qualification ready** = all items done or not applicable. An issue blocks the decision unless an override reason is given; the reason is stored in the award rationale.
- **As-of date** = today from the runtime; `asOfOverride` pins it for previews and tests.
- **Bounds**: 800 rows per table, 90 record reads and 14 exchange reads per render, 200 documents. Partial, unavailable or unbound reads disable totals, scores and "nothing waiting" answers and say so.

## Handoff

"Prepare the handoff" (`handoff.prepare`) is one save:

- It writes a draft agreement in the shared agreements table, which Contracts shows in its pipeline. Contracts completes it, and "Link it to the award" stores the agreement ID.
- It stores the prepared Programs milestones as JSON in `croselection.awards.handoff_status`, with `runway: {state: "read_by_runway"}`.

CRO Selection never writes another app's own tables. Runway 2.2.0 reads `croselection.awards` itself (Plan → From other sources → Add to plan, which keeps the source and flags later changes), so no Runway lines are prepared: a line proposed from the award would bypass that tracking and could be counted twice. The user's assistant proposes the milestones in Programs through its reviewed path. With none of these apps the award simply stays. CRO Oversight and Trial Finance read `croselection.awards` too.

## App commands (2.1.0; in 3.0.0 their record changes save directly)

| Kind | Commands |
| --- | --- |
| Read | `schema.describe`, `overview.read`, `request.read`, `grid.read`, `evaluation.read`, `decision.read` |
| Records | `record.save` (requests, vendors, contacts, invitations, proposals received another way, lines, criteria, checklist items), `record.archive`, `request.stage`, `longlist.add`, `invitation.status`, `cda.record_elsewhere`, `cda.file_agreement`, `lines.save`, `criteria.apply_defaults`, `checklist.apply_defaults`, `checklist.set_status`, `scores.save` |
| Decision and award | `decision.record`, `award.save`, `onboarding.update`, `handoff.prepare`, `award.link_agreement` |
| Settings and layout | `settings.save` (including opening screen and stage names), `invitation_text.save`, `invitation_text.reset`, `layout.save` |

Each propose command replays the click and submit events through `handle`, the same function the screens use, so validation, version capture and the saved changes are the same. Exchange actions (rounds, links, documents, emails, replies, clarifications, acceptances, extend, stop, Notify all) are not commands: `xwrite` refuses them in a command run, and the platform refuses exchange writes outside a person's click.

## Revision contract

A reviewed code revision of this app keeps: the role keys; the `croselection.awards` output contract (croselection.v1, writer `life.cro-selection`); the calculation rules above; the exchange rules (one exchange call per click, no links or exchange IDs in records); stable `data-action` on every input; every command id with its click parity; the v2 contract (marker, kit, `records.save`, no own header, banners or review wording); and per-screen, bounded reads. A revision that drops a command says so in the review.
