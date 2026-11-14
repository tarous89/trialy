# CRO Selection — final app scope (BT2-05)

*Choose CROs, CDMOs and labs: from the need to a signed award and a clean handover.*

**Status:** Final scope for build, 13 November 2026 (supersedes the 12 Nov "CRO Bids" draft). Part of [Biotech apps v2](../BIOTECH_v2.md) (rank 5). New major version `life.cro-selection` 2.0.0, display name **CRO Selection**, replacing v1 `cro-selection` 1.0.1 and `sponsor-rfp-management` 1.0.1 (the latter is archived from the catalog when 2.0.0 is approved). No existing users.

**Depends on:** the platform [external exchange](../../EXTERNAL_EXCHANGE.md) as implemented in PR #147 (template guidance 1.3.22: `tools.call('exchange.*')`). Merge #147 before building.

**Governing contracts:** project context, template authoring and usage guidance (1.3.22 or later, all `nextOffset`s), shared build contract, interface rules, access control, write authorization, field capabilities, shared data, [modular apps and shared data](../../MODULAR_APPS_AND_SHARED_DATA.md) (core contract v1, archive first, role-based connections, add-app dialog, in-app integrations), platform documents inside apps, and the contract registry. They win on any conflict.

**Decisions (12–13 Nov 2026):** name **CRO Selection** (covers the whole journey, not only bids); one app with **Quick quote** and **Full selection** modes; standard bid-grid templates with sponsor assumptions as baseline, bids mapped by the connected assistant; no TrialAgents Intel longlist; suppliers answer through per-supplier exchange links (no accounts), invited by email from `no-reply@trialagents.com` ("<Organization> at TrialAgents" or "<First name> at TrialAgents", editable) with default texts that users or assistants can edit and personalise; optional CDA exchange (send PDF, receive signed PDF), or use Contracts, or skip; private messages and anonymised clarifications in v1; score capability before price by default; award published as an output.

**Decisions (13 Nov 2026, owner, after the first build):** one confirmation when something goes out (platform exchange, guidance 1.3.23): preparing a round, links and documents applies on click, and the send, reply, notice or acceptance review also carries the supplier's status change; simpler revisions (only the latest submission per supplier is shown and accepted); simpler supplier feedback (one *Notify all* review with a winner text and one text for the others, which includes the debrief line; messages stay open after the deadline); simpler emails (one editable invitation text per request kind; other email types use the platform defaults); default templates built in (questions and cost categories edited on the request, no template library or table); blind scoring off by default (setting); qualification for any supplier at any stage; CDA keeps all three options. Not changed: RFI round, bid defence, handoff, scheduled reminders.

---

## 1. The journey

| # | Stage | Quick quote | Full selection | What the app does |
|---|---|---|---|---|
| 1 | **Need** | ✓ (short) | ✓ | Scope, service type, program/study, sponsor assumptions, target timeline, budget estimate |
| 2 | **Longlist** | ✓ | ✓ | Pick vendors from the shared organizations list and past requests; add new ones (assistant can research and propose) |
| 3 | **RFI** | — | optional | Short capability questionnaire via exchange; shortlist from answers |
| 4 | **RFP / request** | ✓ (few questions) | ✓ (full pack) | Exchange per supplier: brief, documents, questions, bid grid, CDA step, deadline |
| 5 | **Questions** | ✓ | ✓ | Private replies or anonymised clarifications to all; addenda |
| 6 | **Proposals** | ✓ | ✓ | Drafts and resubmissions until deadline; accept; map into the bid grid |
| 7 | **Evaluation** | light | ✓ | Weighted criteria, blind scoring, qualification checklist (quality, references, financial) |
| 8 | **Bid defence** | — | ✓ (2–3 suppliers) | Agenda, attendees, notes, proposed delivery team |
| 9 | **Decision** | ✓ | ✓ | Selected supplier, rationale, approver; notify unsuccessful suppliers, offer debrief |
| 10 | **Contract & onboarding** | light | ✓ | Contract status (Contracts if used), kick-off checklist, delivery team confirmed; handover to CRO Oversight |

Typical duration: quick quote days; full selection 4–8 weeks (decision usually within ~3 weeks of bid defence).

---

## 2. Evidence and references

Sources read 12–13 November 2026: Scientist.com, Science Exchange, ClinAI, Clinical Maestro, sourcing tools (Ply, Oracle eRFQ, SubBase, Unimarket, Medius, Beeline, RIB CX, Accruent) and CRO-selection guidance for small sponsors. Vendor and advisor sources; validate with design partners.

