# CRO Bids — final app scope (BT2-05)

*Collect, compare and score outsourcing bids, then record the award.*

**Status:** Final scope for build, 12 November 2026. Part of [Biotech apps v2](../BIOTECH_v2.md) (rank 5). New major version replacing both v1 `cro-selection` 1.0.1 and `sponsor-rfp-management` 1.0.1 as `life.cro-selection` 2.0.0 (display name **CRO Bids**); `sponsor-rfp-management` is archived from the catalog when 2.0.0 is approved. No existing users.

**Depends on:** [External exchange](../../EXTERNAL_EXCHANGE.md) (per-supplier links, documents out/back, messages and clarifications, outbound email from the TrialAgents domain). Build the platform scope first.

**Governing contracts:** as for [Runway](RUNWAY.md), [Programs](PROGRAMS.md), [Fundraise](FUNDRAISE.md) and [Contracts](CONTRACTS.md), plus [modular apps and shared data](../../MODULAR_APPS_AND_SHARED_DATA.md) (core contract v1, archive first, role-based connections, add-app dialog, in-app integrations). Build against template guidance 1.3.20 or later and the contract registry.

**Decisions (12 Nov 2026):** one app with **Quick quote** and **Full RFP** modes; standard bid-grid templates per service type with sponsor assumptions as baseline, bids mapped by the connected assistant; no TrialAgents Intel longlist; suppliers answer through per-supplier exchange links (no portal accounts), sent by link or email from the TrialAgents domain; optional CDA exchange (send PDF, receive signed PDF), or link to Contracts, or skip; back-and-forth messages and shared clarifications in v1; score capability before price by default; award published as an output.

---

## 1. Evidence and references

Sources read 12 November 2026: Scientist.com, Science Exchange, ClinAI, Clinical Maestro, sourcing tools (Ply, Oracle eRFQ, SubBase, Unimarket, Medius, Beeline, RIB CX, Accruent) and CRO-selection guidance for small sponsors. Vendor and advisor sources; validate with design partners.

| Need | Signal | Confidence |
|---|---|---|
| Two modes: many small preclinical/CMC quotes vs few large clinical RFPs | Marketplaces serve quick quotes; clinical guidance: 3–5 proposals, bid defence with 2–3, decision within ~3 weeks | High |
| Standard bid grid with sponsor assumptions | Without a sponsor grid, CRO categories and drivers do not align | High |
| Side-by-side normalised comparison | Scientist.com normalises quotes into pricing, timelines and line items | High |
| Score capability before price | Guidance warns against letting price drive the decision first | Medium–high |
| Supplier answers via link, no login; upload offer as file | Ply share links, Oracle eRFQ email links, SubBase/Unimarket uploads | High |
| Private messages + shared, anonymised clarifications | Standard in sourcing tools (public/private Q&A, "Another bidder"); procurement guidance: equal information, documented | High |
| Delivery team ≠ bid team | Common sponsor dissatisfaction | Medium |

| App | Role |
|---|---|
| **Scientist.com** (primary) | Request forms, multiple quotes, normalised side-by-side comparison, proposal milestones. |
| **Science Exchange** (secondary) | One request to several suppliers; emerging-biotech sourcing. |
| **ClinAI / clinical bid-grid practice** (domain) | Templates and question libraries, bid grids, weighted scorecards, bid defence for small sponsors. |
| Sourcing tools (Ply, Medius, Beeline) | Share links, draft/resubmit, private vs public Q&A. |

---

## 2. Scope

**In:** requests in two modes; vendor longlist/shortlist on shared organizations; standard question sets and bid-grid templates; per-supplier exchange (brief, documents, response form, documents back, messages); optional CDA exchange; bid grid with deviations from assumptions; weighted criteria and reviewer scorecards with price hidden first; bid defence planning and notes; proposed delivery team; light due-diligence checklist; award decision with rationale; award output for other apps.

**Out:** supplier accounts or portal; purchasing, POs, invoices, payments; e-signature; auctions; negotiation workflow; automatic award decisions; TrialAgents Intel longlist; vendor performance during studies (CRO Oversight, 16).

**Small features that delight:**
1. **One request, many suppliers:** write once, invite 3–5 suppliers, each gets their own link and email in one confirmed send.
2. **Live response status:** opened · CDA signed · documents downloaded · draft saved · submitted (v2, 3 Mar 14:10) · unread messages.
3. **Upload-to-grid:** the connected assistant maps an uploaded bid (PDF or spreadsheet) into the bid grid and flags assumption deviations ("assumes 40% fewer monitoring visits").
4. **Realism check:** cheapest bid vs assumptions, pass-throughs and change-order risk side by side.
5. **Publish clarification:** turn any supplier question into an anonymised clarification for all suppliers in one click (with email).
6. **Blind scoring:** reviewers score capability before prices are revealed.
7. **Award handoff:** one reviewed action prepares the MSA/SOW in Contracts, proposed spend lines in Runway, study-start milestones in Programs and the vendor baseline in CRO Oversight — whichever of those apps exist.

