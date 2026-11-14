# Investor Updates — final app scope (BT2-06)

*AI-written investor updates on a schedule: you set the plan, Claude or ChatGPT drafts it, you approve it, and TrialAgents sends it and tracks who read it.*

**Status:** Final scope for build, 14 November 2026. Part of [Biotech apps v2](../BIOTECH_v2.md) (rank 6). New template `life.investor-updates` 1.0.0, display name **Investor Updates**. No existing users.

**Depends on:** the platform [external exchange](../../EXTERNAL_EXCHANGE.md) (PR #147) **plus** the room extension ([§5](../../EXTERNAL_EXCHANGE.md#5-room-extension-for-data-room), built for Data Room) **plus** the small update extension in [§6](../../EXTERNAL_EXCHANGE.md#6-update-extension-for-investor-updates). It also uses TrialAgents Automations on the user's Claude or ChatGPT runner. Build it as two PRs: **(A)** the §6 platform extension (after Data Room PR A), **(B)** this app.

**Governing contracts:** project context, template authoring and usage guidance (latest, all `nextOffset`s), shared build contract, interface rules, access control, write authorization, field capabilities, shared data, [modular apps and shared data](../../MODULAR_APPS_AND_SHARED_DATA.md), platform documents inside apps, automations guidance, and the contract registry. They win on any conflict.

**Decisions (14 Nov 2026):**
- **AI-native.** The connected assistant (Claude or ChatGPT, whichever the user connects) drafts and designs each update from a written brief and the sources it is allowed to read. The app does not pull numbers into fixed KPI templates. It holds the plan and the investor list, previews the draft, shows the evidence behind it, gets approval, sends to the right contacts and tracks engagement.
- **Investor list.** Investors are firms (shared `organizations`) with one or more contacts each (shared `people`).
- **Scheduled updates.** A scheduled update bundles a template, its data sources, its contacts and its frequency. On schedule an automation asks the assistant to draft the next update.
- **Email built in.** Updates are sent from `no-reply@trialagents.com` as "<Organization> at TrialAgents" or "<First name> at TrialAgents" (editable). Every send is confirmed by a person. The full update goes in the email body, plus a personal "view online" link. Reading is measured on the online page; there are no hidden open pixels.
- **Defaults:** cadence is monthly for the board and lead investors and quarterly for all shareholders. Automatic drafts are on once a scheduled update is saved. The cap table is not in v1: the assistant may quote ownership only from a document the user provides.

---

## 1. Why AI-native, and what that changes

Visible, Cabal and Carta were built before assistants could write. They solve "help a person write the update" with KPI integrations, chart builders and copy-last-month editors. Reviewers praise ease of use and auto-filled charts, and complain about missing data integrations.

Inside TrialAgents the assistant can already read Runway, Programs, Fundraise, BD Pipeline, documents and the chat. So:

| Existing tools | Investor Updates |
|---|---|
| Person writes; software fills numbers | Assistant writes from a brief; person reviews and approves |
| KPI integrations and chart builders | Assistant reads connected apps and documents; charts are blocks it fills |
| Template = form fields | Template = sections, tone, length, design and rules, in words |
| Trust comes from typing it yourself | Trust comes from a **fact panel**: every number and claim linked to its source, checked by the app |
| Open pixels | A per-recipient online page records reading |
| Asks are text | Each ask has an "I can help" button; responses are tracked per investor |

---

## 2. Evidence and references

Sources read 14 November 2026: Visible (product pages, G2, Capterra, GetApp, independent reviews), Cabal, Carta investor updates, Foundersuite, investor-update templates and guides (Waveup, Underscore VC, Stackmatix), and biotech runway and milestone guidance. These are vendor and advisor sources; validate with design partners.

| Need | Signal | Confidence |
|---|---|---|
| Regular, consistent updates | Same sections every period and never skipped; monthly at seed and Series A, quarterly later | High |
| Fast to produce | Visible users value auto-filled numbers and copying last month (about 1 hour per update) | High |
| Biotech content is milestone-led | Investors want cash, runway to the next value-inflection milestone, and program progress, not revenue | High |
| Asks that get action | Cabal's relationship layer; specific asks get specific help | Medium–high |
| Know who read it | Visible's open and click tracking per investor | High |
| More data sources wanted | The most common Visible complaint | Medium |

| Reference | Role |
|---|---|
| **Visible** (primary) | Update workflow, audiences, engagement per investor, archive |
| **Cabal** | Asks and investor help |
| **Carta** | Investor list tied to ownership (cap table later) |

---

## 3. Scope

**In:**
- investor list (firms and contacts)
- update templates
- scheduled updates (template + sources + contacts + frequency)
- automatic and on-request AI drafts
- preview per audience
- fact panel with source checks
- one- or two-step approval
- email send with editable default texts
- per-recipient online page and archive
- read tracking
- asks with "I can help" responses
- follow-ups
- PDF of each sent update
- engagement summary for the next draft
- consistency checks against past updates

**Out (v1):**
- cap table and ownership calculations
- KPI dashboards and data integrations (the assistant reads the connected apps)
- drag-and-drop email builder
- open pixels
- investor logins and portal accounts
- newsletters to prospects (Fundraise)
- board packs (Board, BT2-14)
- legal review of disclosures

**Small features that delight:**
1. **"Your October board update is ready."** It arrives as a draft on schedule, already written and designed. The owner only reviews.
2. **Fact panel:** each number shows "Runway 14.2 months · Runway, October close ✓". An unverifiable claim shows "From chat, 2 Nov · not checked".
3. **Promise tracker:** "In Q3 you said IND filing in Q1; this draft says Q2. Add an explanation?"
4. **One update, several audiences:** the board version is full; the shareholder version is shorter, from the same draft, with no confidential sections.
5. **"I can help":** two partners offer CMO intros; both responses appear in the app, with a follow-up task.
6. **Before the next draft:** "3 board members did not open September; 2 asks still open". The assistant can mention open asks again.

---

## 4. Screens (6)

Custom `frontend-js` app on the Vivid kit, theme **forest** (deal pack), declared in `templateLayoutSchema`. Four capabilities per screen; investor, contact, update and response details open in the side panel.

| # | Screen (id) | Capabilities |
|---|---|---|
| 1 | **Overview** (`overview`) | (1) Next updates due per scheduled update, with draft status. (2) Drafts waiting for review or approval. (3) Recent engagement: read rates and who has not read. (4) Open ask responses and follow-ups. |
| 2 | **Investors** (`investors`) | (1) Investor firms (shared organizations, `org_type` investor) with type, relationship (lead / board / shareholder / observer / advisor), status (active / exited). (2) Contacts per firm (shared people) with role, email, which updates they receive, and "primary". (3) Add a firm and its contacts manually, or have the assistant propose them from Fundraise committed investors or documents (reviewed). (4) Per contact: updates received, read history, ask responses. |
| 3 | **Scheduled updates** (`schedules`) | (1) List of scheduled updates, e.g. "Board – monthly" or "Shareholders – quarterly", with next draft and send dates. (2) Editor: **template**, **data sources** (apps, documents, notes, exclusions), **contacts** (firms, contacts or relationship groups), **frequency and timing** (monthly / quarterly / half-yearly / yearly / one-off; draft on business day N; target send date; time zone), approvers, automatic drafts on or off. (3) "Draft now". (4) Pause, resume, archive. |
| 4 | **Review & send** (`review`) | (1) Preview exactly as sent (email and online), per audience version. (2) Fact panel: claims and numbers with sources and check status; mismatches flagged. (3) Revise in chat or edit directly; compare with the previous update; promise-tracker notes. (4) Approve (one or two steps), then the send review (default email text, personalise, display name), then a confirmed send. Sent versions lock and get a PDF. |
| 5 | **Engagement** (`engagement`) | (1) Per update: sent, delivered, read (first and last read, read count) per contact and firm. (2) Ask responses with message, owner and status (new / following up / done). (3) Not-read list and one-click follow-up email (confirmed). (4) Engagement summary for the next draft. |
| 6 | **Templates & settings** (`settings`) | (1) Templates: sections, tone, length, design (logo, colours, block styles), rules ("always state runway to next milestone", "never mention unannounced deals"). Standard templates: Monthly board update, Quarterly shareholder update, Milestone flash. (2) Email default texts (update, follow-up, not-read reminder). (3) Approval defaults, confidentiality footer, sender display. (4) Links to Access and Automations. |

---

## 5. Workflows

1. **Set up:**
   - Add investor firms and contacts, or ask the assistant to propose them from Fundraise or a shareholder document.
   - Create a scheduled update: pick the template, sources, contacts and frequency.
   - Saving creates the draft automation (the user confirms it once, as for every automation).
2. **Scheduled draft:**
   - On the draft date the automation runs on the user's Claude or ChatGPT runner.
   - It reads the brief (template + rules), the allowed sources as of the period end, the previous sent update and its engagement.
   - It writes the update as content blocks, a fact list and the asks, and saves it as a draft (reviewed proposal).
   - The owner is notified in the app and by email.
3. **On-request draft:** the user says "draft the October board update" in Claude or ChatGPT; the same draft lands in Review.
4. **Review:**
   - The app re-checks every fact that has a record source against the current record and marks it ✓ or "changed since draft".
   - The owner revises in chat or edits directly.
   - Approver 1 (optional, e.g. CFO) checks the numbers; approver 2 (CEO) approves.
5. **Send:**
   - The send review shows the email exactly as it will go out, for each audience version, with recipients.
   - A person confirms; one exchange per contact is created, and the email carries the full update plus the online link.
   - The update locks, the PDF is filed in documents, and later edits create a correction notice, never a silent change.
6. **Engage:**
   - Reads and "I can help" responses arrive through the platform.
   - The owner assigns follow-ups; the next draft receives the engagement summary.
7. **Missed cadence:** if no draft is approved 2 days before the target send date, the owner is reminded. If the target date passes, the scheduled update shows "overdue".

---

## 6. Content model and design

The assistant designs inside safe **blocks**, and the app renders them into email-safe HTML and the online page, using the template's design.

| Block | Content |
|---|---|
| `heading`, `text` | Title, TL;DR, narrative sections (limited markdown) |
| `metrics` | Up to 6 figures with label, value, unit, change and fact reference |
| `table` | Small tables, e.g. program status or use of funds |
| `chart` | Line or bar from a short data series the assistant supplies; the app renders it as an image for email, with fact references |
| `milestones` | Done, next and slipped items, with dates and fact references |
| `asks` | Specific asks; each gets an "I can help" button online and a link in email |
| `callout`, `divider`, `image` | Highlights or lowlights callout; images from platform documents |

There is no free HTML from the assistant. Blocks marked confidential in the template are removed from audiences that may not see them. Each audience version has its own block list from the same draft.

**Fact list:** each item has a claim, a value, a source (record ref with app, table, record and field; or a document ref with page; or "user-stated in chat" with date), as-of date and check status (verified / changed / unverified). Numbers in blocks must reference a fact.

---

## 7. Platform exchange usage

| Need | Exchange feature |
|---|---|
| One sent update | One exchange group in room mode (§5 R1) with the update content (§6 U1), bound to the `updates` record; one exchange per contact, bound to the `deliveries` record |
| Full update in email | §6 U2 rich email body from the rendered blocks, plus the personal link |
| Read tracking | Room view events (§5 R4) and bound output table (§5 R7) writing to `deliveries` |
| Asks | §6 U3 ask buttons with optional note; responses as events written to `ask_responses` |
| Archive per recipient | §6 U4 series: a recipient's page lists earlier updates of the same series they received |
| Emails | Types *update* (U2), *follow-up*, *not-read reminder*; defaults per type; the send review comes from `exchange.prepareEmail`, shown exactly as returned; `exchange.sendEmail` is human-confirmed |

Assistants can prepare drafts and email texts but never approve, send, or see recipient links.

---

## 8. Data model

Principles as in [Runway §5](RUNWAY.md#5-data-model). App tables use the `investorupdates.*` prefix.

**Shared roles**

| Role | Contract | Mode | Use |
|---|---|---|---|
| `organizations` | core.v1 | read/write | Investor firms (`org_type` investor) |
| `people` | core.v1 | read/write | Investor contacts (name, organization_id, title, email) |
| `programs` | core.v1 | optional, read | Context for drafts |

Draft sources are read by the assistant under the user's access, not connected as app tables: Runway, Programs, Fundraise, BD Pipeline, Data Room outputs and documents. The app records each source reference in the fact list.

**Own tables (`investorupdates.*`)**

| Table | Key fields (kind) |
|---|---|
| `investorupdates.settings` (one row) | sender_display (select: organization / first_name), approval_steps (select: one / two), confidentiality_footer (text), reminder_days (number, 2), default_timezone (text) |
| `investorupdates.investors` | organization_id (text*), investor_type (select: specialist_ls_vc / generalist_vc / pharma_cvc / strategic / family_office / angel / public_fund / other), relationship (select*: lead / board / shareholder / observer / advisor), status (select*: active / exited), board_seat (boolean), notes (text), source (select: manual / assistant / fundraise), archived (boolean) |
| `investorupdates.contacts` | investor_id (text*), person_id (text*), role (select: partner / principal / associate / operations / finance / other), primary (boolean), receives (boolean, true), unsubscribed_on (date), archived (boolean) |
| `investorupdates.templates` | name (text*), kind (select*: monthly_board / quarterly_shareholder / milestone_flash / custom), sections (text, JSON), tone (text), length (select: short / standard / detailed), design (text, JSON: logo document id, colours, block styles), rules (text), confidential_sections (text), archived (boolean) |
| `investorupdates.schedules` | name (text*), template_id (text*), sources (text*, JSON: apps, document ids, standing notes, exclusions), audience (text*, JSON: investor ids, contact ids, relationship groups), audience_versions (text, JSON: version name → audience + hidden sections), frequency (select*: monthly / quarterly / half_yearly / yearly / one_off), draft_business_day (number*, 3), send_by_day (number*, 7), timezone (text), approver_1 (text), approver_2 (text*), auto_draft (boolean, true), automation_id (text), next_period (text), status (select*: active / paused), archived (boolean) |
| `investorupdates.updates` | schedule_id (text*), period (text*, e.g. "2026-10" or "2026-Q3"), title (text*), status (select*: drafting / in_review / approved / sent / cancelled), blocks (text*, JSON), facts (text*, JSON), asks (text, JSON), versions (text, JSON: per audience version, block list), drafted_by (select: claude / chatgpt / user), drafted_on (date), approved_1_by (text), approved_2_by (text), approved_on (date), sent_on (date), exchange_group_id (text), pdf_document_id (text), correction_of (text) |
| `investorupdates.deliveries` | update_id (text*), version (text*), contact_id (text*), investor_id (text*), email (text*), exchange_id (text), sent_on (date), status (select*: queued / sent / bounced / read / revoked), first_read_on (date), last_read_on (date), read_count (number) |
| `investorupdates.ask_responses` | update_id (text*), ask_key (text*), contact_id (text*), investor_id (text*), responded_on (date*), message (text), status (select*: new / following_up / done), owner (text), follow_up_due (date) |

`*` = required. The platform keeps `deliveries` read fields and `ask_responses` current as system writes (`source: tracked`, R7/U3); people and assistants cannot edit those fields. A sent `updates` row is immutable except `correction_of` links.

**Outputs:** none in v1. Fundraise, Board and BD can read sent updates through documents (PDF) later; an `investorupdates.sent` output role can be added when a reader needs it.

---

## 9. Calculation and checking rules

- **Next period and dates.** From the frequency and the anchor: the draft date is the Nth business day after the period end, the send-by date is day M, in the schedule's time zone.
- **Overdue.** Not sent after the send-by date. **Reminder** when there is no approved draft `reminder_days` before the send-by date.
- **Fact check at review:**
  - A record-sourced fact is re-read; equal means ✓, different means "changed since draft" with both values shown.
  - A document-sourced fact is checked to exist (✓ if found).
  - User-stated or unsourced facts are "unverified".
  - Approval is blocked while any number lacks a fact reference; unverified facts need a tick "I confirm these" from the approver.
- **Promise tracker.** Statements with dates in the previous sent update of the same schedule are compared to the new draft. A changed or missing date is flagged.
- **Read rate** = contacts with a read ÷ contacts delivered, per update and per firm (a firm counts as read when any contact read).
- **Unsubscribe.** A contact who unsubscribes is excluded from later sends (the owner sees it), and their history stays.
- As-of handling as in Programs §7; bounded reads.

---

## 10. Access control and AI

- **App-level access as usual.** Updates are confidential. Sending needs the Access right "Send to people outside the workspace". Approvers are named per schedule.
- **Claude and ChatGPT** (each user's connection) draft, design and revise updates; propose investors, contacts, templates and schedules; and summarise engagement. They read only what the user may read, and only the sources the schedule allows. They never approve, send, unsubscribe someone or see recipient links.
- **Scheduled drafts.** They run as a TrialAgents automation on the runner of the assistant that created the schedule (Claude runner or ChatGPT). Each assistant owns its automations, per platform rules.
- **Recipients** see only their own page, the updates of that series sent to them, and their own ask responses.

---

## 11. Automations

1. **Scheduled draft** (one per scheduled update, research worker on the user's Claude or ChatGPT runner): writes the draft for the period from the brief and sources and notifies the owner. Required for automatic drafts; created on schedule save and confirmed once.
2. **Cadence reminder** (email to the owner): no approved draft `reminder_days` before the send-by date, and again when overdue.
3. **Not-read follow-up:** 5 days after send, a list of non-readers is prepared; the follow-up email is sent only after confirmation, or automatically if the owner pre-approved it on the schedule.
4. **Ask responses** (email to the owner): an immediate notice per new "I can help".

---

## 12. Connections to other apps (by role, any install order)

| App | How | What the user gets |
|---|---|---|
| **Runway (01)** | The assistant reads month closes and scenarios as a draft source | Cash, burn and runway with sources |
| **Programs (02)** | The assistant reads milestones, reports and decisions | Milestones done, next and slipped |
| **Fundraise (03)** | Shares `organizations` and `people`; the assistant proposes investors from committed or closed opportunities; round status as a source | Investor list from the closed round; round progress in updates |
| **BD Pipeline (07), Data Room (08)** | Draft sources (deal stages, diligence activity) | Partnering progress |
| **Board (14)** | Shares `organizations`/`people`; board update schedules can be reused | One investor list |

Investor Updates never writes another app's own tables.

---

## 13. Assistant behaviour

- Draft from the brief: follow the sections, tone and rules; lead with cash, runway to the next milestone and program progress; give honest lowlights; make asks specific.
- Every number references a fact with its source; never invent figures; say "not available" when a source is missing.
- Stay consistent with earlier updates; explain changed dates and numbers.
- Create audience versions that respect confidential sections.
- Never: approve, send, add recipients without review, mention excluded topics, or give legal or securities advice.
- **`whenToUse`:** regular or one-off updates to existing investors and shareholders: investor list, templates, scheduled AI drafts, review, sending, read tracking and ask responses. **`whenNotToUse`:** outreach to prospective investors (Fundraise), board packs (Board), cap-table management, press releases.

---

## 14. Package checklist and acceptance criteria

**Package:**
- template source under `templates/source/investor-updates/` and immutable `templates/apps/life.investor-updates-1.0.0.json` (draft until approved)
- roles as in §8
- standard templates: Monthly board update, Quarterly shareholder update, Milestone flash
- email default texts
- block renderer for email and the online page, using the template design
- full `catalog.metadata.json`
- fictional `demo_data.json`: 6 investor firms, 11 contacts, 2 schedules, 3 sent updates, 1 draft
- `templateLayoutSchema` with six screen ids
- build `--check` and browser test

**Acceptance (beyond the shared contract and exchange tests):**
1. **Set up:** 3 firms with 5 contacts; a monthly board schedule with template, sources, contacts and frequency. Saving creates the draft automation after one confirmation.
2. **Scheduled draft:** the automation produces a draft with blocks, facts and asks on the draft date, and the owner is notified. "Draft now" from chat produces the same.
3. **Fact panel:** a record-sourced number changed after the draft is flagged with both values. A number without a fact reference blocks approval. Unverified facts need the approver's tick.
4. **Two-step approval, then send:** the preview is identical to the email received. Board and shareholder versions differ only by their hidden sections. A confirmed send creates one link per contact. The update locks and the PDF is filed.
5. **Engagement:** two contacts read the update and one clicks "I can help" with a note. Deliveries and responses update without review and are not editable. The not-read follow-up goes out only after confirmation.
6. **Promise tracker** flags a moved milestone date from the previous update.
7. **Unsubscribe** excludes the contact from the next send.
8. **Assistants** draft but cannot approve, send or see links; they read only the allowed sources.
9. **Modularity and archiving:** the modularity test (rule 9) and archive-first checks pass. Archiving the app pauses its automations and stops the online links. Restoring re-enables them.
10. **Layout:** desktop 1440 and mobile 390, for both the app and the recipient page; the email renders in common clients (Gmail, Outlook, Apple Mail).

**Open for design partners:** default templates and sections; whether boards want two-step approval; whether investors use "I can help".