| Need | Signal | Confidence |
|---|---|---|
| Two modes: many small preclinical/CMC quotes vs few large clinical selections | Marketplaces serve quick quotes; clinical guidance: 3–5 proposals, bid defence with 2–3 | High |
| Standard bid grid with sponsor assumptions | Without one, CRO cost categories and drivers do not align | High |
| Normalised side-by-side comparison | Scientist.com normalises pricing, timelines and line items | High |
| Score capability before price | Guidance warns against price-first decisions | Medium–high |
| Supplier answers via link without login; upload offer as file | Ply, Oracle eRFQ, SubBase, Unimarket | High |
| Private messages + anonymised clarifications | Standard in sourcing tools; equal information for all bidders | High |
| Delivery team ≠ bid team; qualification before award | Common sponsor dissatisfaction; playbooks include due diligence and onboarding | Medium |

| Reference | Role |
|---|---|
| **Scientist.com** (primary) | Request forms, multiple quotes, normalised comparison, proposal milestones |
| **Science Exchange** (secondary) | One request to several suppliers; emerging-biotech sourcing |
| **ClinAI / CRO-selection playbooks** (domain) | Templates, question libraries, bid grids, scorecards, bid defence, due diligence, onboarding |
| Sourcing tools | Share links, draft/resubmit, private vs public Q&A |

---

## 3. Scope

**In:** the ten-stage journey above in two modes; vendor directory on shared organizations with history across requests; question sets, bid-grid templates and criteria sets; supplier communication only through the platform exchange; optional CDA exchange; bid grid with deviations; blind weighted scoring; qualification and onboarding checklists; bid defence; decision with notifications to all suppliers; award output and reviewed handoffs.

**Out:** supplier accounts or portal; purchasing, POs, invoices, payments; e-signature; auctions; negotiation workflow; automatic award decisions; TrialAgents Intel longlist; vendor performance during studies (CRO Oversight, 16).

**Small features that delight:**
1. **One request, many suppliers:** write once; each supplier gets its own link and an email built from the default text, edited or personalised (by the user or assistant) in one confirmed send.
2. **Live status per supplier:** opened · verified · CDA signed · documents downloaded · draft saved · submitted (v2, 3 Mar 14:10) · unread messages.
3. **Upload-to-grid:** the connected assistant maps an accepted bid file into the grid and flags deviations ("assumes 40% fewer monitoring visits").
4. **Realism check:** cheapest bid vs assumptions, pass-throughs and change-order risk side by side.
5. **One-click clarification:** turn any supplier question into an anonymised clarification for everyone, with email.
6. **Blind scoring:** prices hidden until all reviewers have scored.
7. **Fair close:** after the decision, unsuccessful suppliers get a courteous note (default text, editable) and a debrief offer; the winner gets next steps.
8. **Award handoff:** one reviewed action prepares the agreement in Contracts, spend lines in Runway, study-start milestones in Programs and the baseline in CRO Oversight — for whichever apps exist.

---

## 4. Screens (8)

Custom `frontend-js` app on the Vivid kit, theme **ocean**, declared in `templateLayoutSchema` (layout gear). Four capabilities each; vendor, proposal and message details open in the side panel.

| # | Screen (id) | Capabilities |
|---|---|---|
| 1 | **Overview** (`overview`) | (1) Requests by stage with mode, deadline, responses received / invited. (2) Waiting on us: unread messages, unanswered questions, submissions and files to accept. (3) Decisions and onboarding items due. (4) Recent awards. |
| 2 | **Requests** (`requests`) | (1) New request: mode, service type, program/study, scope, assumptions, budget estimate, timeline, question set, grid template, criteria set, CDA option and gate. (2) Journey stepper per request (stages §1) with the next action. (3) Documents out (RFP pack) from platform documents. (4) Request summary for leadership. |
| 3 | **Vendors** (`vendors`) | (1) Directory (shared organizations: cro / cdmo / lab / other) with services, regions, history, past scores and awards. (2) Longlist and shortlist per request. (3) Invite: recipients, create exchanges, email send review (default text, batch edit, per-supplier personalisation, display name) or copy link. (4) Live status per supplier. |
| 4 | **Messages** (`messages`) | (1) Private threads per supplier. (2) Clarifications and addenda for the request. (3) Reply privately or publish as clarification (human-confirmed). (4) Question deadline and unanswered list. |
| 5 | **Proposals** (`proposals`) | (1) Sponsor baseline by cost category. (2) Each accepted proposal normalised into the grid; totals, pass-throughs, timeline. (3) Deviations flagged; request clarification from a cell (opens a message). (4) Accept submissions and files; map uploaded bids (assistant-proposed, reviewed). |
| 6 | **Evaluation** (`evaluation`) | (1) Weighted criteria and mandatory items. (2) Reviewer scorecards 1–5 with evidence; blind until complete (switchable). (3) Qualification checklist per supplier (quality audit, references, financial, insurance, data protection) with evidence documents. (4) Bid defence: agenda, attendees, notes, proposed delivery team. |
| 7 | **Decision & onboarding** (`decision`) | (1) Decision: supplier, rationale, approver, date. (2) Notify all suppliers (winner and unsuccessful) with default texts. (3) Onboarding checklist (contract signed, quality agreement, kick-off, team confirmed, systems access) with contract status from Contracts when connected. (4) Award handoff to connected apps. |
| 8 | **Settings** (`settings`) | (1) Templates: question sets, bid-grid templates, criteria sets, checklists. (2) Email default texts per exchange email type and request kind (RFI, RFP, quick quote). (3) Confidentiality text, blind scoring, question-deadline default, currency. (4) Links to Access and Automations. |