---

## 3. Screens (7)

Custom `frontend-js` app on the Vivid kit, theme **ocean**, declared in `templateLayoutSchema` (layout gear). Four capabilities each; supplier and bid details open in the side panel.

| # | Screen (id) | Capabilities |
|---|---|---|
| 1 | **Overview** (`overview`) | (1) Open requests with mode, stage, deadline and responses received / invited. (2) Waiting on us: unread messages, unanswered questions, submissions to accept. (3) Decisions due. (4) Recent awards. |
| 2 | **Requests** (`requests`) | (1) Create a request: mode (quick quote / full RFP), service type, program/study, scope, sponsor assumptions, timeline, question set, bid-grid template, CDA option. (2) Stages: draft → RFI (optional) → RFP sent → responses → evaluation → bid defence (full RFP) → award / closed. (3) Documents out (RFP pack). (4) Request summary for leadership. |
| 3 | **Suppliers** (`suppliers`) | (1) Longlist and shortlist for the request (shared organizations, type cro / cdmo / lab / other). (2) Invite: recipient emails, create links, preview and **send email** (human-confirmed) or copy link. (3) Per-supplier status (opened, CDA, downloads, draft, submitted, messages). (4) Supplier history across past requests. |
| 4 | **Messages** (`messages`) | (1) Per-supplier private threads. (2) Clarifications log for the request (published to all, asker anonymised). (3) Reply privately or publish as clarification; post an addendum. (4) Question deadline and "unanswered" list. |
| 5 | **Bid grid** (`bids`) | (1) Sponsor baseline (assumptions and expected cost by category). (2) Each bid normalised into the template's categories; totals, pass-throughs, timeline. (3) Deviations from assumptions flagged; clarifications requested from here open a message. (4) Accept a submission or map an uploaded bid (assistant-proposed, reviewed). |
| 6 | **Evaluation** (`evaluation`) | (1) Weighted criteria (sum 100%), mandatory items. (2) Reviewer scorecards 1–5 with evidence; prices hidden until scoring is complete (switchable). (3) Ranking and spread between reviewers. (4) Bid defence (full RFP): agenda, attendees, notes, proposed delivery team, due-diligence checklist. |
| 7 | **Award & settings** (`award`) | (1) Decision: selected supplier, rationale, approver, date; unsuccessful suppliers listed. (2) Award handoff to connected apps (reviewed). (3) Templates: question sets, bid-grid templates, criteria sets, confidentiality text, email texts. (4) Links to Access and Automations. |

