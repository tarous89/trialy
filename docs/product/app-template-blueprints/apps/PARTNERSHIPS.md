# Partnerships — final app scope (BT2-07)

*Track out-licensing, in-licensing and collaboration deals by asset, from first contact to signature: conferences, follow-ups and partner news, with the assistant doing the research and the admin.*

**Status:** Final scope for build, 14 November 2026. Part of [Biotech apps v2](../BIOTECH_v2.md) (rank 7, formerly "Partnerships"). It **replaces** `life.partnership-tracker` 1.1.1 as **2.0.0**, display name **Partnerships**. No existing users, so no data migration.

**Depends on:** nothing new in the platform. It uses TrialAgents Automations (research worker on the user's Claude or ChatGPT runner, and email to workspace members). It connects by role to Programs, Contracts and Data Room. **One PR.**

**Governing contracts:** project context, template authoring and usage guidance (latest, all `nextOffset`s), shared build contract, interface rules, access control, write authorization, field capabilities, shared data, [modular apps and shared data](../../MODULAR_APPS_AND_SHARED_DATA.md), automations guidance, and the contract registry. They win on any conflict.

**Decisions (14 Nov 2026):**
- **All directions.** Out-licensing, in-licensing, co-development, research and academic collaborations, platform deals and other partnerships run in one pipeline, with a direction per opportunity.
- **Outreach stays personal.** The app never sends outreach. People write and send from their own mailbox and meet in person; the app tracks, reminds, notifies and gives the process structure. The assistant may suggest wording only when asked.
- **Everything comes in through the assistant.** Conference requests, meeting notes, emails or a pasted list: the user gives them to Claude or ChatGPT, which proposes the records (reviewed). There is no special upload or partneringONE import.
- **Tags and saved views.** Users group work by conference, asset, channel, stage or any category they add, and save views per category value (e.g. "BIO-Europe 2026", "Asset X – out-licensing").
- **Partner research is central.** A scheduled research worker finds partner news and new target suggestions per asset. The cadence is daily, weekly or monthly (**weekly by default**), with a concise summary email to the team.

---

## 1. The journey

| # | Stage | What the app does |
|---|---|---|
| 1 | **Set goals per asset** | Partnering profile per asset (program): direction, deal types sought, territories, target profile, non-confidential materials and their versions |
| 2 | **Map targets** | The research worker and the user propose target companies with a fit rationale and sources; accepted targets become opportunities |
| 3 | **Prepare a conference** | Conference space: dates, partnering deadlines, goals, team, who to meet; the assistant adds requests and meetings from what the user gives it; a one-page brief per meeting |
| 4 | **Meet and log** | After each meeting or call the user tells the assistant what happened; it logs the activity, materials shared, stage change and next steps (reviewed) |
| 5 | **Follow up** | Follow-ups with owner and due date, reminders, stalled-deal flags |
| 6 | **CDA and evaluation** | CDA status from Contracts; confidential access and engagement from Data Room |
| 7 | **Term sheet to signature** | Term sheet and agreement filed in Contracts, linked to the opportunity; won or lost with a reason |
| 8 | **Learn** | Funnel and win/loss by asset, direction, channel and conference; next research run uses what changed |

---

## 2. Evidence and references

Sources read 14 November 2026: Inova (vendor and Capterra pages), BIO-Europe/partneringONE guidance (Informa/EBD), France Biotech biopartnering best practices, out-licensing playbooks (Peony, Alacrita, ShareVault, CELforPharma), and CRM guides for BD (HubSpot, Insightly, Prospeo). These are vendor and advisor sources; validate with design partners.

| Need | Signal | Confidence |
|---|---|---|
| One place for partners, deals and history | Inova's core promise; specialist partnering CRMs track licensing and alliances, unlike sales CRMs | High |
| Long, non-linear stages | BD pipelines differ from sales; staged disclosure: non-confidential → CDA → evaluation → term sheet → exclusivity | High |
| Many targets for few deals | Pharma triage: about 500 opportunities per therapeutic area, about 100 non-confidential meetings, about 50 CDAs | High |
| Conference preparation and discipline | One-to-one partnering is the most efficient channel for small biotechs; check history before contacting, tailor to the partner, answer every request | High |
| Small biotechs use spreadsheets or a free CRM | HubSpot free tier is the common step up | Medium–high |
| Partner intelligence | Know the partner's recent news before a meeting | Medium–high |

| Reference | Role |
|---|---|
| **Inova** (domain) | Partnering pipeline, alliances, reporting |
| **partneringONE** (conference practice) | Meeting requests, deadlines, briefs |
| **HubSpot / Pipedrive** (mechanics) | Pipeline board, activities, follow-ups, saved views |

---

## 3. Scope

**In:**
- partnering profiles per asset
- opportunities in all directions, by stage
- partners and contacts with history
- conferences with prep and follow-up
- activities (meetings, calls, emails, notes, materials shared)
- follow-ups and reminders
- tags with user-defined categories, and saved views
- CDA, term sheet and agreement links (Contracts)
- data-room access and engagement (Data Room)
- partner research (signals and target suggestions) on a schedule
- digest email to the team
- funnel and win/loss reporting

**Out (v1):**
- sending outreach or bulk email
- partneringONE or calendar integrations
- valuation and deal terms modelling (Deal Comps, BT2-18)
- contract drafting (Contracts)
- alliance management after signing (Contracts obligations)
- lead databases or contact enrichment

**Small features that delight:**
1. **"Have we spoken to them?"** Every partner shows its full history: who met whom, what was shared, any decline and why. Shown before a meeting and when adding a target.
2. **Conference in one view:** filter by the tag "BIO-Europe 2026" to see goals, who to meet, briefs, then after the event the next steps per meeting.
3. **Brief before every meeting:** the assistant writes a one-page brief (their pipeline, recent deals, people, our history, what to ask) the day before.
4. **Stalled deals:** "No activity on Alpha Pharma for 21 days, last stage CDA".
5. **The weekly digest** fits on one screen: what moved, what's due, what's new about your targets.
6. **Funnel by asset:** where targets drop out (e.g. 40 contacted → 12 meetings → 5 CDAs → 1 term sheet), with loss reasons.

---

## 4. Screens (7)

Custom `frontend-js` app on the Vivid kit, theme **forest** (deal pack), declared in `templateLayoutSchema`. Four capabilities per screen; partner, contact, opportunity, conference and signal details open in the side panel.

| # | Screen (id) | Capabilities |
|---|---|---|
| 1 | **Overview** (`overview`) | (1) Funnel per asset and direction. (2) Follow-ups due and overdue; stalled opportunities. (3) Upcoming meetings and conferences. (4) New signals since last visit. |
| 2 | **Pipeline** (`pipeline`) | (1) Board by stage, list or funnel. (2) Filter by asset, direction, owner, stage and any tag category; **saved views** (private or shared). (3) Opportunity panel: stage history, activities, follow-ups, materials shared, CDA / data room / term sheet / agreement links. (4) Won/lost with reason; archive. |
| 3 | **Partners** (`partners`) | (1) Partner companies (shared organizations) with type, focus areas, region, priority. (2) Contacts (shared people) with role and last contact. (3) Full history per partner and contact across opportunities and conferences. (4) Signals per partner. |
| 4 | **Conferences** (`conferences`) | (1) Events with dates, location, partnering platform and deadlines (profile, request rounds). (2) **Prep:** goals, team, who to meet, requests sent and received, schedule, one-page briefs. (3) **After:** outcome and next step per meeting, follow-ups created. (4) Each conference is a tag value, so its view is one click. |
| 5 | **Activity** (`activity`) | (1) Timeline of meetings, calls, emails, notes and materials shared. (2) Follow-ups with owner, due date and status. (3) Materials log: which document and version went to whom. (4) "My week" view per person. |
| 6 | **Research** (`research`) | (1) Signals: deals, trial results, pipeline changes, financing, people moves, news, each with source and why it matters. (2) Target suggestions per asset with fit rationale and sources: accept (creates an opportunity, reviewed) or dismiss with a reason. (3) Research settings per asset: focus, exclusions, sources. (4) History of runs. |
| 7 | **Settings** (`settings`) | (1) Stages and lost reasons. (2) **Tag categories:** Conference, Channel and Asset group as standard, plus custom categories with their values. (3) Digest and research: cadence (daily / weekly / monthly), day and time, recipients, stalled-days threshold, digest email text. (4) Links to Access and Automations. |

---

## 5. Workflows

1. **Asset profile:** the user (or the assistant from the program and documents) fills the partnering profile: direction, deal types, territories, target profile, current non-confidential materials.
2. **Targets:**
   - The research worker proposes targets with rationale and sources; the user accepts or dismisses with a reason.
   - The user can also tell the assistant "add Beta Bio as a target for Asset X". Before adding, the assistant checks history and warns about earlier declines.
3. **Conference prep:**
   - The user creates the conference (or asks the assistant). It gets a tag value.
   - The user gives the assistant the partneringONE requests or a list in any form; the assistant proposes contacts, opportunities and meeting slots under that tag.
   - The day before each meeting the assistant writes the brief.
4. **After a meeting:**
   - The user tells the assistant what happened.
   - It proposes one activity (summary, attendees, materials shared with versions), the stage change and follow-ups with owners and dates. The user reviews and saves.
5. **Gates:**
   - *CDA:* link an agreement from Contracts, or propose one there (Contracts' reviewed path); status shows on the opportunity.
   - *Confidential evaluation:* create or link a Data Room room (licensing or partnering) and see that partner's access and engagement.
   - *Term sheet and agreement:* filed in Contracts and linked.
6. **Close:** won (signed) or lost/on hold with a reason. Lost targets stay in history with the reason, and the assistant warns if anyone re-adds them.
7. **Saved views:** filter by any mix of tags, stage, asset, direction and owner, then save it as a view (private or shared). Views appear in the Pipeline view picker.

---

## 6. Research and the digest email

**Research worker** (TrialAgents Automations, on the runner of the user's connected Claude or ChatGPT; one automation for the app):
- **Runs** daily, weekly or monthly (**weekly default**, Monday 07:00 workspace time).
- **Reads** asset profiles, open opportunities, partners and the previous run's findings.
- **Searches** public sources (news, company pipelines and press releases, deal announcements, trial registries via TrialAgents Intel when connected).
- **Writes** signals (kind, title, one-line "why it matters", source URL, date, linked partner and opportunity) and target suggestions (company, asset, fit rationale, sources) as proposals, reviewed in the Research screen.
- **Never** contacts anyone, and never changes stages or opportunities by itself.

**Digest email** (to chosen workspace members, after each run or at the set time; app default text, editable):

> **Subject:** Partnerships · week of 16 Nov: 3 moved · 5 due · 4 new signals
>
> **Moved:** Alpha Pharma → CDA (Asset X) · Beta Bio → Term sheet (Asset Y) · Gamma Univ → Lost: no budget
> **Due this week:** 5 follow-ups (2 overdue): Alpha Pharma send CMC summary (Anna, Tue) · …
> **Stalled:** Delta Therapeutics, no activity 23 days (Confidential evaluation)
> **Coming up:** BIO-Europe, 17–19 Nov: 8 meetings, 6 briefs ready
> **New about your targets:** Alpha Pharma licensed a KRAS asset from Epsilon ($40M upfront) — overlaps Asset X's territory ask · 3 more
> **Suggested targets:** 2 for Asset X (review)
>
> Open Partnerships →

Rules:
- A maximum of 3 lines per section and about 150 words, with links into the app.
- Empty sections are left out; if nothing happened, one line says so.
- Confidential deal terms never appear in the email.

---

## 7. Data model

Principles as in [Runway §5](RUNWAY.md#5-data-model). App tables use the `partnerships.*` prefix.

**Shared roles**

| Role | Contract | Mode | Use |
|---|---|---|---|
| `organizations` | core.v1 | read/write | Partner companies, universities, investors |
| `people` | core.v1 | read/write | Partner contacts |
| `programs` | core.v1 | read/write | Assets |
| `agreements` | core.v1 | optional, read (core fields); proposals through Contracts | CDA, term sheet, signed agreement |
| `dataroom.access_grants`, `dataroom.engagement` | dataroom.v1 | optional integration, read-only | Confidential access and engagement per partner |

**Own tables (`partnerships.*`)**

| Table | Key fields (kind) |
|---|---|
| `partnerships.settings` (one row) | digest_cadence (select*: daily / weekly / monthly, weekly), digest_day (select: mon…sun, mon), digest_time (text, "07:00"), digest_recipients (text, member ids), digest_text (text), research_enabled (boolean, true), stalled_days (number, 21), lost_reasons (text, JSON) |
| `partnerships.asset_profiles` | program_id (text*), directions (text, JSON), deal_types (text, JSON: license / co_development / option / research_collaboration / platform / acquisition / other), territories (text), target_profile (text), materials (text, JSON: document ids and versions), research_focus (text), research_exclusions (text), status (select*: active / paused / done) |
| `partnerships.opportunities` | name (text*), organization_id (text*), program_id (text*), direction (select*: out_license / in_license / co_development / research_collaboration / academic / platform / other), stage (select*: identified / contacted / non_confidential / cda / confidential_evaluation / term_sheet / exclusivity_diligence / signed / lost / on_hold), stage_on (date), owner (text*), priority (select: high / medium / low), fit (number, 1–5), fit_rationale (text), source (select: research / conference / inbound / outbound / referral / other), contact_ids (text), next_step (text), next_date (date), lost_reason (text), cda_agreement_id (text), dataroom_room_id (text), term_sheet_agreement_id (text), agreement_id (text), tags (text, JSON: category → values), archived (boolean) |
| `partnerships.stage_history` | opportunity_id (text*), from_stage (text), to_stage (text*), changed_on (date*), changed_by (text), note (text) |
| `partnerships.activities` | opportunity_id (text), organization_id (text*), kind (select*: meeting / call / email / conference_meeting / material_shared / note), occurred_on (date*), person_ids (text), team (text), summary (text), materials (text, JSON: document ids and versions), conference_id (text), logged_by (select: user / claude / chatgpt), tags (text, JSON) |
| `partnerships.follow_ups` | opportunity_id (text), activity_id (text), title (text*), owner (text*), due (date*), status (select*: open / done / cancelled), done_on (date) |
| `partnerships.conferences` | name (text*), starts_on (date*), ends_on (date), location (text), platform (select: partneringone / bio_one_on_one / other / none), deadlines (text, JSON), goals (text), team (text), status (select*: planning / live / done), tag_value (text*) |
| `partnerships.briefs` | opportunity_id (text), conference_id (text), meeting_on (date), content (text*), sources (text, JSON), written_by (select: claude / chatgpt / user), written_on (date*) |
| `partnerships.signals` | organization_id (text), opportunity_id (text), program_id (text), kind (select*: deal / trial / pipeline / financing / people / news / target_suggestion), title (text*), why (text*), source_url (text*), published_on (date), found_on (date*), status (select*: new / reviewed / dismissed / accepted), dismiss_reason (text), run_id (text) |
| `partnerships.tag_categories` | name (text*), values (text, JSON), multiple (boolean), standard (boolean), archived (boolean) |
| `partnerships.views` | name (text*), filters (text*, JSON: tags, stage, program, direction, owner), layout (select*: board / list / funnel), shared (boolean), owner (text*) |

`*` = required. Stage changes always write `stage_history`. Research findings are proposals; accepting a target suggestion creates an opportunity (stage `identified`, source `research`).

**From 1.1.1:**
- `contacts` → shared `people`
- `evaluations` → `fit` and `fit_rationale`
- `meetings` → `activities`
- `milestones` → agreement links and follow-ups
- `signals` are kept and extended

There are no existing users, so this needs no migration code.

---

## 8. Calculation rules

- **Stalled:** an open opportunity (not signed, lost or on hold) with no activity, stage change or completed follow-up for `stalled_days`.
- **Overdue:** a follow-up that is open and past due.
- **Funnel:** count of opportunities that ever reached each stage (from `stage_history`), per asset, direction, source and tag. Conversion = next stage ÷ stage.
- **Win/loss:** signed vs lost, with reasons, per asset, direction and source.
- **History check:** when an opportunity or contact is added, earlier opportunities with the same organization are shown, especially lost or declined ones with their reasons.
- **Digest content:**
  - stage changes since the last digest
  - follow-ups due in the next period and overdue ones
  - stalled opportunities
  - meetings and conferences in the next period
  - new signals and target suggestions from the latest run
- Bounded reads as in Programs §7.

---

## 9. Access control and AI

- **App-level access as usual.** Partnering data is confidential. Digest recipients must be workspace members with access to the app. Confidential deal terms stay out of emails and signals.
- **Claude and ChatGPT** (each user's connection) can:
  - turn what the user gives them (conference requests, notes, emails, lists) into proposed records
  - write briefs
  - run research
  - suggest follow-ups and outreach wording on request

  All their writes are reviewed proposals. They never contact partners and never send email outside the workspace.

---

## 10. Automations

1. **Partner research** (one research worker on the user's Claude or ChatGPT runner; cadence from settings, weekly default): signals and target suggestions as proposals.
2. **Digest email** (to chosen members, after each research run or at the set time): §6 template.
3. **Meeting briefs** (optional): the day before a meeting with a linked opportunity, a brief is written and the owner is notified.
4. **Follow-up reminders** (in-app and email to the owner): on the due date and when overdue.

---

## 11. Connections to other apps (by role, any install order)

| App | How | What the user gets |
|---|---|---|
| **Programs (02)** | Shares `programs`; asset profiles hang off programs | Partnering by asset, next to the program plan |
| **Contracts (04)** | Shares `organizations` and `agreements`; CDA, term sheet and agreement links; new ones are proposed in Contracts' reviewed path | CDA status and signed deals in the pipeline |
| **Data Room (08)** | Reads `dataroom.v1` (integration "Use its data"); a room can be created for an opportunity | Who has confidential access and what they looked at |
| **Fundraise (03)** | Shares `organizations` and `people` (investors who are also strategic partners) | One record per company |
| **Investor Updates (06)** | The assistant reads deal progress as a draft source | Partnering progress in updates |
| **TrialAgents Intel** (connector) | Research source for trials and sponsors | Partner trial activity in signals |

Partnerships never writes another app's own tables.

---

## 12. Assistant behaviour

- Turn whatever the user gives (pasted requests, notes, emails, photos of business cards, lists) into proposed records under the right tags. Always check history first.
- Write briefs: the partner's pipeline and recent deals, the people, our history, what was shared, what to ask, cautions (CDA not in place: non-confidential only).
- Research: name sources, say why each finding matters for a specific asset, avoid repeats, respect exclusions.
- Suggest outreach wording only when asked; never send it.
- Never: contact partners, change stages without review, put deal terms in emails, or give legal or valuation advice.
- **`whenToUse`:** licensing, partnering and collaboration deals for a biotech's assets: targets, conferences, meetings, follow-ups, CDA to signature, partner news. **`whenNotToUse`:** fundraising (Fundraise), contract drafting (Contracts), sending email campaigns, sales CRM.

---

## 13. Package checklist and acceptance criteria

**Package:**
- template source under `templates/source/partnership-tracker/` updated to 2.0.0, and immutable `templates/apps/life.partnership-tracker-2.0.0.json` (draft until approved), display name **Partnerships**
- roles as in §7
- standard tag categories (Conference, Channel, Asset group)
- standard stages and lost reasons
- digest default text
- full `catalog.metadata.json`
- fictional `demo_data.json`: 3 assets, 12 partners, 20 contacts, 18 opportunities in all directions, 1 conference with briefs, signals
- `templateLayoutSchema` with seven screen ids
- build `--check` and browser test

**Acceptance (beyond the shared contract):**
1. **Conference through chat:** the user pastes 10 partneringONE requests; the assistant proposes contacts, opportunities and meetings tagged "BIO-Europe 2026", and warns about one partner that declined last year. The saved view for that tag shows prep before the event and next steps after it.
2. **After-meeting log:** one message creates an activity with materials and versions, a stage change (written to stage history) and two follow-ups with owners, all reviewed.
3. **Gates:** a CDA link from Contracts and a Data Room room show status and engagement on the opportunity. Without Contracts or Data Room installed, the fields stay manual and nothing breaks.
4. **Research:** with weekly cadence the worker runs, signals and two target suggestions appear, one is accepted (creating an opportunity), and the digest email arrives in the §6 format within the word limit. Switching to daily or monthly changes the schedule.
5. **Saved views:** custom category "Region" with values; a shared view filters by Region + stage and is visible to the team; a private view is not.
6. **Funnel and win/loss** match the stage history.
7. **Outreach:** no screen or automation sends email to partners.
8. **Assistants** propose only; digest recipients are members only; no deal terms appear in email.
9. **Modularity and archiving:** the modularity test (rule 9) and archive-first checks pass. Archiving the app pauses the research and digest automations.
10. **Layout:** desktop 1440 and mobile 390.

**Open for design partners:** default stages per direction; digest sections and order; the research sources most valued.