---

## 5. Workflows

1. **Quick quote:** Requests → quick quote → scope, assumptions, 3–8 questions → Vendors: pick 2–5 → create exchanges and send → suppliers reply with price, timeline, quote file → accept → compare → decide → notify all → award.
2. **Full selection:** Need → longlist → optional RFI group (questionnaire) → shortlist → RFP group (pack, bid-grid template, CDA step) → questions until the question deadline → submissions until the response deadline → accept and map → blind scoring + qualification → bid defence with 2–3 → decision → notify → contract and onboarding → handoff.
3. **CDA options (per request):** *Send PDF* — CDA shared as a document; "Signed CDA" requested-document slot; owner accepts; optional gate "signed document required" locks the RFP pack until accepted. *Use Contracts* — the accepted signed CDA is filed as an agreement (cda_nda) through Contracts' reviewed path and the invitation links to it. *Skip* — "CDA in place elsewhere" per supplier with optional date; gate off or click-through only.
4. **Messages:** supplier asks on their page → owner replies privately or publishes a clarification (anonymised, emailed to all) → logged.
5. **Decision and close:** decision saved → notification batch prepared (winner: next steps; others: thank-you + debrief offer) as private messages with email → human-confirmed → exchanges extended for messages only if debriefs are offered, otherwise left to expire.
6. **Onboarding and handoff:** checklist until kick-off; handoff proposals prepared for Contracts, Runway, Programs and CRO Oversight; request moves to *Closed*.

---

## 6. Platform exchange usage

| Need | Exchange feature (guidance 1.3.22) |
|---|---|
| RFI and RFP as separate rounds | One **exchange group** per round (`exchange.createGroup`), each with its own brief, documents, form, gate and `emailDefaults`; one **exchange** per supplier bound to the `invitations` record (`exchange.invite` with `recordId`) |
| RFP pack | `exchange.shareDocuments` with platform documents (uploaded via `data-trialy-document="upload rfp_pack"`) |
| Signed CDA back | `exchange.requestDocument` slot "Signed CDA"; gate *signed document required* when chosen |
| Answers and prices | Group response form (questions + fields mapped to `proposals`); up to 10 files, 25 MB each |
| Accepting | `exchange.acceptSubmission` (`target:"new"` into `proposals`, linked to the invitation) and `exchange.acceptFile` (becomes a document; AI-readable choice at acceptance) |
| Messages | `exchange.reply` (private), `exchange.publishClarification` (anonymised to the group) |
| Emails | Platform types invitation, reminder, clarification, message, extended, revoked; app supplies defaults per type **per group kind** (RFI / RFP / quick quote); decision notices are private messages (type *message*) using the app's default decision texts; send review from `exchange.prepareEmail` shown exactly as returned; `exchange.sendEmail` human-confirmed |
| Status | `exchange.status` per supplier, shown live; links never copied into the app or assistant text |
| Deadlines | Exchange expiry = response deadline; `exchange.extend` when needed |

All exchange writes come from a click or submit, one per action, and return `review_required`; a person confirms. Assistants can prepare the same operations but never send, publish or accept.

---

## 7. Data model

