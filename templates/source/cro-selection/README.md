# CRO Selection 2.1.0 (`life.cro-selection`)

Choose CROs, CDMOs and labs: from the need to a signed award and a clean handover. Scope: [CRO_SELECTION.md](../../../docs/product/app-template-blueprints/apps/CRO_SELECTION.md) (BT2-05). New major version of `life.cro-selection`. It replaces CRO Selection 1.0.1 and Sponsor RFP Management 1.0.1. Both are marked for catalog archival in [`templates/catalog-retirements.json`](../../catalog-retirements.json), and the withdrawal happens when the owner approves 2.1.0. Built against template guidance 1.3.31, in particular "External exchange from apps", "Platform documents inside apps" and "App commands", and against the contract registry. The owner's decisions of 13 November 2026 (simplification) and 15 November 2026 (platform changes and AI-native control) are recorded in the scope, [§14](../../../docs/product/app-template-blueprints/apps/CRO_SELECTION.md#14-cro-selection-210--platform-changes-and-ai-native-control).

**What 2.1.0 changes from the 2.0.0 draft** (archived unchanged under `archive/2.0.0/`; imported drafts are immutable, so the revision is a new version):

- **App commands.** 27 commands (`appCommands`, line 2 of the source): 6 read, 20 propose, 1 layout. Every record action a person can click is a command that replays the same events through one handler (`handle`), so a command and a click produce the same proposal. Read commands return the app's own figures. Supplier communication is never a command.
- **Award by the user, in the app or through the assistant.** `decision.record` prepares the same award, statuses and stage as Record the decision; a person approves the review. Notices are sent by a person (Notify all).
- **Customization.** Additional fields (`extraFields` and `writableExtra` in the table map) appear in forms and details; other bound fields show read-only. Form layout for eight forms (order, hidden, labels, defaults), vendor columns, stage names and the opening screen (`settings.preferences`). The layout gear's `group:field` visibility keys now work (2.0.0 read `group.field`, so hiding a column had no effect).
- **Runway.** The handoff no longer prepares Runway spend lines: Runway 2.2.0 reads `croselection.awards` itself, with source tracking.
- **No automations** (see `AUTOMATION_RECIPES.md`). The award agreement's status is labelled as kept in Contracts.
- Editing a request no longer rewrites its unchanged assumptions (a JSON formatting difference was reported as a change).

**Catalog status:** published (owner approval, 15 November 2026). `templates/catalog-seed.json` names 2.1.0; migration 077 withdraws CRO Selection 1.0.1 and Sponsor RFP Management 1.0.1. The 2.0.0 draft stays a draft.

## Files

| File | Purpose |
| --- | --- |
| `cro-selection.source.js` | The canonical, readable `frontend-js` renderer: eight screens, calculations, exchange calls, reviewed `records.propose` writes and app commands. Line 1 is the single-line `templateLayoutSchema` declaration (screens, column groups and form groups); line 2 is the single-line `appCommands` declaration. |
| `cro-selection.css` | Vivid kit, theme **ocean** (`#175B94`) with the dark rail `#182C35`; one page scroll; responsive 390–1440 px. |
| `catalog.metadata.json` | Catalog fields: options, instructions (exchange mapping and the assistant contract) and the MCP-served documentation. |
| `schema.example.json` | Installer schema, registered in `templates/catalog-installers.json`: roles exactly as in scope §7. |
| `demo_data.json` | Fictional records plus a fictional imitation of exchange state, used by the offline preview and the unit tests. Never seed it into a workspace. |
| `cro-selection.preview.html` | Generated offline preview, fixed as of 13 Nov 2026. It contacts nobody; exchange writes show an alert. |
| `QA.md` | Commands, results, hand calculations, acceptance criteria 1–9 and what was not verified. |
| `AUTOMATION_RECIPES.md` | Why 2.1.0 has no automations, and where reminders and mapping live instead. |
| `../../../tests/external-exchange-confirmation.test.ts` | Platform test of the one-confirmation rule this app relies on. |
| `archive/1.0.1/` | The released 1.0.1 package, unchanged (built by `scripts/build-selection-template.mjs`). |
| `archive/2.0.0/` | The 2.0.0 draft package, unchanged; its catalog JSON `templates/apps/life.cro-selection-2.0.0.json` is kept byte for byte. |
| `../../../tests/cro-selection-commands.test.ts` | Commands: parity with clicks, read results, award, exchange boundary, customization, and a real-platform run with Runway 2.2.0. |

Edit the source, CSS and metadata, then run `node scripts/build-cro-selection-template.mjs`. This regenerates `templates/apps/life.cro-selection-2.1.0.json` and the preview, and `--check` runs in `npm run build`. The catalog copy of the source is the canonical file with whitespace and redundant syntax removed by esbuild; identifiers and lines 1 and 2 are unchanged. This keeps the entry well under the 240,000-character catalog limit, with room for the configuration the host prepends. Do not edit a released version: publish a new version and archive the package first.

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

"Prepare the handoff" (`handoff.prepare`) is one reviewed save:

- It writes a draft agreement in the shared agreements table, which Contracts shows in its pipeline. Contracts completes it, and "Link it to the award" stores the agreement ID.
- It stores the prepared Programs milestones as JSON in `croselection.awards.handoff_status`, with `runway: {state: "read_by_runway"}`.

CRO Selection never writes another app's own tables. Runway 2.2.0 reads `croselection.awards` itself (Plan → From other sources → Add to plan, which keeps the source and flags later changes), so no Runway lines are prepared: a line proposed from the award would bypass that tracking and could be counted twice. The user's assistant proposes the milestones in Programs through its reviewed path. With none of these apps the award simply stays. CRO Oversight and Trial Finance read `croselection.awards` too.

## App commands (2.1.0)

| Kind | Commands |
| --- | --- |
| Read | `schema.describe`, `overview.read`, `request.read`, `grid.read`, `evaluation.read`, `decision.read` |
| Records | `record.save` (requests, vendors, contacts, invitations, proposals received another way, lines, criteria, checklist items), `record.archive`, `request.stage`, `longlist.add`, `invitation.status`, `cda.record_elsewhere`, `cda.file_agreement`, `lines.save`, `criteria.apply_defaults`, `checklist.apply_defaults`, `checklist.set_status`, `scores.save` |
| Decision and award | `decision.record`, `award.save`, `onboarding.update`, `handoff.prepare`, `award.link_agreement` |
| Settings and layout | `settings.save` (including opening screen and stage names), `invitation_text.save`, `invitation_text.reset`, `layout.save` |

Each propose command replays the click and submit events through `handle`, the same function the screens use, so validation, version capture and the proposal are the same; the tests compare them. Exchange actions (rounds, links, documents, emails, replies, clarifications, acceptances, extend, stop, Notify all) are not commands: `xwrite` refuses them in a command run, and the platform refuses exchange writes outside a person's click.

## Revision contract

A reviewed code revision of this app keeps: the role keys; the `croselection.awards` output contract (croselection.v1, writer `life.cro-selection`); the calculation rules above; the exchange rules (one exchange call per click, no links or exchange IDs in records); `data-ui-state` and stable `data-action` on every input; every command id with its click parity; and bounded reads. A revision that drops a command says so in the review.
