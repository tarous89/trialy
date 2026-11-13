# External exchange — platform scope

**Status:** Platform scope, 12 November 2026; implemented in PR #147 (template guidance 1.3.22); one confirmation per outgoing communication from 13 November 2026 (guidance 1.3.24, §2.8). First consumer: [CRO Selection](app-template-blueprints/apps/CRO_SELECTION.md) (RFI/RFP to suppliers). Designed to be reused by Data Room secure rooms, Diligence Q&A, Site Finder feasibility questionnaires and Investor Updates. Extends the existing public forms (`create_collection_link`, `list_collection_responses`, `accept_collection_response`, `src/domain/exchange.ts`, `src/server/external.ts`). Follows [access control](../ACCESS_CONTROL.md), [write authorization](../WRITE_AUTHORIZATION.md), [shared data](../SHARED_DATA.md), [modular apps](MODULAR_APPS_AND_SHARED_DATA.md) and the interface rules.

**Owner decisions (12 Nov 2026):** per-recipient links before CRO Selection; outbound email to people outside the workspace **from the TrialAgents domain**; simple document exchange (e.g. CDA PDF out, signed PDF back), optional; back-and-forth messages and shared clarifications **in version 1**.

---

## 1. What exists today

| Capability | Today |
|---|---|
| Public form link | One link per form; fields of one table + questions; optional file request (max 3 files); expiry 1–90 days; owner-only creation via workspace review; anyone with the link submits without signing in |
| Read-only view link | Live read-only view of a saved view |
| Responses | Enter the owner's review inbox; `accept_collection_response` saves an immutable acceptance; files stay in human review until accepted, never silently exposed to AI |
| Email | TrialAgents email actions send only to registered, authorized workspace members |

## 2. What to add

An **exchange** is a per-recipient, time-limited page that a workspace sends to someone outside it. It has up to five parts, each optional, chosen by the app that creates it:

| Part | Recipient sees / does | Workspace sees / does |
|---|---|---|
| **Brief** | Title, summary text, key dates, sender name and company | Writes it in the app |
| **Documents out** | Downloads documents the workspace shared (e.g. RFP pack, bid-grid template, CDA to sign) | Chooses platform documents to share; each download is logged |
| **Response form** | Answers questions and fields; uploads files (up to 10, 25 MB each); **saves a draft and resubmits until the deadline**; each submission is time-stamped and versioned | Receives each submission in the review inbox, linked to the recipient's record; accepts into working records |
| **Documents back** | Uploads a requested document against a named slot (e.g. "Signed CDA") | Sees slot status (requested / received / accepted); accepts into Documents |
| **Messages** | Private thread with the workspace; sees **clarifications** published to all recipients of the same exchange group (asker never named) | Replies privately, or **publishes** a question and answer as a clarification to all recipients (asker shown as "A recipient asked"); can post a clarification without a question (addendum) |

### 2.1 Per-recipient links

- An app creates an **exchange group** (e.g. one RFP) and one **exchange** per recipient, each bound to a workspace record (e.g. the CRO Selection invitation) and one or more recipient emails.
- Each exchange has its own unguessable link. Optional **email verification**: the recipient enters their email and a one-time code (same mechanism as team invitations); on by default for exchanges that share documents.
- Deadline = exchange expiry (1–90 days, extendable by the owner). After the deadline: read-only page with "Submissions closed"; no new submissions or uploads; messages stay open only if the owner allows.
- Revoke at any time; revoking keeps all received content.

### 2.2 Confidentiality gate

Per exchange group, one of:
- **None**.
- **Click-through acknowledgement** (default when documents are shared): the recipient accepts a short confidentiality text set by the workspace before seeing Documents out; acceptance (name, email, time) is logged.
- **Signed document required**: Documents out (other than the document to sign) unlock only after the workspace marks the requested signed document as accepted (e.g. a signed CDA).

### 2.3 Outbound email from the TrialAgents domain