Shared behaviours, chart rules and states as in [Runway §3](RUNWAY.md#3-screens-7). Integration lines follow the platform pattern.

---

## 4. Workflows

1. **Quick quote (preclinical/CMC).** New request → quick quote → scope, assumptions and 3–8 questions → choose 2–5 suppliers → send (email or link). Suppliers reply with price, timeline and a quote file. Compare side by side, pick, record the award. Typical: days.
2. **Full RFP (clinical).** Optional RFI first (short capability questionnaire) → shortlist → RFP with pack (synopsis, bid-grid template, timeline, question set) → CDA step if chosen → supplier questions until the question deadline, answered privately or published as clarifications → submissions (drafts, resubmits) until the deadline → accept and map into the bid grid → blind scoring → bid defence with 2–3 → decision → award handoff. Typical: 4–8 weeks.
3. **CDA options (per request):** (a) **Send CDA PDF:** upload the CDA; each supplier downloads it and uploads the signed copy in the "Signed CDA" slot; owner accepts; optionally RFP documents stay locked until accepted. (b) **Use Contracts:** when Contracts is connected, the signed CDA is filed as an agreement (type cda_nda) and the gate checks it. (c) **Skip:** handled elsewhere (e.g. DocuSign); a checkbox "CDA in place" per supplier with an optional date.
4. **Messages.** Supplier asks on their page → owner sees it under Messages → reply privately or publish as clarification (all suppliers get an email; asker anonymised) → all logged.
5. **Award handoff.** On award, one reviewed action proposes: agreement (MSA/SOW) in Contracts, spend lines and payment schedule in Runway, study-start milestones in Programs, vendor and baseline in CRO Oversight — only for apps present and connected; otherwise the award record stays for later use.

---

## 5. Data model

Principles as in [Runway §5](RUNWAY.md#5-data-model). Own tables use contract `crobids.v1`.

**Shared and integration roles**

| Role | Contract | Mode | Use |
|---|---|---|---|
| `organizations` | core.v1 | read/write | Suppliers (`org_type` cro / cdmo / other) |
| `people` | core.v1 | optional, read/write | Supplier contacts (recipient emails) |
| `programs` | core.v1 | optional, read/write | Request context |
| `studies` | core.v1 | optional, read/write | Clinical requests |
| `agreements` | core.v1 | optional, read/write | CDA filing and award agreement (core fields only; Contracts-owned fields are left to Contracts) |

**Own tables (`crobids.*`)**

| Table | Key fields (kind) |
|---|---|
| `crobids.settings` (one row) | default_currency (select), blind_scoring (boolean, true), question_deadline_days (number, 7), confidentiality_text (text), email_templates (text) |
| `crobids.templates` | name (text*), kind (select*: question_set / bid_grid / criteria_set), service_type (select: clinical_study / preclinical_study / cmc / bioanalytical / other), content (text, JSON: questions, grid categories with units, or criteria with weights), archived (boolean) |
| `crobids.requests` | name (text*), mode (select*: quick_quote / full_rfp), service_type (select*), program_id (text), study_id (text), scope (text*), assumptions (text, JSON: e.g. sites, patients, months, visits), currency (select*), stage (select*: draft / rfi / rfp_sent / responses / evaluation / bid_defence / awarded / closed), cda_option (select*: send_pdf / contracts / skip / none), cda_gate (boolean), question_deadline (date), response_deadline (date*), decision_due (date), owner (text), exchange_group_id (text), question_set_id (text), grid_template_id (text), criteria_set_id (text), archived (boolean) |
| `crobids.invitations` | request_id (text*), organization_id (text*), contact_ids (text, comma list of people IDs), recipient_emails (text*), exchange_id (text), status (select*: longlist / invited / declined / submitted / shortlisted / not_selected / awarded), cda_status (select: not_needed / sent / signed / in_place_elsewhere), cda_in_place_on (date), agreement_id (text), notes (text) |
| `crobids.bids` | invitation_id (text*), version (number*), submitted_on (date*), source (select*: exchange / manual / assistant_mapped), total (money), pass_through (money), currency (select*), start_weeks (number), duration_months (number), answers (text, JSON: question → answer), assumptions_delta (text), accepted (boolean), notes (text) |
| `crobids.bid_lines` | bid_id (text*), category (text*), description (text), units (number), unit_cost (money), amount (money*), currency (select*), deviation (text) |
| `crobids.criteria` | request_id (text*), name (text*), category (select: scientific / operational / quality / commercial / relationship), weight (number*), mandatory (boolean) |
| `crobids.scores` | request_id (text*), invitation_id (text*), criterion_id (text*), reviewer (text*), score (number*, 1–5), evidence (text) |
| `crobids.awards` (output) | request_id (text*), organization_id (text*), service_type (select*), program_id (text), study_id (text), total (money), currency (select*), start_date (date), duration_months (number), rationale (text*), approver (text*), decided_on (date*), delivery_team (text), handoff_status (text) |

`*` = required. Messages, clarifications, documents out/back and access events live in the platform exchange, referenced by `exchange_group_id` / `exchange_id`. `crobids.awards` is published as output (writer `life.cro-selection`) in `templates/contracts/outputs.json`.

---

## 6. Calculation rules

- **Bid total** = Σ bid_lines (same currency) or the stated total when lines are absent; other currencies are listed, never converted.
- **Baseline deviation** per category = bid amount − sponsor baseline; % of baseline; lines with assumption deltas flagged.
- **Weighted score** per supplier = Σ (mean reviewer score per criterion × weight) ÷ 100; a mandatory criterion below 3 marks the supplier "fails mandatory". **Reviewer spread** = max − min per criterion.
- **Blind scoring**: price columns hidden in Evaluation until every reviewer has scored every shortlisted supplier, or the owner reveals.
- **Response status** from exchange events (opened, acknowledged, downloaded, draft, submitted version, unread messages).
- **Deadlines**: questions after `question_deadline` are still received but flagged "late question"; submissions close at `response_deadline` (exchange expiry).
- As-of handling as in Programs §7; bounded reads.

---

## 7. Access control and AI

- App-level access as usual; bids and prices are confidential. Sending to suppliers requires the new Access right "Send to people outside the workspace".
- Claude and ChatGPT connections (each user's, separate rows) can read accepted submissions, messages and clarifications the user can read; **cannot read unaccepted uploads**; can draft questions, emails, replies, clarifications and bid-grid mappings; **cannot send email, publish clarifications or accept submissions** — a person confirms each.
- Supplier recipients see only their own exchange page and published clarifications; never other suppliers or prices.

---

## 8. Customization and automations

Customization as in [Runway §8](RUNWAY.md#8-customization-users-claude-and-chatgpt): layout gear; Settings and Templates (reviewed writes) for question sets, bid-grid templates, criteria sets, confidentiality and email texts; assistant for extra fields and theme.

**Optional automations:**
1. **Deadline reminders (exchange email):** 3 days and 1 day before the response deadline to invited suppliers who have not submitted — prepared automatically, **sent only after the owner confirms** the batch (or the owner pre-approves reminders for this request when sending the invitation).
2. **Request digest (email to the owner):** daily while a request is open: new submissions, messages, questions waiting.
3. **Bid mapping (research worker on the user's Claude or ChatGPT runner):** for accepted submissions with an uploaded bid file, propose bid lines and deviations for review.

---

## 9. Connections to other apps (by role, any install order)

| App | How | What the user gets |
|---|---|---|
| **Contracts (04)** | Shares `organizations`, `agreements`; CDA option "Use Contracts"; award handoff prepares the MSA/SOW agreement | CDA and award contract in one register |
| **Runway (01)** | Future Runway version reads `crobids.awards` as an integration; handoff proposes spend lines when Runway is present | Awarded cost and schedule in the cash forecast |
| **Programs (02)** | Handoff proposes study-start milestones when Programs is present (Programs writes them) | Award → timeline |
| **CRO Oversight (16)** | Reads `crobids.awards` (vendor, scope, baseline) | Oversight starts from the awarded baseline |
| **Trial Finance (11)** | Reads awards and bid lines as budget baseline (later) | Budget vs invoices from day one |
| **Fundraise (03), BD Pipeline (07)** | Share `organizations` | One record per company across apps |

Handoff writes are always prepared for the owning app's review; CRO Bids never writes another app's own tables.

---

## 10. Assistant behaviour

- Draft the request (scope, assumptions, questions) from a protocol synopsis or notes the user shares.
- Map uploaded bids into the grid with deviations; summarise differences between bids.
- Draft supplier emails, private replies, clarifications and the award rationale.
- Never: send email, publish clarifications, accept submissions, choose the winner, or give legal advice.
- **`whenToUse`:** a small biotech sources preclinical, CMC or clinical services and needs to send requests, collect and compare bids, talk to suppliers and record the award. **`whenNotToUse`:** purchasing and payments, contract drafting, vendor performance management during studies, supplier marketplaces.

---

## 11. Package checklist and acceptance criteria

**Package:** new major version under `templates/source/cro-selection/` (archive 1.0.1); immutable `templates/apps/life.cro-selection-2.0.0.json` (draft until approved); mark `sponsor-rfp-management` for catalog archival on approval; installer roles as in §5; `crobids.awards` in the registry; default templates (question sets for quick quote and clinical RFP; bid-grid templates for clinical study, preclinical study, CMC; one criteria set) as fictional examples; full `catalog.metadata.json` documentation; fictional `demo_data.json`; `templateLayoutSchema` with seven ids; build `--check`; browser test.

**Acceptance (beyond the shared contract and [External exchange §4](../../EXTERNAL_EXCHANGE.md#4-acceptance-criteria)):**
1. Quick quote end to end: 3 suppliers invited by email in one confirmed send; 2 submit with files; comparison and award recorded.
2. Full RFP end to end: RFI → shortlist → RFP pack → CDA (send PDF) with gate → private question and published clarification (anonymised, emailed to all) → draft and resubmission → deadline closes → accept and map → blind scoring → bid defence notes → award.
3. CDA via Contracts: signed CDA filed as agreement; gate checks it. CDA skip: "in place elsewhere" recorded, no gate.
4. Bid grid totals and deviations match a hand-checked fictional set; other currencies listed, not converted.
5. Blind scoring hides prices until all scores are in or the owner reveals.
6. Assistants can draft but not send, publish or accept; unaccepted uploads are unreadable to them.
7. Award handoff with Contracts, Runway and Programs present prepares reviewed proposals in each; with none present, the award stays and nothing errors.
8. Modularity test (rule 9) and archive-first checks; archiving the app stops supplier links.
9. Desktop 1440 / mobile 390 for the app and the supplier page.

**Open for design partners:** default question sets per service type; whether RFI is used separately; whether reminders should be pre-approved by default.
