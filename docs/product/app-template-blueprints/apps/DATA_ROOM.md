# Data Room — final app scope (BT2-08)

*Prepare, share and track data rooms for financing, licensing, partnering and M&A, with diligence Q&A built in.*

**Status:** Final scope for build, 13 November 2026. Part of [Biotech apps v2](../BIOTECH_v2.md) (rank 8). New template `life.data-room` 1.0.0, display name **Data Room**. It also takes over the scope of **Diligence Q&A (BT2-12)**: Q&A belongs to the room, so BT2-12 is no longer a separate app. No existing users.

**Depends on:** the platform [external exchange](../../EXTERNAL_EXCHANGE.md) (PR #147, guidance 1.3.22) **plus the room extension in [External exchange §5](../../EXTERNAL_EXCHANGE.md#5-room-extension-for-data-room)**. Build it as two PRs: **(A)** the platform room extension, **(B)** this app on top of it.

**Governing contracts:** project context, template authoring and usage guidance (latest, all `nextOffset`s), shared build contract, interface rules, access control, write authorization, field capabilities, shared data, [modular apps and shared data](../../MODULAR_APPS_AND_SHARED_DATA.md) (core contract v1, archive first, role-based connections, the data access step, in-app integrations), platform documents inside apps, and the contract registry. They win on any conflict.

**Decisions (13 Nov 2026):**
- **Hosted rooms by default.** Parties open a private TrialAgents link and every open and download is recorded.
- **External room option.** For teams already on DocSend, ShareVault or Drive, the room is an index, checklist and access list only, with engagement entered by hand or by the assistant from the provider's reports.
- **Access levels.** Two standard levels, *Non-confidential* and *Confidential*, plus custom levels the owner adds (e.g. "Full diligence", "CMC").
- **Q&A, no messages.** Q&A is part of the room; the recipient page has no free messages tab.
- **All deal types.** One app covers financing, licensing, partnering/BD and M&A rooms.
- **Built-in email.** Sharing with external investors, partners and shareholders by email, and email notifications, are built in. Emails come from `no-reply@trialagents.com` under the display name "<Organization> at TrialAgents" or "<First name> at TrialAgents" (editable), using default texts that users and assistants can edit and personalise.
- **Data room writes `dataroom.v1`.** The data room is the writer of the `dataroom.access_grants` and `dataroom.engagement` outputs that Fundraise and BD Pipeline read.

---

## 1. The journey

| # | Stage | What the app does |
|---|---|---|
| 1 | **Set up** | Room purpose (financing / licensing / partnering / M&A / other), linked program(s) or round, hosted or external, levels, entry step (click-through or signed CDA) |
| 2 | **Prepare** | Standard biotech index and checklist weighted for the purpose; owners and due dates per missing item; readiness score |
| 3 | **Fill** | Attach platform documents to index items; set the level and view-only per document; new versions keep their place |
| 4 | **Invite** | Pick parties (organizations and people); one private link per person; email from the default text (edited or personalised) in one confirmed send |
| 5 | **Entry step** | Click-through confidentiality or a signed CDA (send PDF / Contracts / in place elsewhere) before the Confidential level opens |
| 6 | **Review** | Parties browse the numbered index, view or download; every open, view and download is logged per person and per document version |
| 7 | **Q&A** | Parties ask questions (optionally against a section or document); the team assigns, drafts, approves and answers privately or publishes to the room |
| 8 | **Expand** | Move a party to a higher level as the deal advances; add documents; parties are notified of new and updated documents |
| 9 | **Close** | Revoke or let access end; keep the full record of what was disclosed to whom, and when |

---

## 2. Evidence and references

Sources read 13 November 2026: ShareVault (life-science pages, partnering guide, checklist), DocSend (biotech customer stories, data-room analytics), Papermark, Peony (biotech 9-folder guide, partnering playbook, startup checklist), Visible (DocSend comparison) and Series A data-room guidance. These are vendor and advisor sources; validate with design partners.

| Need | Signal | Confidence |
|---|---|---|
| Know who opened what, and how often | Founders' main reason for DocSend; Visible ties data-room engagement to the investor pipeline | High |
| Link per party + NDA step, no login | DocSend, Papermark and Peony all lead with link sharing and NDA gating | High |
| Staged disclosure | ShareVault: start with a limited set, expand with serious interest; non-confidential deck first; manufacturing data late | High |
| Standard biotech index, weighted by deal type | Common 9-section structure; financing weights deck, financials, IP and platform; licensing weights clinical, regulatory and CMC; M&A weights regulatory, CMC and commercial | High |
| One document set, many rooms | Advisors recommend one maintained document backbone with a room per deal | Medium–high |
| Structured diligence Q&A in the room | Ansarada, Peony Smart Q&A and DocSend's 2026 DD tracker | Medium–high |
| Watermarking, screenshot blocking, eCTD viewer | ShareVault and Papermark offer them; mainly asked for in licensing and M&A, rarely at seed or Series A | Medium → out of v1 |
| Plain Drive or Dropbox links are not enough | Dropbox ended Send and track on 31 Mar 2025, so plain links carry no reading data | High |

| Reference | Role |
|---|---|
| **ShareVault** (domain) | Life-science room structure, staged access, partnering and licensing practice |
| **DocSend / Papermark / Peony** (mechanics) | Link per party, NDA gate, per-document engagement, updated documents keep their links |
| **Visible** (connection) | Data room linked to the investor pipeline: in our case Fundraise and BD Pipeline through `dataroom.v1` |
| **Ansarada** (Q&A) | Question log, assignment, approval, disclosure record |

---

## 3. Scope

**In:**
- hosted and external rooms for financing, licensing, partnering and M&A
- standard biotech index templates with purpose weighting
- readiness checklist with owners and due dates
- documents from the platform document store (one set reused across rooms) with versions
- access levels: Non-confidential, Confidential, plus custom
- view-only or downloadable per document
- entry step: click-through or signed CDA (send PDF / Contracts / in place elsewhere / none)
- parties as shared organizations and people, one link per person
- email invitations and notifications
- per-party and per-document engagement
- structured Q&A with approval and publish-to-room
- "what changed since last visit"
- revoke, end dates and a disclosure record
- `dataroom.v1` outputs

**Out (v1):** watermarking; screenshot blocking; page-by-page analytics; redaction; eCTD viewer; SAS or Prism conversion; recipient accounts or portals; free messages; e-signature (signed CDAs are uploaded back); custom domains; legal advice on what to disclose. View-only hides the download button but cannot stop screenshots; the app says so.

**Small features that delight:**
1. **Readiness at a glance:** "Licensing room 82% ready, 4 required items missing in Clinical and CMC", each with an owner and due date.
2. **Start from a template:** the financing, licensing, partnering and M&A indexes are pre-numbered (1 Company … 9 Other) with required items, and fully editable.
3. **One document, many rooms:** update the pitch deck once and every room that uses it shows the new version as *Updated* to its parties.
4. **Level up in one click:** "Move Alpha Pharma to Confidential" checks the CDA, then emails them the new access in one confirmed send.
5. **Quiet signals:** "Beta Ventures has not opened anything for 10 days"; "Gamma Bio viewed the CMC section 6 times this week".
6. **What changed since your last visit:** parties see new and updated documents highlighted; the team sees the same per party before a call.
7. **Answer once, reuse:** the assistant spots a repeated question across parties and proposes the approved answer.
8. **Disclosure record:** for any party, what they were given access to, what they opened, which version and when. This is ready for signing and closing.

---

## 4. Screens (7)

Custom `frontend-js` app on the Vivid kit, theme **forest** (same as Fundraise, deal pack), declared in `templateLayoutSchema` (layout gear). Four capabilities per screen; party, document and question details open in the side panel.

| # | Screen (id) | Capabilities |
|---|---|---|
| 1 | **Overview** (`overview`) | (1) Rooms with purpose, status, readiness %, parties invited / active. (2) Activity today and this week: opens, new viewers, quiet parties. (3) Waiting on us: open questions, CDAs to accept, items due. (4) Recent changes and notifications sent. |
| 2 | **Rooms** (`rooms`) | (1) New room: purpose, hosted or external (with the external link), linked program(s), Fundraise round or BD opportunity (when connected), index template. (2) Levels: Non-confidential, Confidential, plus custom; entry step per level (click-through text, signed CDA option). (3) Branding: room title, logo, welcome note, contact person. (4) Status: preparing / live / closed; archive. |
| 3 | **Index** (`index`) | (1) Numbered sections and items (add, reorder, rename). (2) Readiness per section: required items missing, in progress, ready, not applicable, with owner and due date. (3) Attach documents (`data-trialy-document="upload room_document"` or choose existing), level and view-only per document, version history, *Updated* flags. (4) Preview the room as a party at a chosen level. |
| 4 | **Parties** (`parties`) | (1) Parties by organization with people, level, entry step status (CDA sent / signed / in place elsewhere), granted on, ends on, status. (2) Invite and level changes with email send review (default text, edit for all, personalise per person, display name) or copy link. (3) Revoke, extend, change end date. (4) Disclosure record per party. |
| 5 | **Activity** (`activity`) | (1) Engagement grid: party × section, with views, downloads and last seen. (2) Per document: who opened which version, how often, roughly how long. (3) Quiet and hot parties, with thresholds from Settings. (4) What changed since each party's last visit; export for a deal call. External rooms show manual or assistant-entered engagement here. |
| 6 | **Q&A** (`qa`) | (1) Question log: party, section or document, category, asked on, assignee, due, status. (2) Draft the answer (the assistant can propose one from approved documents), then approve; the approver can be required per room. (3) Answer privately or publish to the room or a level (asker anonymised). (4) Library of approved answers and repeated-question suggestions. |
| 7 | **Settings** (`settings`) | (1) Index templates and required items per purpose. (2) Email default texts per email type and room purpose. (3) Defaults: levels, entry step text, access length, view-only default, quiet-party days, Q&A approval required, notification choices. (4) Links to Access and Automations. |

---

## 5. Workflows

1. **Financing room:**
   - New room (financing), link the Fundraise round, apply the financing template; readiness shows the gaps.
   - Attach documents (deck and one-pager Non-confidential; financials, cap table and IP Confidential).
   - Invite investors from Fundraise opportunities; the entry step is click-through for Non-confidential and a signed CDA or click-through for Confidential, as chosen.
   - Activity flows to Fundraise through `dataroom.v1`.
2. **Licensing or partnering room:**
   - New room (licensing or partnering) linked to the asset (program) and BD Pipeline opportunities; apply the licensing template (clinical, regulatory and CMC weighted).
   - The partner starts at Non-confidential. Once the CDA is in place, move them to Confidential. Add a custom level "CMC" late in diligence.
   - Q&A runs per partner; answers are published to the room only when the answer applies to everyone.
3. **CDA options (per room):**
   - *Send PDF:* the CDA is shared at Non-confidential with a "Signed CDA" requested-document slot; the owner accepts the upload, which unlocks Confidential.
   - *Use Contracts:* the accepted signed CDA is filed as an agreement (cda_nda) through Contracts' reviewed path, and the party links to it; an existing signed CDA in Contracts can be chosen instead.
   - *In place elsewhere:* record the date, then unlock.
   - *None:* click-through only.
4. **Updating documents:**
   - Attach a new version: it keeps its place and the old version is no longer shown.
   - Parties with access see *Updated*. If room notifications are on, they receive one daily digest email listing new and updated documents they can see; the owner pre-approves the digest text when turning it on.
5. **Q&A:**
   - A party asks on their page (optionally pointing at a section or document); a question record is created and the team is notified.
   - The team assigns it and drafts the answer (the assistant may propose one), then approves it, if required.
   - The team sends it privately (email "your question was answered") or publishes it to the room or a level (asker anonymised; email to those parties).
6. **External room:**
   - Same index, readiness, parties and Q&A log, with the provider link stored.
   - Engagement is entered manually or proposed by the assistant from DocSend or ShareVault exports (reviewed).
   - Q&A answers are drafted here and sent outside.
7. **Close:**
   - Revoke all access or let it end. The disclosure record stays.
   - Archiving the room stops all links.

---

## 6. Platform exchange usage

| Need | Exchange feature |
|---|---|
| One room | One **exchange group** in room mode (§5 R1) bound to the `rooms` record; one **exchange** per person bound to the `access_grants` record |
| Index | Shared documents carry section number, title and order (R2) |
| Levels | Group levels; each document assigned to a level; each exchange holds its allowed levels (R3); level changes are reviewed operations |
| Entry step | Click-through per level; *signed document required* per level using the "Signed CDA" slot (R3 + existing gate) |
| View and download | Inline viewer with view events; view-only per document (R4) |
| Versions | Replacing a document version keeps its place; *Updated* for parties (R5) |
| Q&A | Questions on the recipient page in room mode; private answer or publish to room or level (R6) |
| Engagement data | Exchange writes access and engagement facts into the app's bound output tables (R7) |
| Emails | Types: access granted (invitation), access changed, documents updated (digest), question answered, answer published, access ending, access revoked (R8). The app supplies defaults per type and room purpose; the send review comes from `exchange.prepareEmail` and is shown exactly as returned; `exchange.sendEmail` is human-confirmed |

All exchange writes come from a click or submit, one per action, and return `review_required`; a person confirms. Assistants can prepare the same operations but never send, publish, grant, change levels or accept.

---

## 7. Data model

Principles as in [Runway §5](RUNWAY.md#5-data-model). Own tables use contract `dataroom.v1` (outputs) and app tables under the `dataroom.*` prefix.

**Shared roles**

| Role | Contract | Mode | Use |
|---|---|---|---|
| `organizations` | core.v1 | read/write | Parties (investors, pharma, partners, acquirers, shareholders) |
| `people` | core.v1 | read/write | Party contacts who receive links |
| `programs` | core.v1 | optional, read/write | Assets a room covers |
| `agreements` | core.v1 | optional, read/write (core fields only) | CDA references; Contracts-owned fields are left to Contracts |

**Own tables (`dataroom.*`)**

| Table | Key fields (kind) |
|---|---|
| `dataroom.settings` (one row) | default_access_days (number, 180; blank = until revoked), view_only_default (boolean, false), quiet_days (number, 10), qa_approval_required (boolean, true), notify_updates_default (boolean, false), entry_text (text), sender_display (select: organization / first_name) |
| `dataroom.templates` | name (text*), purpose (select*: financing / licensing / partnering / m_and_a / other), content (text, JSON: sections, items, required, weight), archived (boolean) |
| `dataroom.rooms` | name (text*), purpose (select*), mode (select*: hosted / external), external_url (text), status (select*: preparing / live / closed), program_ids (text), round_id (text), opportunity_ref (text), template_id (text), cda_option (select*: send_pdf / contracts / in_place / none), welcome_note (text), contact_person_id (text), notify_updates (boolean), exchange_group_id (text), owner (text), archived (boolean) |
| `dataroom.levels` | room_id (text*), name (text*), kind (select*: non_confidential / confidential / custom), order (number*), entry (select*: none / click_through / signed_cda) |
| `dataroom.sections` | room_id (text*), number (text*, e.g. "4.2"), name (text*), parent_id (text), order (number*) |
| `dataroom.items` | room_id (text*), section_id (text*), title (text*), required (boolean), status (select*: missing / in_progress / ready / not_applicable), owner (text), due (date), document_id (text), version_id (text), level_id (text*), view_only (boolean), updated_on (date), notes (text) |
| `dataroom.access_grants` (output, `dataroom.v1`) | contract fields: room_id, room_name, room_purpose, organization_id, person_id, granted_on, expires_on, status (invited / active / revoked / expired), agreement_accepted_on, source (manual / tracked). App fields: level_ids (text), recipient_email (text*), exchange_id (text), cda_status (select: not_needed / sent / signed / in_place_elsewhere), cda_agreement_id (text), last_seen_on (date) |
| `dataroom.engagement` (output, `dataroom.v1`) | contract fields: grant_id, organization_id, person_id, document_ref, document_title, first_viewed_on, last_viewed_on, view_count, seconds_viewed, downloads, source (manual / docsend / sharevault / tracked), as_of. App field: section_id (text) |
| `dataroom.questions` | room_id (text*), grant_id (text), organization_id (text), person_id (text), asked_on (date*), category (select: corporate / financial / legal_ip / clinical / regulatory / cmc / commercial / other), section_id (text), item_id (text), question (text*), status (select*: new / assigned / drafting / in_review / answered / published / declined), assignee (text), due (date), answer (text), approved_by (text), answered_on (date), visibility (select: private / room / level), level_id (text), reused_from (text), document_ids (text), source (select*: hosted / external) |

`*` = required. In hosted rooms the platform keeps `access_grants.status`, `last_seen_on` and all `engagement` rows current (R7, source `tracked`); these fields are read-only to people and assistants. In external rooms the same rows are entered manually or proposed by the assistant (source `manual` / `docsend` / `sharevault`).

**Registry change:** add the option `partnering` to `room_purpose` in `dataroom.v1` (`templates/contracts/outputs.json`). This is an additive change; readers treat unknown values as `other`. Set the writer to `life.data-room` for both outputs.

---

## 8. Calculation rules

- **Readiness** = ready ÷ (required items − not applicable) for the room and per section; a section with any missing required item is *not ready*.
- **Party status:**
  - invited until first open, then active
  - expired after `expires_on`
  - revoked when revoked
- **Engagement:**
  - `view_count` counts opens per person per document version (repeat opens within 30 minutes count once)
  - `seconds_viewed` is approximate visible time in the viewer
  - downloads are counted separately
  - section totals are summed from the documents in the section
- **Quiet party:** active with no open for `quiet_days`. **Hot party:** at least 5 opens in the last 7 days, or a Confidential section opened 3 or more times.
- **What changed:** documents added or updated after a person's `last_seen_on`, at levels they can access.
- **Disclosure record:** per party, the levels and their dates; documents visible at each level; versions opened or downloaded, with times; answers received.
- **Q&A overdue:** status before *answered* and past `due`.
- As-of handling as in Programs §7; bounded reads.

---

## 9. Access control and AI

- **App-level access as usual.** Room contents are confidential. Inviting parties and sending email need the Access right "Send to people outside the workspace".
- **Claude and ChatGPT** (each user's connection) can read the room and Q&A records the user can read, and documents only where the user and the document's AI setting allow. They never see recipient links. They draft indexes, readiness plans, invitation and notification texts, answers and engagement summaries. They cannot send, grant, change levels, publish, accept or revoke.
- **Parties** see only their own page: the levels they hold, their own questions, and answers published to them.

---

## 10. Customization and automations

Customization paths are as in [Runway §8](RUNWAY.md#8-customization-users-claude-and-chatgpt). Templates, levels and email texts are reviewed writes; workspace email defaults are saved in the platform exchange.

**Optional automations:**
1. **Updates digest to parties:** once a day, when a room has `notify_updates` on and documents changed, using the pre-approved digest text (platform R8).
2. **Room digest to the owner (email):** daily while a room is live, covering new viewers, quiet and hot parties, new questions, overdue answers and items due.
3. **Access ending:** 7 days before `expires_on`, the owner gets a reminder; the party gets an email only if the owner pre-approved it.
4. **Answer drafts (research worker on the user's Claude or ChatGPT runner):** new questions get a proposed answer with document references, for review.

---

## 11. Connections to other apps (by role, any install order)

| App | How | What the user gets |
|---|---|---|
| **Fundraise (03)** | Reads `dataroom.access_grants` and `dataroom.engagement` as an integration ("Use its data"). Data Room can pick parties from Fundraise opportunities when connected, and a room can link a round | Investor pipeline with who has access, what they viewed and how often |
| **BD Pipeline (07)** | Reads the same outputs for licensing and partnering rooms; parties can be picked from BD opportunities | Partner pipeline with diligence engagement |
| **Contracts (04)** | Shares `organizations` and `agreements`; CDA option "Use Contracts" files or reuses the signed CDA through Contracts' reviewed path | One register of CDAs; access unlocked from it |
| **Programs (02)** | Shares `programs`; rooms are linked to assets | Rooms per asset |
| **Runway (01), Investor Updates (06)** | Documents such as cash forecasts or updates can be attached as normal documents | Up-to-date financials in the room |
| **Board (14), Deal Comps (18)** | Share `organizations` | One record per company |

Data Room never writes another app's own tables; handoffs are proposals in the owning app's reviewed path.

---

## 12. Assistant behaviour

- Build the index from the purpose and the program stage; check readiness against the template; suggest what to hold back until later levels.
- Draft and personalise invitation, level-up and notification emails from the default texts.
- Summarise engagement before a call: what this party opened, what changed since, their open questions.
- Draft answers from approved documents with references; spot repeated questions and reuse approved answers.
- Never: send, grant, change levels, publish, accept, revoke, or advise on what is legally safe to disclose.
- **`whenToUse`:** a small biotech prepares or runs a data room for a round, licensing, partnering or M&A: index, readiness, sharing with investors or partners, levels, CDA, tracking who viewed what, diligence Q&A. **`whenNotToUse`:** general file storage, board portals, contract drafting, investor update emails (Investor Updates), cap-table management.

---

## 13. Package checklist and acceptance criteria

**Package:**
- template source under `templates/source/data-room/` and immutable `templates/apps/life.data-room-1.0.0.json` (draft until approved)
- roles as in §7
- `dataroom.v1` registry update (writer, `partnering`)
- fictional default templates: financing, licensing, partnering, M&A, each with the 9-section index and required items
- email defaults per email type and room purpose
- full `catalog.metadata.json` documentation, including the outputs it writes
- fictional `demo_data.json`
- `templateLayoutSchema` with seven screen ids
- build `--check` and browser test

**Acceptance (beyond the shared contract and the exchange's own tests):**
1. **Financing room end to end:** template → readiness gaps → attach documents at two levels → invite 3 investors in one confirmed send (default text, one personalised by the assistant; the preview is identical to what is sent). Two open the room and one views a document twice. Grants and engagement update automatically, and Fundraise ("Use its data") shows them.
2. **Licensing room with CDA:** a party at Non-confidential uploads the signed CDA; it is accepted, Confidential unlocks, and an email is sent on confirm. With Contracts, the CDA is filed as an agreement. A custom level "CMC" is added later for one party only.
3. **Levels:** a party never sees a document above their levels, including in search, "what changed" and published answers. Lowering a level hides those documents immediately.
4. **Versions:** a new version keeps its place, shows *Updated* to parties with access, and appears in the daily digest when notifications are on.
5. **Q&A:** question → assign → draft (assistant) → approve → private answer (email), and a second answer published to the room (asker anonymised, emails to that room's parties).
6. **External room:** manual engagement and Q&A work, and Fundraise reads them the same way.
7. **Assistants:** they draft but cannot send, grant, change levels, publish, accept or revoke; they never see links or documents without AI access.
8. **Modularity and archiving:** the modularity test (rule 9) and archive-first checks pass. Archiving a room or the app stops all links; restoring re-enables only unexpired grants. Archiving the app leaves Fundraise working with "data unavailable".
9. **Layout:** desktop 1440 and mobile 390, for both the app and the recipient room page.

**Open for design partners:** default required items per purpose and stage; whether view-only is wanted by default; quiet and hot thresholds.