- **From:** `no-reply@trialagents.com`. **Display name:** "<Organization name> at TrialAgents" (default) or "<User first name> at TrialAgents", chosen per send; the user or an assistant can edit the name part (e.g. "Acme Bio Clinical Ops at TrialAgents"); the " at TrialAgents" suffix stays fixed so recipients always see where the email comes from. The last choice is remembered per user and workspace. **Reply-To:** the sending user's email, so replies reach the sender directly; the footer says "Replies go to <sender email>; you can also answer on your page." SPF, DKIM and DMARC aligned for `trialagents.com`; bounce and complaint handling; per-workspace and per-day rate limits; suppression list.
- Email types: invitation (with link), reminder before deadline, clarification published, new message, deadline extended, exchange revoked. Every email carries the link, never attachments.
- **Default message for every planned email.** Each email type has a default subject and body, written plainly, with placeholders: `{recipient_name}`, `{recipient_company}`, `{sender_name}`, `{sender_company}`, `{title}`, `{deadline}`, `{link}`, `{message}` (for clarification and message emails). Apps can supply their own defaults per email type (e.g. CRO Selection "RFP invitation"); the workspace can save its own default per type, which then replaces the app default.
- **Edit and personalise before sending.** The send review shows each email exactly as it will be sent (subject and body with placeholders filled). The user can edit the text for everyone in the batch, or personalise individual recipients (e.g. a sentence for one CRO). Claude or ChatGPT can propose edits or personalised versions on request; the user sees and confirms the final text. The link, sender identity and footer cannot be removed.
- **Every send is human-confirmed** in the app (one review for a batch: recipients, subject, final text per recipient). Assistants may draft, personalise and prepare the send, never confirm it. Reminders that the owner pre-approved for a request use the saved text and are listed in the request's activity.
- No open-tracking pixels; delivery status only (sent / delivered / bounced). Footer identifies the sending person, organization and TrialAgents, with a "report abuse" link.
- Recipients are limited to email addresses on the exchange's recipient list; no free-form mass mailing.
- Inbound replies go to the sender's own mailbox (Reply-To); messages written on the exchange page go into the thread.

### 2.4 Notifications to the workspace

New submission, new message, document uploaded, deadline passed: in-app and email to the exchange owner and assigned members (registered members only, existing rules).

### 2.5 Data, access and AI

