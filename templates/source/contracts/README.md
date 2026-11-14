# Contracts 1.1.0 (`life.contracts`)

Register of CDAs, MSAs, SOWs and other agreements with key dates and obligations. Scope: [CONTRACTS.md](../../../docs/product/app-template-blueprints/apps/CONTRACTS.md) (BT2-04; 1.1.0 is §12). It follows [modular apps and shared data](../../../docs/product/MODULAR_APPS_AND_SHARED_DATA.md), template guidance 1.3.28. 1.1.0 is **published** in place of 1.0.0 (owner approval, 14 November 2026; seed entry and migration 073 withdrawing 1.0.0); the released 1.0.0 package is kept unchanged under `archive/1.0.0/` and installed 1.0.0 apps are not migrated.

**What 1.1.0 changes (owner decisions C1–C8, 14 November 2026):**
- **Two ways in, no scheduled AI.** The user gives a contract to Claude or ChatGPT to store with its terms and obligations, or types the details in the app (blank is fine). The scheduled extraction automation is gone.
- **No automations.** Contracts declares none and needs none; the 1.0.0 optional digest and extraction automations and the `digest_day` setting are removed. Users may add their own later.
- **Counterparty on obligations** (`counterparty_id`, default the agreement's counterparty). `contracts.obligations` is now `contracts.v2`, a superset of `contracts.v1`, so v1 readers keep connecting.
- **Assistants can change everything** within their access, through the review: every button is documented as an exact record change (instructions step 6), checking proposals on the user's request included. The 1.0.0 advice to block assistants from the verification fields is removed.
- **The app calculates what it shows** (notice deadline, confidentiality end and the rest of the calculation contract) from the fields, whoever saved them; stored copies are used only when the inputs are missing.
- **"From *App*" labels** on every value read from another connected app (today Programs milestones), read only here.
- **Fields:** forms are generated from the logical schema `S`; an assistant adds a field to the table and to `S`/`tableMap` in one reviewed revision and it appears in forms and details. Bound fields this version does not know show read-only under "Additional fields".

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
| `AUTOMATION_RECIPES.md` | Why Contracts has no automations. |
| `archive/1.0.0/` | The released 1.0.0 package, unchanged (its catalog JSON stays `templates/apps/life.contracts-1.0.0.json`). |

Edit the source, CSS and metadata, then run `node scripts/build-contracts-template.mjs`. This regenerates `templates/apps/life.contracts-1.1.0.json` and the preview; `--check` runs in `npm run build`. Do not edit a released version: publish a new version and archive the previous package first. After a preview change, regenerate the gallery screenshot and manifest entry (`node scripts/build-template-screenshots.mjs`); the 1.1.0 screenshot is `resources/template-gallery/life.contracts@1.1.0.jpg`.

## Roles (scope §5)

| Role | Contract | Mode |
| --- | --- | --- |
| `agreements` | core.v1 + Contracts-owned optional fields `parent_id`, `program_id`, `study_id`, `total_value`, `currency`, `signed_on`, `owner` (added to `templates/core-contract/v1.json` with `owner: life.contracts`) | read/write |
| `organizations` | core.v1 | read/write |
| `people`, `programs`, `studies` | core.v1 | optional, read/write |
| `programs.plan_items` | programs.v2 | optional + integration: binds `name`, `program_id`, `item_type`, `end_date`, `status`, `is_key` |
| `contracts.settings`, `contracts.terms` | contracts.v1 | app tables (`digest_day` is no longer created) |
| `contracts.obligations` | contracts.v2 (v1 + `counterparty_id`) | published output (writer `life.contracts`) in `templates/contracts/outputs.json` |

At install the Use existing data? dialog connects an existing agreements/organizations table (for example Runway's) by default and adds the seven owned fields. Optional roles connect when present, otherwise Contracts gets its own tables. Milestones: Contracts' own entries until the user links Programs in the app (subtle “Works with Programs. Add Programs” / “Programs is in your workspace. Use its milestones” line in Settings); then Programs' plan items are read only. Programs installed first connects at install.

## Signed originals and filling in

- Originals are TrialAgents documents. **Upload and extract** (Register), **Upload the signed original** (details, after signing) and **Upload instead** (attach dialog) render `data-trialy-document="upload attach:<id>"`; the host opens the platform upload review and returns the new version. **Attach a saved original** picks from `documents.list`. An external URL can go in `document_link`.
- Register search can include the signed originals (`documents.search`, with coverage).
- On the user's request only, the connected assistant (Claude or ChatGPT, each through its own connection) reads AI-readable originals and proposes the agreement, `contracts.terms` (`extraction_status: proposed`, `source_quotes`) and `contracts.obligations` (`verified: false`, `source_quote`, `source_page`, `source_document_version_id`). Originals that are not AI-readable are not listed to assistants and are reported.
- **Verify proposals** shows each value with its quote and page, checks the quote against the extracted text (`documents.quote`: found, found on another page, not found, text not ready), and saves one reviewed batch with the verifier's name and date. Rejected obligations are archived. Only verified items are counted.
- An assistant may also check proposals when the user explicitly asks, through the same review, recording the user's name and date.

## Calculation contract

- **Notice deadline** = `expiry_date − notice_days` when renewal is automatic or option; **confidentiality end** = (`expiry_date`, else `effective_date`) + `confidentiality_years` × 12 calendar months, day clamped to the month end. Both are calculated by the app from the fields whenever it shows them (a stored copy is used only when the inputs are missing) and stored in `contracts.terms` in the same review as the terms or as an agreement date change, signature or attachment.
- **Family value** = master `total_value` + Σ descendants per currency (terminated or superseded children excluded); other currencies listed separately, never converted; **change-order share** = Σ change orders ÷ family value in the master's currency. **Earliest expiry / next notice** over active members.
- **Next due** of a recurring obligation = first occurrence on or after the as-of date (month arithmetic from the first due date, day clamped). **Overdue** = open, non-recurring, due before the as-of date.
- **Windows** from `reminder_days` (default 30, 60, 90). **Expires before milestone** = active agreement whose program has a key, open milestone ending after the agreement's expiry.
- **As-of date** = today's date from the runtime; `asOfOverride` pins it for previews and tests; a control appears only if the runtime has no date.
- **Bounds:** 800 rows per table, 80 reads per render, 200 document versions, 15 quote checks per review. Unbound, unavailable, short-page, unknown-total or truncated reads disable totals, family values and “no CDA” answers, and say so.

## Host interactions

- Every input carries `data-ui-state` and a stable `data-action`; drafts survive failed proposals; record versions are captured when an editor, confirmation or review opens; at most 50 writes per review.
- A new agreement's starting key terms (`status_since`, CDA purpose and direction) are offered as a follow-up save once the agreement has its record ID (a batch cannot reference a record it creates).
- The gear emits `tracker:layout` (screens; column groups `agreements`, `obligations`).
- Values from another connected app are labelled "From *App*" (`integrations.list` provider) and are read only. Bound fields not in `S` are listed under "Additional fields" in details, read only.
- No app login, browser storage, network calls or automation reads.
