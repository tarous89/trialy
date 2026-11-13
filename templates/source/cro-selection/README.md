# CRO Selection 2.0.0 (`life.cro-selection`)

Choose CROs, CDMOs and labs: from the need to a signed award and a clean handover. Scope: [CRO_SELECTION.md](../../../docs/product/app-template-blueprints/apps/CRO_SELECTION.md) (BT2-05). New major version of `life.cro-selection`. It replaces CRO Selection 1.0.1 and Sponsor RFP Management 1.0.1. Both are marked for catalog archival in [`templates/catalog-retirements.json`](../../catalog-retirements.json), and the withdrawal happens when the owner approves 2.0.0. Built against template guidance 1.3.24 (one confirmation when something goes out; this branch also brings the platform change), in particular "External exchange from apps" and "Platform documents inside apps", and against the contract registry. The owner's simplification decisions of 13 November 2026 are recorded in the scope.

**Catalog status:** draft. `templates/catalog-seed.json` still names 1.0.1; 2.0.0 is imported as a draft and needs the owner's approval (seed entry plus a one-time migration, as for Contracts 1.0.0, which also withdraws the two retired versions).

## Files

| File | Purpose |
| --- | --- |
| `cro-selection.source.js` | The canonical, readable `frontend-js` renderer: eight screens, calculations, exchange calls and reviewed `records.propose` writes. Line 1 is the single-line `templateLayoutSchema` declaration. |
| `cro-selection.css` | Vivid kit, theme **ocean** (`#175B94`) with the dark rail `#182C35`; one page scroll; responsive 390–1440 px. |
| `catalog.metadata.json` | Catalog fields: options, instructions (exchange mapping and the assistant contract) and the MCP-served documentation. |
| `schema.example.json` | Installer schema, registered in `templates/catalog-installers.json`: roles exactly as in scope §7. |
| `demo_data.json` | Fictional records plus a fictional imitation of exchange state, used by the offline preview and the unit tests. Never seed it into a workspace. |
| `cro-selection.preview.html` | Generated offline preview, fixed as of 13 Nov 2026. It contacts nobody; exchange writes show an alert. |
| `QA.md` | Commands, results, hand calculations, acceptance criteria 1–9 and what was not verified. |
| `AUTOMATION_RECIPES.md` | The three optional automations and the no-automation path. |
| `../../../tests/external-exchange-confirmation.test.ts` | Platform test of the one-confirmation rule this app relies on. |
| `archive/1.0.1/` | The released 1.0.1 package, unchanged (built by `scripts/build-selection-template.mjs`). |

Edit the source, CSS and metadata, then run `node scripts/build-cro-selection-template.mjs`. This regenerates `templates/apps/life.cro-selection-2.0.0.json` and the preview, and `--check` runs in `npm run build`. The catalog copy of the source is the canonical file with whitespace and redundant syntax removed by esbuild; identifiers and line 1 are unchanged. This keeps the entry under the 180,000-character catalog limit, which leaves room for the configuration the host prepends under the 200,000-character limit for saved app source. Do not edit a released version: publish a new version and archive the package first.

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

"Prepare the handoff" is one reviewed save:

- It writes a draft agreement in the shared agreements table, which Contracts shows in its pipeline. Contracts completes it, and "Link it to the award" stores the agreement ID.
- It stores the prepared Runway spend line and Programs milestones as JSON in `croselection.awards.handoff_status`.

CRO Selection never writes another app's own tables. The user's assistant proposes those items in Runway and Programs through their reviewed path. With none of these apps the award simply stays. CRO Oversight, Trial Finance and Runway read `croselection.awards`.