Principles as in [Runway §5](RUNWAY.md#5-data-model). Own tables use contract `croselection.v1`.

**Shared roles**

| Role | Contract | Mode | Use |
|---|---|---|---|
| `organizations` | core.v1 | read/write | Vendors (`org_type` cro / cdmo / lab / other) |
| `people` | core.v1 | optional, read/write | Vendor contacts (recipients) |
| `programs` | core.v1 | optional, read/write | Request context |
| `studies` | core.v1 | optional, read/write | Clinical requests |
| `agreements` | core.v1 | optional, read/write (core fields only) | CDA and award agreement references; Contracts-owned fields are left to Contracts |

**Own tables (`croselection.*`)**

| Table | Key fields (kind) |
|---|---|
| `croselection.settings` (one row) | default_currency (select), blind_scoring (boolean, default off), question_deadline_days (number, 7), confidentiality_text (text), decision_texts (text, JSON: winner / others), invitation_texts (text, JSON: one invitation subject and body per request kind) |
| `croselection.requests` | name (text*), mode (select*: quick_quote / full_selection), service_type (select*), program_id (text), study_id (text), scope (text*), assumptions (text, JSON), budget_estimate (money), currency (select*), stage (select*: need / longlist / rfi / rfp / questions / proposals / evaluation / bid_defence / decision / onboarding / closed), cda_option (select*: send_pdf / contracts / skip / none), cda_gate (boolean), question_deadline (date), response_deadline (date*), decision_due (date), owner (text), rfi_questions (text, one per line), questions (text, one per line), cost_categories (text, one per line), archived (boolean) |
| `croselection.invitations` | request_id (text*), organization_id (text*), contact_ids (text), recipient_emails (text*), status (select*: longlist / rfi_invited / shortlisted / rfp_invited / declined / submitted / finalist / not_selected / selected), cda_status (select: not_needed / sent / signed / in_place_elsewhere), cda_in_place_on (date), cda_agreement_id (text), notes (text) |
| `croselection.proposals` | invitation_id (text*), round (select*: rfi / rfp / quote), version (number*), submitted_on (date*), source (select*: exchange / manual / assistant_mapped), total (money), pass_through (money), currency (select*), start_weeks (number), duration_months (number), answers (text, JSON), assumptions_delta (text), document_ids (text), accepted_on (date), notes (text) |
| `croselection.proposal_lines` | proposal_id (text*), category (text*), description (text), units (number), unit_cost (money), amount (money*), currency (select*), deviation (text) |
| `croselection.criteria` | request_id (text*), name (text*), category (select: scientific / operational / quality / commercial / relationship), weight (number*), mandatory (boolean) |
| `croselection.scores` | request_id (text*), invitation_id (text*), criterion_id (text*), reviewer (text*), score (number*, 1–5), evidence (text) |
| `croselection.checklist_items` | request_id (text*), invitation_id (text), scope (select*: qualification / bid_defence / onboarding), item (text*), owner (text), due (date), status (select*: open / done / not_applicable / issue), evidence_document_id (text), notes (text) |
| `croselection.awards` (output) | request_id (text*), organization_id (text*), service_type (select*), program_id (text), study_id (text), total (money), currency (select*), start_date (date), duration_months (number), rationale (text*), approver (text*), decided_on (date*), delivery_team (text), agreement_id (text), onboarding_status (select: in_progress / complete), handoff_status (text) |

`*` = required. Rounds, links, messages, clarifications, documents out/back, email batches and access events stay in the platform exchange: rounds are found by their app reference (`request:<id>:rfi|rfp`), links by the invitation they are bound to; no exchange IDs are copied into records. Publish `croselection.awards` (writer `life.cro-selection`) in `templates/contracts/outputs.json`.

---

## 8. Calculation rules

- **Proposal total** = Σ proposal_lines in one currency, or the stated total when lines are absent; other currencies listed, never converted.
- **Deviation** per category = proposal amount − sponsor baseline, and % of baseline; lines with assumption deltas flagged.
- **Weighted score** = Σ (mean reviewer score × weight) ÷ 100; a mandatory criterion below 3 marks "fails mandatory"; **reviewer spread** = max − min per criterion.
- **Blind scoring:** price columns hidden in Evaluation until every reviewer has scored every finalist, or the owner reveals.
- **Response status** from `exchange.status`; **latest proposal** = highest accepted version per invitation and round.
- **Deadlines:** late questions flagged; submissions close at the exchange expiry.
- **Qualification ready** = all qualification items done or not applicable; an *issue* blocks "selected" until resolved or overridden with a reason.
- As-of handling as in Programs §7; bounded reads.

---

## 9. Access control and AI

- App-level access as usual; proposals and prices are confidential. Exchange sends need the Access right "Send to people outside the workspace".
- Claude and ChatGPT (each user's connection) read accepted proposals, messages and clarifications the user can read; never unaccepted uploads or values; never recipient links. They draft requests, questions, emails, replies, clarifications, mappings, decision notes and onboarding checklists; they cannot send, publish, accept or decide.
- Suppliers see only their own exchange page and published clarifications.

---

## 10. Customization and automations

Customization paths as in [Runway §8](RUNWAY.md#8-customization-users-claude-and-chatgpt). Templates and email texts are reviewed writes; workspace email defaults are saved in the platform exchange (`exchange.saveDefaultEmail`).

**Optional automations:**
1. **Deadline reminders:** 3 days and 1 day before the response deadline to suppliers who have not submitted, using the saved reminder text; the owner pre-approves them when sending the invitation (platform scheduled reminders), otherwise they are prepared for confirmation.
2. **Request digest (email to the owner):** daily while a request is open: submissions, messages, questions waiting, items due.
3. **Proposal mapping (research worker on the user's Claude or ChatGPT runner):** for accepted proposal files, propose proposal lines and deviations for review.

---

## 11. Connections to other apps (by role, any install order)

| App | How | What the user gets |
|---|---|---|
| **Contracts (04)** — published 1.0.0 | Shares `organizations`, `agreements`; CDA option "Use Contracts"; onboarding reads the award agreement's status; handoff prepares the MSA/SOW in Contracts' reviewed path | CDA and award contract in one register |
| **Runway (01)** | Future Runway version reads `croselection.awards` as an integration; handoff proposes spend lines when Runway is present | Awarded cost in the cash forecast |
| **Programs (02)** | Handoff proposes study-start milestones (Programs writes them) | Award → timeline |
| **CRO Oversight (16)** | Reads `croselection.awards` (vendor, scope, baseline, delivery team) | Oversight starts from the awarded baseline |
| **Trial Finance (11)** | Reads awards and proposal lines as budget baseline (later) | Budget vs invoices from day one |
| **Fundraise (03), Partnerships (07)** | Share `organizations` | One record per company |

CRO Selection never writes another app's own tables; handoffs are proposals in the owning app's reviewed path.

---

## 12. Assistant behaviour

- Draft the request from a protocol synopsis or notes; propose a longlist with sources when asked.
- Map accepted proposal files into the grid with deviations; summarise differences.
- Personalise supplier emails from the default texts; draft replies, clarifications, decision notes and onboarding checklists.
- Never: send, publish, accept, choose the winner, or give legal advice.
- **`whenToUse`:** a small biotech chooses a CRO, CDMO or lab: define the need, invite suppliers, answer questions, compare proposals, score, decide, notify and hand over. **`whenNotToUse`:** purchasing and payments, contract drafting, vendor performance during studies, supplier marketplaces.

---

## 13. Package checklist and acceptance criteria

**Package:** major version under `templates/source/cro-selection/` (1.0.1 kept immutable); `templates/apps/life.cro-selection-2.0.0.json` (draft until approved); mark `sponsor-rfp-management` for catalog archival on approval; roles as in §7; `croselection.awards` in the registry; fictional default templates (question sets: quick quote, RFI, clinical RFP; bid grids: clinical study, preclinical study, CMC; one criteria set; qualification and onboarding checklists); email defaults per exchange type and request kind; full `catalog.metadata.json` documentation; fictional `demo_data.json`; `templateLayoutSchema` with eight ids; build `--check`; browser test.

**Acceptance (beyond the shared contract and the exchange's own tests):**
1. Quick quote end to end: 3 suppliers invited in one confirmed send (default text, one personalised by the assistant; preview identical to what is sent); 2 submit with files; accept; compare; decide; notify all.
2. Full selection end to end: RFI group → shortlist → RFP group with pack and CDA (send PDF, gate on) → private reply and published clarification (anonymised, emailed) → draft and resubmission → deadline → accept and map → blind scoring + qualification → bid defence → decision → notifications → onboarding → handoff.
3. CDA via Contracts files the signed CDA as an agreement; CDA skip records "in place elsewhere".
4. Grid totals and deviations match a hand-checked fictional set; other currencies listed, not converted.
5. Blind scoring hides prices until complete or revealed; qualification issue blocks "selected" without an override reason.
6. Assistants can draft but not send, publish, accept or decide; unaccepted uploads unreadable; links never shown.
7. Handoff with Contracts, Runway and Programs present prepares reviewed proposals in each; with none present, the award stays and nothing errors.
8. Modularity test (rule 9) and archive-first checks; archiving the app stops supplier links; restore re-enables unexpired ones.
9. Desktop 1440 / mobile 390.

**Open for design partners:** default question sets and checklists per service type; whether the RFI round is used; debrief practice.
