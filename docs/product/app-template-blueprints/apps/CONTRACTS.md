# Contracts — final app scope (BT2-04)

*Register of CDAs, MSAs, SOWs and other agreements with key dates and obligations.*

**Status:** Final scope for build, 12 November 2026. Part of [Biotech apps v2](../BIOTECH_v2.md) (rank 4). New template `life.contracts` 1.0.0 (display name **Contracts**). No v1 package.

**Governing contracts:** as for [Runway](RUNWAY.md), [Programs](PROGRAMS.md) and [Fundraise](FUNDRAISE.md), plus [modular apps and shared data](../../MODULAR_APPS_AND_SHARED_DATA.md) (core contract v1, archive first, role-based connections, add-app dialog, **in-app integrations**). Build against template guidance 1.3.20 or later and the contract registry (`read_app_template_guidance(resource:"contracts")`). They win on any conflict.

**Decisions (12 Nov 2026):** references ContractSafe/ContractWorks (size), Gatekeeper/Contract Logix (biotech structure), Ironclad (AI extraction with human verification, contract families); signed originals stored as TrialAgents documents (optional external link); extraction by whichever assistant the user connects (Claude or ChatGPT), proposals stay unverified until a person confirms; simple pre-signature status, no redlining; agreement types as listed in §5, employment contracts excluded; connect to other apps wherever useful (§9).

---

## 1. Evidence and references

Sources read 12 November 2026: Ironclad (product articles, reviews), ContractWorks, ContractSafe, Juro, SpotDraft, Gatekeeper, Contract Logix, LinkSquares and biotech contract-management guides. Vendor sources, not a survey; validate with design partners.

| Need | Signal | Confidence |
|---|---|---|
| One searchable register of every agreement | Biotechs handle CDAs, MSAs, SOWs and research collaborations, each with its own requirements; many wait for a legal hire before organising them. | High |
| Agreements are how outsourced work is controlled | CROs, CMOs and licensing partners do the work; the agreements are the control layer. | High |
| Key dates and reminders (expiry, renewal, notice) | The core of small-business contract tools and of Ironclad's AI date extraction and alerts. | High |
| Contract families (MSA → SOW → change order; licence → sublicence) | Gatekeeper connects the MSA to its change orders and total value; Contract Logix models parent–child relationships; Ironclad's contract family shows the whole relationship. | High |
| Obligations (payments, reports, diligence milestones) | Ironclad's AI obligation extraction with verification and monitoring; Contract Logix flags royalty stacking, diligence terms and flow-down provisions. | High |
| Due-diligence access to key agreements | Biotechs need quick access to deal disclosures and diligence data for financings and M&A. | Medium–high |
| Drafting, clause libraries, redlining, e-signature | Core of Juro, SpotDraft, Ironclad workflows. | Not for this app (decision) |

| App | Role |
|---|---|
| **ContractSafe / ContractWorks** (primary, size) | Simple repository with search and reminders for small teams, unlimited users. |
| **Gatekeeper / Contract Logix** (domain) | Parent–child agreements, total contract value, biotech/licensing obligations. |
| **Ironclad** (ideas only) | AI extraction with human verification; obligations dashboard; contract families. |

---

## 2. Scope

**In:** register of agreements on the shared `agreements` table; families (parent/child); key terms (renewal, notice, confidentiality period); obligations owed by and to the company, including milestone and recurring payments; CDA fast lane; simple pre-signature status; signed originals as TrialAgents documents or an external link; assistant-proposed extraction with source quotes, verified by a person; reminders digest; due-diligence list.

**Out:** drafting, templates, clause library, redlining, negotiation workflow, e-signature, approval chains, legal advice or risk scores, purchase orders and invoice matching (Trial Finance, 11), employment contracts.

**Small features that delight:**
1. **Upload and extract:** upload a signed PDF; the user's connected assistant (Claude or ChatGPT) proposes parties, dates, value, renewal, notice and obligations, each with the quoted sentence and page. Nothing is "verified" until a person confirms it.
2. **Notice alarms:** "Cancel by 3 March 2027 or it renews for 12 months."
3. **Family value:** MSA + SOWs + change orders, with the total per family and how much was added by change orders.
4. **"Have we signed a CDA with them?"** Instant check by organization, with term, direction and confidentiality end date — before a BD or investor meeting.
5. **Expires before the milestone:** flags agreements (e.g. a CRO MSA) that end before a linked program milestone (when Programs is used).
6. **Due-diligence list:** one click produces the list of key agreements and terms for a data room or diligence questionnaire.