- Exchange content is stored as platform data linked to the app record: submissions (versioned), uploaded files (as documents after acceptance), messages and clarifications (immutable after send, with edit = new message), access events (opened, document downloaded, acknowledgement).
- Who can create exchanges, send email and read content follows the app's access and a new Access row "Send to people outside the workspace" (owner on by default; members off unless granted).
- AI (each user's Claude and ChatGPT connection) can read accepted submissions, messages and clarifications the user can read; **unaccepted uploaded files stay out of AI reach** (existing rule); AI can draft replies and clarifications for human sending.
- Retention: content stays with the app record; archiving the app archives exchanges (links stop working); restore re-enables only if not expired.
- Privacy: the recipient page shows who is collecting the data and a short privacy notice; personal data is limited to name, email, organization and what they submit.

### 2.6 App API (for templates and custom apps)

Exposed through the app runtime (`tools.call`) and MCP, each write via workspace review:
- `exchange.createGroup`, `exchange.invite` (per recipient, bound to a record), `exchange.updateBrief`, `exchange.shareDocuments`, `exchange.requestDocument`, `exchange.extend`, `exchange.revoke`.
- `exchange.defaultEmail` (default subject/body for an email type, app or workspace default), `exchange.prepareEmail` (batch text + per-recipient overrides, rendered preview), `exchange.sendEmail` (human-confirmed).
- `exchange.listSubmissions`, `exchange.acceptSubmission` (maps fields into the app's tables, like `accept_collection_response`).
- `exchange.listMessages`, `exchange.reply` (private), `exchange.publishClarification` (to group).
- Read-only status per exchange for app UIs: opened, acknowledged, documents downloaded, draft saved, submitted (version, time), documents back status, unread messages.

### 2.7 Recipient page design

Same TrialAgents design system, light and plain: company name and logo of the sender, title, deadline countdown, then tabs or sections **Brief · Documents · Your response · Messages**. Mobile friendly. No TrialAgents account or marketing shown; small "Powered by TrialAgents" footer.

### 2.8 One confirmation, when something goes out (owner decision, 13 Nov 2026)

- Preparing what nobody outside has seen yet (a new group, new links, and documents, brief, requested slots or a silent deadline change until the first email, reminder approval or recipient visit) is applied on a person's own click in an app and audit-logged. No separate review.
- Everything that reaches recipients or brings their data in is one review: sends (with the plan: documents, requested documents, gate, deadlines, and every email as sent), private replies (one or many: `reply_exchanges`), clarifications, notices of extension or revocation, revocation, and acceptance of submissions and files. Changes to anything recipients have already seen are reviewed too.
- The app's own record changes in the same action (for example the supplier's status "invited") join that review and commit in the same transaction: nothing is sent without them and nothing is saved without the send.
- Groups carry an optional `app_ref` (migration 066) so apps find their rounds without copying IDs into records.
- Assistants never confirm; for them every exchange operation stays a review.

## 3. Out of scope (v1)

Recipient accounts or portals; e-signature (signed PDFs are uploaded back); watermarking (view tracking and rooms: see §5); open tracking; attachments in emails; auctions; recipients seeing each other.

## 4. Acceptance criteria

1. Two recipients in one group get different links; each submission lands on the right invitation record.
2. Draft save and resubmission work until the deadline; after it, the page is read-only and uploads are refused.
3. Click-through acknowledgement is required before documents; with "signed document required", other documents stay locked until the owner accepts the signed upload.
4. A private reply is visible only to that recipient; a published clarification appears for every recipient in the group without the asker's identity, and triggers an email to each.
5. Outbound email: sent from `no-reply@trialagents.com` with display name "<Organization> at TrialAgents" or "<First name> at TrialAgents" (name part editable by user or assistant, suffix fixed) and Reply-To the sender; default text per email type with placeholders; batch edit and per-recipient personalisation shown exactly as sent; human confirmation required; DKIM/SPF/DMARC pass; bounces recorded; rate limit enforced; assistants can draft and personalise but not send.
6. Unaccepted uploaded files are not readable by AI; accepted ones follow document AI permissions.
7. Revoking a link stops access immediately and keeps all received content.
8. Recipient page works at 390 and 1440 px, keyboard accessible, contrast ≥ 4.5:1.
9. Audit log records invitations, sends, opens, acknowledgements, downloads, submissions, messages, clarifications, acceptances and revocations.

## 5. Room extension (for Data Room)

**Status:** scoped 13 November 2026 for [Data Room](app-template-blueprints/apps/DATA_ROOM.md) (BT2-08); implemented as its own PR before the Data Room app (migration 065, `src/domain/exchange-room-model.ts`, `src/domain/exchange-rooms.ts`, recipient page `src/web/RecipientRoom.tsx`; template guidance 1.3.23; tests `tests/exchange-rooms.test.ts` and `tests/visual/exchange-room.spec.cjs`). Everything in §2 still applies (per-person links, verification, gates, review, audit, email rules, AI rules). Additions:

| # | Addition | What it does |
|---|---|---|
| R1 | **Room mode** | Group kind `room` (default kind `request` is today's behaviour). No response form, no submissions and no deadline countdown. Access lasts until revoked, or until an optional end date (1–730 days, extendable). The page shows **Room · Q&A** instead of Brief · Documents · Your response · Messages. |
| R2 | **Sections and index** | Shared documents carry `section` (number and title) and `order`. The recipient page shows a numbered index with search, a document count per section, and *New* / *Updated* badges since the person's last visit. |
| R3 | **Levels** | A group defines ordered levels (e.g. Non-confidential, Confidential, custom). Each shared document has one level; each exchange holds its allowed levels. `exchange.setLevels` is a reviewed operation. Each level has its own entry step: none, click-through text, or *signed document required* (existing slot and acceptance flow), so a signed CDA unlocks only the level it protects. A person never sees, searches or is notified about documents above their levels. |
| R4 | **Viewer and view events** | Inline viewer for PDF and images (other types download). A `viewed` event is recorded per document version, with approximate visible seconds from viewer heartbeats. A `view_only` option per document hides the download (no DRM claim). `exchange.status` adds per-document views, seconds, downloads and last seen. |
| R5 | **Versions in place** | `exchange.replaceDocument` swaps a shared document for a newer version of the same platform document, keeping its section, order and level. Only the latest version is shown; earlier views stay in the record. |
| R6 | **Room Q&A** | In room mode, recipients ask questions (text, optional section or document reference) instead of free messages. Questions reach the app as question events bound to the exchange. The workspace answers privately (`exchange.answer`), or publishes to the whole room or to one level (`exchange.publishAnswer`, asker anonymised). Answers are immutable after send; editing creates a new answer. |
| R7 | **Bound output tables** | A room group can bind an access table and an engagement table (the app's `dataroom.access_grants` and `dataroom.engagement`). The platform keeps grant status, `last_seen_on` and engagement rows current from exchange events, as system writes labelled `source: tracked`. These are recorded facts, so no review is needed; people and assistants cannot edit them. Archiving the group stops updates. |
| R8 | **Room emails and notifications** | New email types: *access granted* (invitation), *access changed* (levels), *documents updated* (daily digest listing only documents at the person's levels; sent automatically only when the owner pre-approved the room's digest text), *question answered*, *answer published*, *access ending*, *access revoked*. Defaults, editing, personalisation, display name and human confirmation work as in §2.3. Workspace notifications: first open per person, question asked, access ending, and optionally a hot or quiet party. |

**Additions for Data Room (13 November 2026, guidance 1.3.25):**
- Room operations carry the app's record changes in the same review.
- `set_exchange_levels` can record a level's entry step as met for one person (`entered`, with a required note; migration 067), for a CDA in place elsewhere or on file in Contracts.
- `accept_exchange_file` with `notify` emails the access change when a signed document opens a level.
- Room status adds `openLevels` and an access history for the disclosure record.

**Acceptance (room extension):**
1. A room group has no form or deadline; access ends only on revoke or the end date.
2. Levels are enforced on the page, in search, in "what changed", in published answers and in the digest.
3. A signed CDA unlocks only its level.
4. Each view and download is recorded per version with an approximate duration. View-only hides the download.
5. A replaced document keeps its place and shows as *Updated*.
6. Bound tables update without review and cannot be edited by people or assistants.
7. Q&A: a private answer reaches only the asker; a published answer reaches the room or level without naming the asker; each triggers the matching email.
8. Every new email type is shown exactly as sent and is human-confirmed, or pre-approved for the digest; assistants can draft but not send.
