# Contracts 1.0.0 (`life.contracts`)

Register of CDAs, MSAs, SOWs and other agreements with key dates and obligations. Scope: [CONTRACTS.md](../../../docs/product/app-template-blueprints/apps/CONTRACTS.md) (BT2-04). It follows [modular apps and shared data](../../../docs/product/MODULAR_APPS_AND_SHARED_DATA.md) and template guidance 1.3.21 (built against 1.3.20 plus the documents capability this package added). New template; there is no earlier version. The owner approved publication on 12 November 2026: `templates/catalog-seed.json` names 1.0.0 and migration 063 approves the draft row an earlier deployment imported, so it appears in app templates.

## Files

| File | Purpose |
| --- | --- |
| `contracts.source.js` | The `frontend-js` renderer: seven screens (Overview, Register, Families, Obligations, CDAs, Pipeline, Settings), calculations, verification review, documents and reviewed `records.propose` writes. It starts with the single-line `templateLayoutSchema` declaration. |
| `contracts.css` | Vivid kit, graphite rail (`#2B3546`) with ocean accent (`#175B94`), derived from the Programs theme; one page scroll; responsive 390–1440 px. |
| `catalog.metadata.json` | Catalog fields: options, instructions (including the assistant extraction contract) and the MCP-served documentation. |
| `schema.example.json` | Installer schema, registered in `templates/catalog-installers.json`: roles exactly as in scope §5. |
| `demo_data.json` | Fictional records only (fictional organizations, “(fictional)” owners). Also the hand-checked set for the tests. Never seed it into a workspace. |
| `contracts.preview.html` | Generated offline preview, fixed as of 12 Nov 2026. Documents and assistant extraction need the TrialAgents host. |
| `QA.md` | Commands, results, hand calculations, acceptance criteria 1–10 and unverified boundaries. |
| `AUTOMATION_RECIPES.md` | The two optional automations and the no-automation path. |

Edit the source, CSS and metadata, then run `node scripts/build-contracts-template.mjs`. This regenerates `templates/apps/life.contracts-1.0.0.json` and the preview; `--check` runs in `npm run build`. Do not edit a released version: publish a new version and archive the previous package first. After a preview change, regenerate the gallery screenshot and manifest entry (`node scripts/build-template-screenshots.mjs`); the 1.0.0 screenshot is `resources/template-gallery/life.contracts@1.0.0.jpg`.

## Roles (scope §5)

| Role | Contract | Mode |
| --- | --- | --- |
| `agreements` | core.v1 + Contracts-owned optional fields `parent_id`, `program_id`, `study_id`, `total_value`, `currency`, `signed_on`, `owner` (added to `templates/core-contract/v1.json` with `owner: life.contracts`) | read/write |
| `organizations` | core.v1 | read/write |
| `people`, `programs`, `studies` | core.v1 | optional, read/write |
| `programs.plan_items` | programs.v2 | optional + integration: binds `name`, `program_id`, `item_type`, `end_date`, `status`, `is_key` |
| `contracts.settings`, `contracts.terms` | contracts.v1 | app tables |
| `contracts.obligations` | contracts.v1 | published output (writer `life.contracts`) in `templates/contracts/outputs.json` |

At install the Use existing data? dialog connects an existing agreements/organizations table (for example Runway's) by default and adds the seven owned fields. Optional roles connect when present, otherwise Contracts gets its own tables. Milestones: Contracts' own entries until the user links Programs in the app (subtle “Works with Programs. Add Programs” / “Programs is in your workspace. Use its milestones” line in Settings); then Programs' plan items are read only. Programs installed first connects at install.

## Signed originals and extraction

- Originals are TrialAgents documents. **Upload and extract** (Register), **Upload the signed original** (details, after signing) and **Upload instead** (attach dialog) render `data-trialy-document="upload attach:<id>"`; the host opens the platform upload review and returns the new version. **Attach a saved original** picks from `documents.list`. An external URL can go in `document_link`.
- Register search can include the signed originals (`documents.search`, with coverage).
- The connected assistant (Claude or ChatGPT, each through its own connection) reads AI-readable originals and proposes the agreement, `contracts.terms` (`extraction_status: proposed`, `source_quotes`) and `contracts.obligations` (`verified: false`, `source_quote`, `source_page`, `source_document_version_id`). Originals that are not AI-readable are not listed to assistants and are reported.
- **Verify proposals** shows each value with its quote and page, checks the quote against the extracted text (`documents.quote`: found, found on another page, not found, text not ready), and saves one reviewed batch with the verifier's name and date. Rejected obligations are archived. Only verified items are counted.
- To enforce that assistants never verify, owners add Database column rules denying Claude and ChatGPT writes to `verified`, `extraction_status`, `verified_by` and `verified_on` (tested).

## Calculation contract

- **Notice deadline** = `expiry_date − notice_days` when renewal is automatic or option; **confidentiality end** = (`expiry_date`, else `effective_date`) + `confidentiality_years` × 12 calendar months, day clamped to the month end. Both are stored in `contracts.terms` in the same review as the terms or as an agreement date change, signature or attachment.
- **Family value** = master `total_value` + Σ descendants per currency (terminated or superseded children excluded); other currencies listed separately, never converted; **change-order share** = Σ change orders ÷ family value in the master's currency. **Earliest expiry / next notice** over active members.
- **Next due** of a recurring obligation = first occurrence on or after the as-of date (month arithmetic from the first due date, day clamped). **Overdue** = open, non-recurring, due before the as-of date.
- **Windows** from `reminder_days` (default 30, 60, 90). **Expires before milestone** = active agreement whose program has a key, open milestone ending after the agreement's expiry.
- **As-of date** = today's date from the runtime; `asOfOverride` pins it for previews and tests; a control appears only if the runtime has no date.
- **Bounds:** 800 rows per table, 80 reads per render, 200 document versions, 15 quote checks per review. Unbound, unavailable, short-page, unknown-total or truncated reads disable totals, family values and “no CDA” answers, and say so.

## Host interactions

- Every input carries `data-ui-state` and a stable `data-action`; drafts survive failed proposals; record versions are captured when an editor, confirmation or review opens; at most 50 writes per review.
- A new agreement's starting key terms (`status_since`, CDA purpose and direction) are offered as a follow-up save once the agreement has its record ID (a batch cannot reference a record it creates).
- The gear emits `tracker:layout` (screens; column groups `agreements`, `obligations`).
- No app login, browser storage, network calls or automation reads.