---

## 3. Screens (7)

Custom `frontend-js` app on the Vivid kit, theme **graphite** with ocean accent, declared in `templateLayoutSchema` (layout gear). Four capabilities each; agreement details open in the side panel.

| # | Screen (id) | Capabilities |
|---|---|---|
| 1 | **Overview** (`overview`) | (1) Next 90 days: expiries, notice deadlines, obligations due, CDA confidentiality ends. (2) Overdue obligations and unverified extractions. (3) Agreements by type and status. (4) In-flight agreements (drafting → out for signature) with age. |
| 2 | **Register** (`register`) | (1) Table of agreements: name, type, counterparty, program, status, effective/expiry, value. (2) Search and filters (type, counterparty, program, status, date window, verified). (3) Add agreement (form or upload-and-extract). (4) Side panel: key terms, family, obligations, document, history. |
| 3 | **Families** (`families`) | (1) Tree per master agreement or counterparty (MSA → SOW → change order; licence → sublicence/amendment). (2) Family total value and change-order share. (3) Earliest expiry and next notice in the family. (4) Add child agreement to a family. |
| 4 | **Obligations** (`obligations`) | (1) Table of obligations: we owe / they owe, kind, due date or trigger, amount, owner, status, verified. (2) Calendar list by month. (3) Mark done / waived / missed; verify proposed ones. (4) Payment obligations by month and currency (feeds Runway via integration). |
| 5 | **CDAs** (`cdas`) | (1) CDA list by organization: direction (mutual / incoming / outgoing), purpose, signed, term, confidentiality end. (2) "Have we signed with…?" search. (3) New CDA request (status drafting) in two fields. (4) Expiring confidentiality list. |
| 6 | **Pipeline** (`pipeline`) | (1) Board by pre-signature status: drafting / in negotiation / out for signature. (2) Owner and days in status. (3) Move status (reviewed). (4) Signed → becomes active, with document upload prompt. |
| 7 | **Settings** (`settings`) | (1) Agreement types and obligation kinds. (2) Reminder windows (default 30/60/90 days) and digest day. (3) Default currency. (4) Links to Access and Automations. |

