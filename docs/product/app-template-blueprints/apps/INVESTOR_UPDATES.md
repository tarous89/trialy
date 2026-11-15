# Investor Updates — final app scope (BT2-06)

*Keep your board, investors and shareholders informed by email or in meetings. Claude or ChatGPT writes each update, agenda and recap; you approve it; TrialAgents sends it and tracks who read it, their questions and their offers of help.*

**Status:** Final scope for build, revised 15 November 2026. It replaces the 14 November scope and the first revision of 15 November. Part of [Biotech apps v2](../BIOTECH_v2.md) (rank 6). New template `life.investor-updates` 1.0.0, display name **Investor Updates**. Not built yet; no existing users.

**Depends on:**
- the platform [external exchange](../../EXTERNAL_EXCHANGE.md), with the room extension (§5) and the update extension (§6 U1–U4). All three are merged; this scope needs **no new platform work**.
- the [app automations](../../RECOMMENDED_AUTOMATIONS.md) platform (#168, #169, E1–E7), as used by Fundraise 2.0.0 and Partnerships 2.1.0.

Build it as one PR (the app).

**Governing contracts:** project context, template authoring and usage guidance (latest, at least 1.3.31, all `nextOffset`s), shared build contract, interface rules, access control, write authorization, field capabilities, shared data, [modular apps and shared data](../../MODULAR_APPS_AND_SHARED_DATA.md), platform documents inside apps, [apps, access and automations](../../APP_CONFIGURATION_AND_AUTOMATIONS.md) (including "Two kinds of email" and the email limits), the app automations scope and the contract registry. They win on any conflict.

**The model in one line:** *investors* (people in categories) receive *updates*, and an update is either an **email** or a **meeting** (with a *before* part — agenda and pre-read — and an *after* part — recap and materials).

**Decisions (15 Nov 2026):**
- **Investors in categories.** Every recipient is a person (shared `people`), optionally linked to a firm (shared `organizations`), in one or more **categories**. Three come standard: **Board**, **Investors** and **Shareholders**. Users or their assistant add their own: Major investors, Series A holders, Angels, Scientific advisory board, Grant funders, Strategic partner. Board members who hold no shares (independent directors) are recipients too.
- **Room for share classes.** Recipients can carry the share classes they hold (e.g. Common, Seed preferred, Series A preferred, SAFE or convertible), from a list the user keeps. A category can be defined by share class ("everyone holding Series A preferred"), so information rights that differ by class can be respected. v1 stores classes only: no amounts, ownership or cap table. A later cap-table app can provide the holdings instead (§12).
- **Two formats, one update.** An **email update** is written, approved and sent. A **meeting** (board meeting, shareholder or annual meeting, quarterly investor call, advisory board) is the same kind of update with a date: a **before** part (agenda and pre-read, sent ahead) and an **after** part (recap, decisions as reported, slides), sent later. Nothing about meetings is board-only.
- **One draft, levels decide the versions.** Each block has a confidentiality level: *Board*, *Investors* or *Everyone*. Each category has a maximum level. The app builds each category's version from the same draft; nobody edits versions by hand.
- **Both ways of working.** Templates and plans are presets (fixed sections, tone, cadence). The assistant can also write a one-off update without a template, and any draft can be saved as a template. Both paths produce the same blocks and facts and pass the same checks.
- **AI-native.** The assistant drafts and designs from the brief and the sources it may read. The app holds investors, categories, plans and meetings; previews; checks facts; gets approval; sends; and tracks engagement. It does not pull numbers into fixed KPI templates.
- **Automations belong to the platform.** The app stores no draft times, reminder switches or recipients for automations. Install recommendations are on by default; a scheduled draft per plan is set up from the plan (§11).
- **Email built in.** Sent from `no-reply@trialagents.com` as "<Organization> at TrialAgents" or "<First name> at TrialAgents" (editable). Every send is confirmed by a person. The full update goes in the email body, plus a personal "view online" link. Reading is measured on the online page; there are no open pixels.
- **Defaults:** monthly for the board, quarterly for investors and shareholders; a meeting's before part goes out 7 days ahead. Questions and "I can help" are on.

---

## 1. Why this model, and why AI-native

**What users need.** Small biotechs report to three overlapping groups — the board, investors with information rights, and all shareholders — and they do it in two ways: written updates between meetings, and meetings (board meetings, the annual shareholder meeting, investor calls) with materials before and a recap after. Existing tools split these: Visible and Carta for written updates, board portals (Diligent, BoardPro, Boardable, Zeck) for meeting materials, and email for everything else. One model — people in categories receiving updates by email or in a meeting — covers all of it with one investor list, one archive per person and one engagement history.

**Why AI-native.** Those tools were built before assistants could write: KPI integrations, chart builders, copy-last-month editors, agenda builders and drag-and-drop board books. Inside TrialAgents the assistant already reads Runway, Programs, Fundraise, Partnerships, Contracts, the Bio Radars, documents and the chat. So:

| Existing tools | Investor Updates |
|---|---|
| A person writes; software fills numbers | The assistant writes from a brief; a person reviews and approves |
| Contact lists and tags kept by hand | Categories with a description, a level and optional share-class rules; the assistant proposes members |
| Separate versions per audience | One draft; block levels produce each category's version |
| Agenda builder and board book assembly | The assistant drafts the agenda and pre-read, citing platform documents that are attached |
| Minutes and recaps typed after the meeting | The assistant drafts the recap from the user's notes; a person approves |
| Trust comes from typing it yourself | A **fact panel**: every number linked to its source and checked by the app |
| Open pixels | A per-person online page records reading |
| Asks and questions by email | "I can help" and a question box on the page, tracked per person |

---

## 2. Evidence and references

Sources read 14–15 November 2026: Visible (product pages, help centre, reviews), Cabal, Carta investor updates and board management, Zeck, BoardPro, Boardable, Diligent, and investor-update and board-meeting guides. These are vendor and advisor sources; validate with design partners.

| Need | Signal | Confidence |
|---|---|---|
| Regular, consistent updates | Same sections every period; monthly at seed and Series A, quarterly later | High |
| Updates go to several groups | Visible founders send to about 57 recipients on average, typically current investors, board members and potential investors; contact lists segment audiences | High |
| Meetings need materials before and a record after | Board meetings are often quarterly; materials go out in advance; members look back at the previous deck; portals cover agenda, pack, minutes and actions | High |
| Rights differ by investor | Major-investor information rights and class-specific consents are common in venture terms; companies send more to some holders than others | Medium (validate) |
| Know who read it | Visible tracks engagement per contact; Zeck shows which directors read each section | High |
| Questions before the meeting | Zeck lets directors leave questions and comments on materials before the meeting | Medium |
| Asks that get action | Cabal's structured asks | Medium–high |

| Reference | We take | We leave out |
|---|---|---|
| **Visible** (primary) | Update workflow, contact lists as categories, engagement per person, archive | KPI integrations, chart builder, investor database |
| **Cabal** | Asks with "I can help" | Investor workspace and logins |
| **Zeck** | Meeting materials as a page, read tracking, questions before the meeting | Per-section analytics, pre-votes |
| **BoardPro / Boardable** | Before/after shape of a meeting at small-board size | Agenda builder, voting, e-signature, minutes book, registers |
| **Carta** | Investors tied to share classes (classes only in v1) | Cap table, board consents |

---

## 3. Scope

**In:**
- investors: people, optionally linked to firms, in one or more categories, with share classes held
- categories: three standard plus custom ones, each with a description, level and optional share-class rule
- updates in two formats: email, or meeting (before and after parts)
- templates (presets) and plans (template + categories + sources + cadence)
- scheduled and on-request AI drafts, including one-off updates without a template
- versions per category from block levels
- fact panel with source checks and the promise tracker
- one- or two-step approval
- email send with editable default texts; a not-read reminder pre-approved at send
- per-person online page and archive; meeting documents on the page
- read tracking; "I can help"; questions with private or group-wide answers
- PDF of each sent update or meeting part
- engagement summary for the next draft
- customization by Claude and ChatGPT within scope (§8a)

**Out (v1):**
- cap table, holdings amounts and ownership calculations
- calendar invitations and video-call links managed by the app (the user's calendar sends them; the meeting's link is shown as text)
- formal meeting procedure: notices required by law, voting, proxies, quorum, minutes book, resolutions and written consents (Board, BT2-14)
- KPI dashboards and data integrations (the assistant reads the connected apps)
- drag-and-drop email or board-book builder; open pixels and per-section reading
- investor logins and portal accounts
- outreach to prospective investors (Fundraise)
- legal review of disclosures

**Small features that delight:**
1. **"Your October board update is ready."** It arrives as a draft on schedule, already written and designed. The owner only reviews.
2. **"Board meeting in 7 days: agenda and pre-read drafted."** The same works for the annual shareholder meeting or a quarterly investor call.
3. **One draft, three categories:** the board sees the cash bridge and the CRO dispute; investors the summary; shareholders the highlights. Previews side by side.
4. **Share-class aware:** "Series A holders" gets the quarterly financials their information rights require; common holders get the shorter version.
5. **Fact panel:** "Runway 14.2 months · Runway, October close ✓"; "From chat, 2 Nov · not checked".
6. **Promise tracker:** "In Q3 you told the board IND filing in Q1; this draft says Q2. Add an explanation?"
7. **"2 of 5 directors have read the pre-read; 3 questions waiting."** The assistant drafts answers; you send them privately or to everyone invited.
8. **Recap in one minute:** paste your notes after the call; the recap with next steps is drafted, approved and sent to everyone invited.

---

## 4. Screens (5)

Custom `frontend-js` app on the Vivid kit, theme **forest** (deal pack), declared in `templateLayoutSchema`. Four capabilities per screen; investor, update, meeting and response details open in the side panel.

| # | Screen (id) | Capabilities |
|---|---|---|
| 1 | **Overview** (`overview`) | (1) What is due: next email update per plan, and upcoming meetings with the status of their before part. (2) Drafts waiting for review or approval. (3) Engagement: read rate of the last update per category, and who has not read. (4) Open questions, offers of help and follow-ups. |
| 2 | **Updates** (`updates`) | (1) One list of email updates and meetings (upcoming, drafting, in review, sent), filterable by format, category and plan. A meeting shows its date and its before and after parts. (2) **Review:** preview per category version, exactly as sent; fact panel; promise-tracker notes; compare with the previous update. (3) Revise in chat or edit blocks and levels; approve (one or two steps); send review (default text, display name, not-read reminder); confirmed send. Sent parts lock and get a PDF. (4) **Engagement** per sent update or part: delivered and read per person and category, questions and answers, offers of help, unsubscribes. "New email update", "New meeting", "Draft the recap from my notes" and "Save as template" live here. |
| 3 | **Investors** (`investors`) | (1) People with firm, categories, share classes, status (receives / paused / unsubscribed) and last read. (2) **Categories:** standard and custom, with description, level, share-class rule, default template, and whether questions and "I can help" are on. (3) **Share classes:** the user's list of classes (name, kind: common / preferred / convertible / other). (4) Add people by hand, or have the assistant propose them from Fundraise (closed rounds), a shareholder register or a board list (reviewed); per person: updates received, reads and responses. |
| 4 | **Plans & templates** (`plans`) | (1) Plans, e.g. "Board – monthly update", "Investors – quarterly update", "Board – quarterly meeting": format, template, categories, sources, cadence, send-by day, approvers, status, and the state of its scheduled-draft automation with **Set up automation** (opens the platform editor). (2) Templates (presets): sections, brief (tone, length, rules in words), design, default levels. Standard: Monthly board update, Quarterly investor update, Milestone flash, Meeting agenda and pre-read, Meeting recap. (3) "Draft now" for a plan. (4) Pause, resume, archive. |
| 5 | **Settings** (`settings`) | (1) Sender display, approval steps, confidentiality footer, meeting lead time (days before a meeting the before part is due). (2) Questions and "I can help" on or off (app-wide; categories can turn them off). (3) Email default texts (update, meeting before, meeting after, answer, not-read reminder). (4) Customization (§8a) and links to Access and Automations, naming the app's automations and where they live. |

---

## 5. Workflows

1. **Set up (minutes):**
   - The install dialog connects existing `people`/`organizations` (e.g. from Fundraise) and turns on the recommended automations (§11).
   - The standard categories and templates are already there. Add people, or ask the assistant: "Add our board and the Series A investors from Fundraise, with their share classes from the shareholder register."
   - Accept the standard plans (Board – monthly update; Investors and shareholders – quarterly update) or create your own, then **Set up automation** for each plan's scheduled draft.
2. **Email update:** on the draft date the plan's automation runs on the owner's Claude or ChatGPT runner. It reads the brief (template, categories and their descriptions, rules), the allowed sources as of the period end, and the previous update with its engagement, and creates the update in review (create only). The owner gets "ready for review" (§11). On request, the same comes from chat: "Draft the October board update", "Write a milestone flash for investors and shareholders about the Phase 1 start".
3. **Meeting:**
   - Add a meeting (title, date and time, place or call link as text, invited categories), from a plan with a meeting cadence or one-off. The assistant can propose one from the user's notes.
   - **Before:** *lead time* days ahead (default 7), the automation drafts the agenda and pre-read, citing platform documents that are attached to the page. Review, approve and send to everyone invited.
   - **Questions:** invitees ask on their page. The assistant drafts answers; a person sends each privately or to everyone invited (asker not named).
   - **After:** "Draft the recap from my notes" (or a transcript the user shares). The recap reports what the user says was decided, next steps and any slides; approve and send. It is not minutes.
4. **Review:** the app re-checks every record-sourced fact (✓ or "changed since draft"). The owner revises in chat or edits blocks. Approver 1 (optional, e.g. CFO) checks numbers; approver 2 (CEO) approves.
5. **Send:** the send review shows each category version exactly as it will go out, with its recipients. A person in several categories of one send gets one email: the highest version they may see. The owner can pre-approve a not-read reminder. One confirmation sends; the part locks, its PDF is filed, and later edits create a correction notice, never a silent change.
6. **Engage:** reads, questions and offers of help arrive through the platform. The owner assigns follow-ups; the next draft receives the engagement summary.
7. **Preset or AI, either way:** pick a template and plan, or ask for something new. Any draft can be saved as a template; the assistant can propose templates, categories, plans and share classes (reviewed).

---

## 6. Content model and design

The assistant designs inside safe **blocks**; the app renders them into email-safe HTML and the online page using the template's design (U1, U2).

| Block | Content |
|---|---|
| `heading`, `text` | Title, TL;DR, narrative sections (limited markdown) |
| `metrics` | Up to 6 figures with label, value, unit, change and fact reference |
| `table` | Small tables, e.g. program status or use of funds |
| `chart` | Line or bar from a short data series the assistant supplies; an image in email, with fact references |
| `milestones` | Done, next and slipped items, with dates and fact references |
| `meeting` | Date, time, place or call link (text), invited categories (meeting parts only) |
| `agenda` | Items with presenter, time and linked document (before part) |
| `next_steps` | Owner and due date per step, as reported (after part) |
| `asks` | Specific asks; each gets "I can help" (U3) |
| `callout`, `divider`, `image` | Highlights or lowlights; images from platform documents |

- Every block has a **level**: `board`, `investors` or `everyone`. Templates set defaults per section; the assistant or user can change a block's level. A category version contains the blocks at or below the category's level; recipients never see what was removed.
- No free HTML from the assistant.
- **Fact list:** claim, value, source (record ref: app, table, record and field; document ref with page; or "user-stated in chat" with date), as-of date and check status (verified / changed / unverified). Numbers in blocks must reference a fact.

---

## 7. Platform exchange usage

No new platform features are needed.

| Need | Exchange feature |
|---|---|
| One sent email update or meeting part | One exchange group in room mode (§5 R1) with the content (U1), bound to the `updates` record; one exchange per recipient, bound to the `deliveries` record |
| Full content in email | U2 rich email body from the rendered version, plus the personal link and footer |
| Meeting documents | Room documents (§5) from platform documents |
| Read tracking | Room view events (§5 R4) and the bound delivery table (R7) |
| Offers of help | U3 ask buttons with optional note, written to `responses` (kind `help`) |
| Questions | Exchange messages on the recipient page, written to `responses` (kind `question`); answers by `exchange.reply` (private) or `exchange.publishClarification` (everyone in the group) |
| Archive per person | U4 series per plan, and per meeting series (before and after parts share it) |
| Unsubscribe | U2 one-click unsubscribe per series, honoured by later sends |
| Emails | Types *update*, *not-read reminder* (pre-approved at send) and *answer*; defaults per type; `exchange.prepareEmail` shown exactly as returned; `exchange.sendEmail` human-confirmed |

Assistants can prepare drafts, answers and email texts but never approve, send, or see recipient links.

---

## 8. Data model

Principles as in [Runway §5](RUNWAY.md#5-data-model). App tables use the `investorupdates.*` prefix.

**Shared roles**

| Role | Contract | Mode | Use |
|---|---|---|---|
| `people` | core.v1 | read/write | Recipients (name, organization_id, title, email) |
| `organizations` | core.v1 | read/write | Firms (investors, funders, partners) |
| `programs` | core.v1 | optional, read | Context for drafts |

Draft sources (Runway, Programs, Fundraise, Partnerships, Contracts, Bio Radars, Data Room outputs, documents) are read by the assistant under the user's access, not bound as app tables. Each source reference is recorded in the fact list.

**Own tables (`investorupdates.*`)**

| Table | Key fields (kind) |
|---|---|
| `settings` (one row) | sender_display (select: organization / first_name), approval_steps (select: one / two), help_enabled (boolean, true), questions_enabled (boolean, true), meeting_lead_days (number, 7), confidentiality_footer (text), custom_fields (text, JSON), labels (text, JSON), preferences (text, JSON) |
| `categories` | name (text*), kind (select*: board / investors / shareholders / custom), level (select*: board / investors / everyone), description (text: who they are and what they care about; read by the assistant), share_class_ids (text, JSON list: members are everyone holding any of these classes, in addition to people added directly), default_template_id (text), help_on (boolean, true), questions_on (boolean, true), archived (boolean) |
| `share_classes` | name (text*), kind (select*: common / preferred / convertible / other), notes (text, e.g. information rights in words), sort_order (number), archived (boolean) |
| `recipients` | person_id (text*), organization_id (text), category_ids (text, JSON list: direct membership), share_class_ids (text, JSON list: classes held), status (select*: receives / paused), unsubscribed_on (date, tracked), notes (text), source (select: manual / assistant / fundraise / captable), archived (boolean) |
| `templates` | name (text*), kind (select*: board_monthly / investor_quarterly / milestone_flash / meeting_before / meeting_after / custom), format (select*: email / meeting_before / meeting_after), sections (text*, JSON: name, purpose, default level), brief (text: tone, length and rules in words), design (text, JSON: logo document id, colours, block styles), source (select: standard / user / assistant), archived (boolean) |
| `plans` | name (text*), format (select*: email / meeting), template_id (text*), after_template_id (text, meetings), category_ids (text*, JSON list), sources (text*, JSON: apps, document ids, standing notes, exclusions), cadence (select*: monthly / quarterly / half_yearly / yearly), send_by_day (number, 7; email plans), timezone (text), approver_1 (text), approver_2 (text*), status (select*: active / paused), archived (boolean) |
| `meetings` | title (text*), kind (select*: board / shareholders / investor_call / advisory / custom), meeting_date (date*), start_time (text, HH:MM), timezone (text), location (text: place or call link, shown as text), plan_id (text), category_ids (text*, JSON list: invited), status (select*: planned / held / cancelled), notes (text), archived (boolean). Its before and after parts are the `updates` with this `meeting_id` |
| `updates` | format (select*: email / meeting_before / meeting_after), plan_id (text), meeting_id (text), kind (select*: scheduled / one_off / flash), period (text, e.g. "2026-10" or "2026-Q3"), title (text*), category_ids (text*, JSON list), status (select*: drafting / in_review / approved / sent / cancelled), blocks (text*, JSON, with levels), facts (text*, JSON), asks (text, JSON), document_ids (text, JSON), drafted_by (select: claude / chatgpt / user), drafted_on (date), approved_1_by (text), approved_2_by (text), approved_on (date), sent_on (date), exchange_group_id (text), pdf_document_id (text), correction_of (text), sent_settings (text, JSON: responses and reminder as sent) |
| `deliveries` | update_id (text*), recipient_id (text*), category_id (text*), level (select*), email (text*), exchange_id (text), sent_on (date), status (select*: queued / sent / bounced / read / revoked), first_read_on (date), last_read_on (date), read_count (number) |
| `responses` | update_id (text*), recipient_id (text*), kind (select*: help / question), ask_key (text), message (text*), responded_on (date*), answer (text), answered_on (date), answer_scope (select: private / group), status (select*: new / answered / following_up / done), owner (text), follow_up_due (date) |

`*` = required. The platform keeps `deliveries` read fields, `unsubscribed_on` and incoming `responses` current as system writes (`source: tracked`, R7/U3); people and assistants cannot edit those fields. A sent `updates` row is immutable except `correction_of` links. Install creates the three standard categories and five standard templates as normal records the user can edit or archive; `share_classes` starts empty.

**Share classes later.** When a cap-table app exists, it will publish holdings (person or organization, share class, amount) as an output; Investor Updates will offer "Use its data" for `share_classes` and holdings, read-only, as an in-app integration, and keep its own lists until then. Category rules by class keep working unchanged.

**Outputs:** none in v1. Board (14) can read `meetings` and their parts later through an output added when Board is built.

### 8a. Customization by Claude and ChatGPT (AI-native, within scope)

Each change is one reviewed proposal; IDs, bindings, access and records are kept and the app body is unchanged.

| What | How |
|---|---|
| Screens and columns | Layout gear or `prepare_tool_layout`: order, labels and visibility of the five screens and the investors and updates columns |
| Categories and share classes | New custom categories (description, level, class rule) and share classes; rename or archive standard categories (the `kind` key never changes) |
| Templates | New templates, or a draft saved as one; sections, brief, design and default levels |
| Labels | `settings.labels`: e.g. "Board" → "Supervisory board", "Shareholders" → "Members" |
| Preferences | `settings.preferences`: opening screen, rows per page, hidden Overview panels |
| Custom fields | Added to recipients, meetings or updates by a reviewed schema change and registered in `settings.custom_fields`; shown in editors and details. Core and contract fields are never renamed, retyped or shadowed |

---

## 9. Calculation and checking rules

- **Email periods.** From the plan's cadence: the period ends at the month or quarter end; send-by = day `send_by_day` after it, in the plan's time zone. **Overdue** = no sent update for the period after send-by.
- **Meetings.** A meeting plan's cadence proposes the next meeting (the user sets the exact time). **Before due** = `meeting_date − meeting_lead_days`; **late** if not sent by then. **After due** = 7 days after `meeting_date` (shown, never enforced).
- **Category membership** = people added directly + people holding any of the category's share classes, minus paused, unsubscribed (for that series) and archived recipients.
- **Versions.** Level order: everyone < investors < board. A version contains blocks with level ≤ the category's level. A person in several categories of one send gets the highest permitted version once; `deliveries.level` records which.
- **Fact check at review:** record-sourced facts are re-read (✓ or "changed since draft" with both values); document-sourced facts are checked to exist; user-stated or unsourced facts are "unverified". Approval is blocked while a number lacks a fact reference; unverified facts need the approver's tick.
- **Promise tracker.** Dated statements in the previous sent update of the same plan (or the previous meeting of the same kind) are compared with the new draft; a changed or missing date is flagged.
- **Read rate** = recipients with a read ÷ recipients delivered, per update or part and per category.
- **Unsubscribe** excludes the person from later sends of that series; their history stays.
- As-of handling as in Programs §7; bounded reads (800 rows per table).

---

## 10. Access control and AI

- **App-level access as usual.** Updates are confidential. Sending needs the Access right "Send to people outside the workspace". Approvers are named per plan. Tab access can restrict who sees Investors (share classes) and Updates.
- **Claude and ChatGPT** (each user's connection) draft, design and revise updates, agendas, pre-reads, recaps and answers; propose investors, categories, share classes, templates, plans and meetings; and summarise engagement. They read only what the user may read and only the sources the plan allows. They never approve, send, unsubscribe someone or see recipient links.
- **Recipients** see only their own page, the updates of that series sent to them, their own responses and answers, and answers published to their group.

### 10a. App commands and integrations

Follow the platform standards as shipped in Partnerships 2.2.0 (§12b there) and template authoring guidance 1.3.31 ("App commands and Edit in App").

- **App commands.** `appCommands` (line 2 of the source, single-line JSON) declares read, propose and layout commands covering every screen and control. Assistants use them through `list_app_commands` / `run_app_command`, as the caller with the caller's permissions. Command families: read (`overview.read`, `updates.list`, `update.read` with its versions and fact check, `meetings.list`, `meeting.read`, `investors.list`, `investor.read`, `categories.list`, `share_classes.list`, `plans.list`, `templates.list`, `responses.list`, `engagement.read`, `settings.read`, `schema.describe`, `integrations.read`); propose (`update.create_draft`, `update.save_blocks`, `update.set_levels`, `update.submit_for_review`, `meeting.create`, `meeting.update`, `investor.create`, `investor.update`, `investor.set_categories`, `investor.set_share_classes`, `category.save`, `share_class.save`, `template.save`, `template.save_from_update`, `plan.save`, `response.draft_answer`, `response.set_status`, `settings.save`, `preferences.save`, `labels.save`, `custom_field.register`, `record.archive`); layout (`layout.save`).
- **Parity.** Propose commands replay the screens' own handler, so the review is identical to the click path; proposals are buffered into one review (at most 50 record changes). Read commands return the app's own calculations (versions, due dates, read rates, fact checks); assistants never recompute them.
- **Never through commands:** approve, send, answer a recipient, unsubscribe someone, see recipient links, or write another app's tables.
- **Integration standard.** Values from a role another app writes (later: cap-table holdings) are labelled **From *App*** with **Edit in *App*** (`data-trialy-open`), and hand entry for that role is refused while the integration is linked (`role_read_only`). Bound fields this version does not know show read-only as "Additional fields" and can be registered as custom fields.

---

## 11. Automations

Declared in `catalog.metadata.json` under the app automations scope, following Fundraise 2.0.0. Install recommendations are on by default; the owner can turn any off in Add app. The app stores no schedules, recipients or on/off settings for them; Settings names them and links to Automations.

| Key | Kind | What | Trigger | Saves / sends |
|---|---|---|---|---|
| `meeting_before_draft` | Install recommendation (on) | Agenda and pre-read draft | Record date: `meetings.meeting_date` minus 7 days, 08:00 workspace time | Research on the owner's runner with the brief from helper `meeting_brief` (meeting, invited categories and descriptions, the previous meeting of the same kind and its questions, sources). Creates one `updates` row (format meeting_before, status in_review) with `meeting_id`; create only. The brief marks meetings that are cancelled, held or already have a before part, and research skips them (recipes cannot filter by status). |
| `ready_for_review` | Install recommendation (on) | Ready for review | Database: `updates.status` becomes `in_review` (new or updated record) | Email to the owner: title, format and "Review in Investor Updates → Updates". Static text with record fields, no helper. Assistant drafts are created in review, so every scheduled draft, meeting draft and chat draft triggers it once. |
| `new_response` | Install recommendation (on) | New question or offer of help | Database: `responses` created | Email to the owner with the person, kind and message. |
| `weekly_digest` | Install recommendation (on) | Weekly digest | Calendar, Mondays 08:00 workspace time | Email to the owner written by helper `updates_digest` (E1/E7, read only): email updates due or overdue, meetings in the next 21 days with their before status, meetings held without an after part, drafts waiting for approval, unanswered questions, open offers of help. Nothing to report sends nothing. |
| `scheduled_draft` | App feature, per plan record | Scheduled email update | Calendar from the plan's cadence (e.g. 3rd business day after the period end) | Research on the owner's runner with the brief from helper `plan_brief` (plan, template, categories, sources, previous update and its engagement). Creates one `updates` row for the period in review (create only); dedup by plan + period. Set up from the plan's **Set up automation** or Automations → From app features; one per email plan. |

**Not automations** (user-triggered sends and their pre-approved follow-ups, in the exchange): sending an update or meeting part, answers, and the not-read reminder pre-approved at send.

The `meeting_before_draft` lead time is the automation's offset; changing `settings.meeting_lead_days` changes what the app shows as due, and Settings offers "Update the automation too", which opens the platform editor.

**Without automations:** Overview shows what is due and late; drafts are requested in chat; everything else works.

---

## 12. Connections to other apps (by role, any install order)

| App | How | What the user gets |
|---|---|---|
| **Runway (01)** | Draft source: month closes and scenarios | Cash, burn and runway with sources |
| **Programs (02)** | Draft source: milestones, reports, gates and decisions | Milestones done, next and slipped; decisions for the agenda |
| **Fundraise (03)** | Shares `organizations` and `people`; the assistant proposes recipients (and their new share class) from closed rounds; round status as a source | Investor list after a round; round progress for the board |
| **Contracts (04)** | Draft source: material agreements, upcoming notices | "Material contracts" for the board |
| **Partnerships (07), Data Room (08)** | Draft sources: deal stages, diligence activity | Partnering progress |
| **Bio Radars (10)** | Draft source: radar events | A sourced landscape section |
| **Board (14)** | Later: reads `meetings` and their parts; shares `people` | Minutes and resolutions for the same meetings |
| **Cap table (later)** | Later: holdings output, read once linked ("Use its data") | Share classes and holders kept in one place |

Investor Updates never writes another app's own tables.

---

## 13. Assistant behaviour

- Draft from the brief: follow the sections, tone, rules and each category's description; lead with cash, runway to the next milestone and program progress; give honest lowlights; make asks specific.
- Set each block's level deliberately: board-only for negotiations, disputes, people matters and anything the template marks; respect information rights described on share classes; never raise a level the user lowered.
- Every number references a fact with its source; never invent figures; say "not available" when a source is missing. Never state ownership percentages or holdings unless the user provides a document.
- Stay consistent with earlier updates and meetings; explain changed dates and numbers.
- Agendas: from open decisions, milestones and the previous meeting's next steps. Recaps: only what the user says was decided; never present a recap as minutes or a resolution.
- Answers to questions: factual, sourced, short; draft only.
- Never: approve, send, add recipients without review, mention excluded topics, or give legal or securities advice.
- **`whenToUse`:** keeping the board, investors, shareholders and other groups informed by email updates or meetings: investors and categories (including share classes), templates, plans, scheduled AI drafts, agendas, pre-reads, recaps, questions, review, sending, read tracking and responses. **`whenNotToUse`:** outreach to prospective investors (Fundraise), formal minutes, resolutions, consents and votes (Board), cap-table management, press releases.

---

## 14. Package checklist and acceptance criteria

**Package:**
- source under `templates/source/investor-updates/` and immutable `templates/apps/life.investor-updates-1.0.0.json` (draft until approved)
- roles as in §8; standard categories and templates created at install
- helpers `plan_brief`, `meeting_brief` and `updates_digest` (E7, read only) and the automation declarations in §11
- email default texts; block renderer for email and the online page
- full `catalog.metadata.json`; fictional `demo_data.json`: 4 firms, 10 people (5 board members, one independent), 3 share classes, 3 standard + 2 custom categories (one defined by share class), 3 plans, 2 meetings (one board meeting with before, questions and after; one investor call planned), 3 sent email updates, 1 draft
- `templateLayoutSchema` with five screen ids; build `--check` and browser test

**Acceptance (beyond the shared contract and exchange tests):**
1. **Install:** the dialog shows four recommended automations, all on; Add app creates the app, three categories, five templates and the selected automations.
2. **Categories and share classes:** a custom category "Series A holders" defined by the Series A preferred class includes everyone holding it plus anyone added directly; a person in Board and Investors receives one email, the board version.
3. **Versions:** one draft with board-, investor- and everyone-level blocks yields three previews that differ only by those blocks; recipients cannot see removed blocks.
4. **Email update:** after **Set up automation** on a monthly board plan, the automation creates one draft for the period; a second run creates none. "Draft now" in chat produces the same. The owner gets the ready-for-review email.
5. **Meeting, before:** a board meeting and a quarterly investor call 7 days away each get a drafted agenda and pre-read with cited documents attached; the sent part shows "3 of 5 read".
6. **Questions:** an invitee asks on their page; an answer sent privately reaches only them; an answer to the group reaches everyone invited without naming the asker.
7. **Meeting, after:** a recap drafted from pasted notes is approved and sent to everyone invited, in the same series as the before part.
8. **Fact panel and promise tracker:** a changed record-sourced number is flagged with both values; a number without a fact blocks approval; a moved milestone date is flagged.
9. **Send:** two-step approval, then one confirmation; the email equals the preview; one link per person; the part locks and the PDF is filed; a pre-approved not-read reminder reaches only non-readers.
10. **Engagement and unsubscribe:** reads and responses update without review and are not editable; an unsubscribed person is excluded from the next send of that series.
11. **Both workflows:** a one-off update without a template is drafted, approved and sent, then saved as a template and used by a new plan.
12. **Assistants** draft and propose but cannot approve, send or see links; they read only the allowed sources. Every propose command gives the same review as the click path; there is no command to approve or send.
13. **Modularity and archiving:** rule 9 and archive-first checks pass; archiving pauses the linked automations and stops online links; restoring makes unexpired links available again, and automations return disabled until resumed.
14. **No automations:** with all recommendations off the app works fully; Overview shows due and late items.
15. **Layout:** desktop 1440 and mobile 390 for the app and the recipient page; the email renders in Gmail, Outlook and Apple Mail.

**Open for design partners:** the standard categories and levels; whether share classes are worth entering before a cap-table app exists; which meeting types they run (board, shareholder, investor call, advisory); whether they want recaps or only minutes (Board, 14); whether two-step approval is wanted.