Shared behaviours, chart rules and states as in [Runway §3](RUNWAY.md#3-screens-7). Integration lines follow the platform pattern (one subtle `data-trialy-integration` button; the platform opens the dialog).

---

## 4. Workflows

1. **Import existing contracts.** Upload signed originals (platform document upload, explicit confirmation). The connected assistant reads each document's extracted text and proposes the agreement, key terms and obligations with source quotes; the user verifies in one review. Agreements kept elsewhere can be added with an external link instead.
2. **New CDA.** CDAs → New: counterparty and purpose → status drafting → out for signature → signed (upload) → active, confidentiality end computed.
3. **Track a family.** Add SOWs and change orders as children of the MSA; the family value and earliest expiry update.
4. **Obligations.** Verified obligations appear on the Overview and in the weekly digest; owners mark them done, waived or missed.
5. **Renewal decision.** Before a notice deadline: decide renew / renegotiate / terminate; record the decision in the agreement's notes and status.
6. **Diligence.** Generate the due-diligence list (filters: type, status, materiality) and copy or export it for a data room or questionnaire.

---

## 5. Data model

Principles as in [Runway §5](RUNWAY.md#5-data-model). Own tables use contract `contracts.v1`.

**Shared roles**

| Role | Contract | Mode | Use |
|---|---|---|---|
| `agreements` | core.v1 (+ Contracts-owned optional fields, below) | read/write | The register |
| `organizations` | core.v1 | read/write | Counterparties |
| `people` | core.v1 | optional, read/write | Counterparty signatories and contacts |
| `programs` | core.v1 | optional, read/write | Agreements linked to programs |
| `studies` | core.v1 | optional, read/write | Clinical trial agreements, CRO work orders per study |
| `programs.plan_items` | programs.v2 | **integration**, bind `name`, `program_id`, `item_type`, `end_date`, `status`, `is_key` | Milestone-triggered obligations and payments; "expires before milestone" (own milestone entries until linked to Programs) |

**Core `agreements` — Contracts-owned optional fields (additive to core.v1, to be added to the core contract and registry):** `parent_id` (UUID→agreements), `program_id`, `study_id`, `total_value` (money), `currency`, `signed_on` (date), `owner` (text). Other apps may read them; only Contracts writes them.

`agreement_type` options: cda_nda / msa / sow_work_order / change_order / mta / research_collaboration / licence_in / licence_out / cmo_supply / quality_agreement / consulting_advisory / clinical_trial_agreement / data_processing / lease_services / other. `status` options: drafting / in_negotiation / out_for_signature / active / expired / terminated / superseded.

**Own tables (`contracts.*`)**

| Table | Key fields (kind) |
|---|---|
| `contracts.settings` (one row) | default_currency (select), reminder_days (text list, default 30,60,90), digest_day (number, 1 = Monday), agreement_types (text list), obligation_kinds (text list) |
| `contracts.terms` (one per agreement) | agreement_id (text*, UUID→agreements), renewal (select: none / automatic / option), renewal_term_months (number), notice_days (number), notice_deadline (date, set on save), confidentiality_years (number), confidentiality_end (date, set on save), cda_direction (select: mutual / incoming / outgoing), purpose (text), governing_law (text), document_id (text, platform document), document_version_id (text), document_link (text, external URL), extraction_status (select: none / proposed / verified), verified_by (text), verified_on (date), notes (text) |
| `contracts.obligations` (output) | agreement_id (text*), title (text*), kind (select*: payment / report / diligence_milestone / notice / delivery / publication_review / audit / insurance / royalty / other), direction (select*: we_owe / they_owe), due_date (date), recurrence (select: none / monthly / quarterly / annual), trigger (text), milestone_id (text, UUID→programs.plan_items), amount (money), currency (select), owner (text), status (select*: open / done / waived / missed), verified (boolean), source_quote (text), source_page (number), source_document_version_id (text), archived (boolean) |

`*` = required. `contracts.obligations` is published as an output role (writer `life.contracts`) and must be added to `templates/contracts/outputs.json`. Payments are obligations with `kind = payment`.

---

## 6. Calculation rules

- **Notice deadline** = expiry_date − notice_days, when renewal is automatic or option; stored on save so digests and filters can use it.
- **Confidentiality end** = (expiry_date, or effective_date + term when no expiry) + confidentiality_years; stored on save.
- **Family value** = total_value of the master + Σ children, per currency; children in another currency are listed separately, never converted; **change-order share** = Σ change orders ÷ family value.
- **Earliest expiry / next notice** in a family = minimum over its active members.
- **Next due** of a recurring obligation = first occurrence on or after the as-of date (as-of handling as in [Programs §7](PROGRAMS.md#7-calculation-rules)).
- **Due soon / overdue** windows from `reminder_days`.
- **Expires before milestone** = active agreement linked to a program whose key milestone end_date is after the agreement's expiry (from own milestone entries or Programs, whichever is the source).
- **Unverified** = obligations with `verified = false` or terms with `extraction_status = proposed`; never counted as confirmed in digests (shown separately).
- Bounded reads; partial reads disable totals and say so.

---

## 7. Access control and AI connections

- App-level access as usual; contract values and terms are confidential — share read-only where appropriate; database column restrictions can hide `total_value` and `amount` from some members.
- Signed originals follow platform document permissions, including whether AI may read them; extraction works only on documents the user has made AI-readable.
- The assistant the user connects (Claude or ChatGPT) reads extracted text and **proposes** records with source quotes; it never marks anything verified. Verification is a human action in the app.
- Each user's Claude and ChatGPT connections are separate access rows, set in the add-app dialog or the Access tab; defaults read and propose.

---

## 8. Customization and automations

Customization as in [Runway §8](RUNWAY.md#8-customization-users-claude-and-chatgpt): layout gear; Settings (reviewed write to `contracts.settings`) for types, obligation kinds, reminder windows, digest day; assistant for extra fields and theme (reviewed revisions).

**Optional automations:**
1. **Weekly contract digest (email, TrialAgents):** on `digest_day` 08:00 Europe/Berlin to the owner: notice deadlines and expiries in the reminder windows, obligations due and overdue, CDA confidentiality ends, unverified extractions.
2. **Extraction of new documents (research worker on the user's Claude or ChatGPT runner):** daily; for agreements with a document and `extraction_status = none`, proposes terms and obligations with source quotes; writes only `contracts.terms` / `contracts.obligations` as unverified proposals under a narrow grant, or prepares them for review.

---

## 9. Connections to other apps (by role, any install order)

| App | How it connects | What the user gets |
|---|---|---|
| **Runway (01)** | Runway already binds `agreements` (core) and links plan lines by `agreement_id`. A future Runway version adds `contracts.obligations` (payments) as an integration. | Spend lines tied to the contract they come from; contracted payments proposed as Runway lines once linked. |
| **Programs (02)** | Contracts binds `programs` (core) and `programs.plan_items` as an integration. A future Programs version can read `contracts.obligations` as an integration. | Milestone-triggered payments and obligations; "expires before milestone"; contractual deadlines on the program timeline. |
| **Fundraise (03)** | Shares `organizations`; a future Fundraise version reads CDA status from `agreements` (type cda_nda) when connected, replacing its own CDA fields. | One CDA record per investor. |
| **CRO Selection (05)** | Shares `organizations`; an award links to the resulting MSA/SOW in `agreements`. | From award to signed contract without retyping. |
| **BD Pipeline (07)** | Shares `organizations` and `agreements` (CDAs, term sheets → licences). | Partnering CDAs and licences in one register. |
| **Data Room (08)** | Data Room reads `agreements` (core): a signed CDA can be required before granting access, and key agreements feed the due-diligence index. | No access without a CDA; diligence index built from the register. |
| **Trial Finance (11)** | Reads `agreements` and `contracts.obligations` (payments) for budgets vs invoices. | Contracted amounts and schedules as the budget baseline. |
| **Diligence Q&A (12), Board (14)** | Read `agreements` for material-contract lists. | Answers and board lists from the same register. |
| **IP Portfolio (15)** | Licences (in/out) linked to patent families (future). | Which patents each licence covers. |
| **CRO Oversight (16)** | Reads `agreements` and obligations per vendor. | Deliverables checked against the contract. |

Contracts works alone; each connection follows the platform pattern (add-app dialog or in-app integration line; read-only once linked).

---

## 10. Assistant behaviour

- Extract from documents the user has made AI-readable: propose terms and obligations with exact quotes and page numbers; flag uncertainty; never mark verified.
- Answer "do we have a CDA with X?", "what renews next quarter?", "what do we owe CRO Y?" from the register.
- Draft the renewal decision note and the due-diligence list.
- Never: give legal advice or risk opinions, draft or negotiate contract language, send documents.
- **`whenToUse`:** a small biotech needs one register of its agreements with families, key dates, obligations, CDAs and reminders. **`whenNotToUse`:** drafting or negotiating contracts, e-signature, legal review, procurement and invoice matching, employment contracts.

---

## 11. Package checklist and acceptance criteria

**Package:** new `templates/source/contracts/` with build script; immutable `templates/apps/life.contracts-1.0.0.json` (draft until approved); installer roles as in §5 (`contract`, `optional`, `integration`); add the Contracts-owned optional `agreements` fields to the core contract (`MODULAR_APPS_AND_SHARED_DATA.md` §4) and registry; add `contracts.obligations` (contracts.v1) to `templates/contracts/outputs.json`; full `catalog.metadata.json` documentation; fictional `demo_data.json` (no real counterparties); `templateLayoutSchema` with seven ids; reviewed draft forms; build `--check`; browser test.

**Acceptance (beyond the shared contract):**
1. Notice deadline and confidentiality end are computed on save and match a hand-checked fictional set.
2. Family value sums master and children per currency; other currencies are listed separately.
3. Extraction by Claude **and** by ChatGPT (each via its own connection) produces proposals with quotes and pages; nothing becomes verified without a person; documents not AI-readable are reported, not guessed.
4. CDA check returns the right agreement, direction and confidentiality end.
5. Pipeline status changes are reviewed; signing prompts for the document.
6. Integration test: install Contracts alone (own milestone entries); add Programs — "Use its data" appears; choose it — milestone-linked obligations read Programs read-only; archive Programs — Contracts keeps working. Reverse order connects at install.
7. Runway installed first: Runway's plan lines can link to agreements created in Contracts (shared `agreements` table).
8. Data Room (or a custom app) can read `agreements` and `contracts.obligations` per the registry.
9. Modularity test (rule 9) and archive-first checks pass.
10. Desktop 1440 / mobile 390; family tree usable on mobile (collapsible).

**Open for design partners:** obligation kinds list; whether the pipeline (pre-signature) view is used; reminder windows.
