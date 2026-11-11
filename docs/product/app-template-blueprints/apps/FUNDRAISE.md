# Fundraise — final app scope (BT2-03)

*Investor pipeline for a round, from first contact to signed commitment.*

**Status:** Final scope for build, 11 November 2026. Part of [Biotech apps v2](../BIOTECH_v2.md) (rank 3). Replaces the v1 `investor-crm` package as a new major version (`life.investor-crm` 2.0.0; display name **Fundraise**). No existing users; no migration needed.

**Governing contracts:** as for [Runway](RUNWAY.md) and [Programs](PROGRAMS.md), plus [modular apps and shared data](../../MODULAR_APPS_AND_SHARED_DATA.md) — in particular §4 core contract, §6 archive first and **§7 role-based connections**. They win on any conflict.

**Decisions (11 Nov 2026):** no built-in investor database (own list + assistant research); light term-sheet fields for comparing offers; strategic/pharma investors and public equity funds are investor types (grants stay in Grants, 19); no email integration (assistants log from the user's own connected mail/calendar for review); several rounds over time with shared investor history; **Data Room connection by role, not by install bundle**; cap table summary and post-round investor updates belong to Investor Updates (06).

---

## 1. Evidence and references

Sources read 11 November 2026: Foundersuite (review sites, product summaries), Visible, general CRMs used for fundraising (Folk, Attio, HubSpot), AI-first fundraising tools (Metal, Round Funded, Angels Partners), and life-science fundraising guides. Vendor and advisor sources, not a survey; validate with design partners.

| Need | Signal | Confidence |
|---|---|---|
| A pipeline by stage instead of a spreadsheet | Foundersuite's core is a Kanban investor pipeline; reviewers praise it over spreadsheets. | High |
| Ranked target list with fit criteria | Life-science guides: define an ideal investor profile, qualify by fit and fund vintage; biotech courses build 200–300 investors ranked by priority. | High |
| **Lead investor first, then syndicate** | Dedicated life-science funds lead biotech seeds; a life-science lead almost always prices the round. | High |
| **Tranches tied to milestones** | Biotech seeds are often tranched on milestones (lead nomination, IND-enabling data). | High |
| Soft / verbal / signed separated; progress vs target | Fundraising trackers and guides track committed vs target. | High |
| Follow-ups and stale conversations | Fundraising CRMs surface due follow-ups; manual tracking breaks at 50+ conversations. | High |
| **Data-room engagement per investor** | Visible's investor-CRM criteria include engagement tracking and data room; Foundersuite tracks deck views. Founder priority (user decision). | High |
| Investor database | Foundersuite's main draw, but the top complaint is stale long-tail data. | Not built (decision) |

| App | Role |
|---|---|
| **Foundersuite** (primary) | Pipeline workflow, investor records, follow-ups. |
| **Visible** (secondary) | Engagement tracking and data-room links per investor. |
| Life-science fundraising practice | Lead/syndicate, tranches, investor types, fit criteria. |

---

## 2. Scope

**In:** rounds; investor profiles on shared organizations; contacts on shared people; opportunities per investor per round with stage, interest level and amounts; activity log with follow-ups; lead and syndicate; light offer/term-sheet fields; tranches linked to milestones; pass reasons; data-room access and engagement **when a provider of the `dataroom.*` roles is connected**; one optional weekly digest; optional assistant research of new investors.

**Out:** investor database; sending email; deck hosting/view tracking (Data Room); post-round investor updates and cap table (Investor Updates, 06); subscription or legal documents; e-signature; fund accounting; grants.

**Small features that delight:**
1. **Round thermometer:** signed (solid), verbal, soft vs target; only signed counts as raised; lead status as a badge ("Lead: term sheet received").
2. **Stale and due:** conversations with no activity in 14 days and follow-ups due this week, on one list.
3. **Engagement signals** (Data Room connected): "Viewed 5 times this week", "Has access, never opened", diligence depth (documents viewed ÷ documents shared), and a suggested follow-up when an investor re-opens the room.
4. **Pass-reason patterns:** "5 of 8 passes: too early, want in-vivo data" — what to fix before the next wave.
5. **Intro paths:** who can introduce you, shown on the target list.
6. **Offer comparison:** 2–3 term sheets side by side (amount, pre-money, instrument, tranches, board seat, expiry).
7. **Tranche ↔ milestone:** each tranche shows its milestone from Programs (when connected) and whether it is on track.
8. **Weekly round update draft** by the assistant for co-founders and the board.

---

## 3. Screens (7)

Custom `frontend-js` app on the Vivid kit, theme **forest** with dark-teal hero (`#243B40`), declared in `templateLayoutSchema` (layout gear). Four capabilities each.

| # | Screen (id) | Capabilities |
|---|---|---|
| 1 | **Overview** (`overview`) | (1) Round thermometer and lead badge for the active round. (2) Funnel: count by stage. (3) Stale and due list. (4) Engagement highlights (only when Data Room is connected; otherwise a short note with a reviewed "Connect data room" action). |
| 2 | **Pipeline** (`pipeline`) | (1) Board by stage for the selected round; card shows investor, tier, interest, amount, next step, engagement dot. (2) Move stage via a reviewed edit (drag opens the edit; nothing saves without review). (3) Filters: tier, investor type, owner, interest. (4) Opportunity detail side panel: contacts, activity, offer, data-room access and views. |
| 3 | **Investors** (`investors`) | (1) Ranked target list with tier, type, modality/area/stage fit, cheque range, leads (yes/no/sometimes), fund vintage, intro path. (2) Add or import (assistant-proposed, reviewed). (3) Accept or reject assistant-proposed investors. (4) Investor history across rounds. |
| 4 | **Round** (`round`) | (1) Round settings: type, target, currency, dates, lead. (2) Syndicate table: committed amounts and % of round. (3) Offer comparison. (4) Tranches with condition, milestone, expected date and status. |
| 5 | **Activity** (`activity`) | (1) Log of emails, calls, meetings, intros, events. (2) Add activity (or let the assistant propose entries from connected mail/calendar). (3) Follow-ups due. (4) Pass reasons summary. |
| 6 | **Engagement** (`engagement`) | Shown with content only when `dataroom.access_grants` / `dataroom.engagement` are connected. (1) Access by investor: invited, active, revoked, expired, agreement accepted. (2) Views by investor and document: first/last view, count, time where available. (3) Signals list (hot, never opened, re-opened). (4) "Give access" opens the Data Room app's access form pre-filled (the Data Room app writes). |
| 7 | **Settings** (`settings`) | (1) Stages and pass reasons. (2) Fit vocabularies: modalities, therapeutic areas, development stages. (3) Stale threshold (default 14 days), default currency. (4) Links to Access and Automations. |

Shared behaviours, chart rules and states as in [Runway §3](RUNWAY.md#3-screens-7).

---

## 4. Workflows

1. **Start a round.** Create the round (type, target, currency, timing). The assistant helps build the target list from the user's own list and research ("funds that led preclinical oncology seeds in the last 18 months"), proposing investors with sources; the user accepts or rejects.
2. **Outreach and meetings.** Log activities (manually or assistant-proposed from connected mail/calendar); set next steps; the Overview surfaces stale and due items.
3. **Diligence.** When an opportunity reaches Due diligence, the app suggests giving data-room access (opens the Data Room form when connected). Engagement appears per investor.
4. **Lead and terms.** Record offers on opportunities; compare; mark the lead; tranches are defined on the round and linked to milestones.
5. **Close.** Mark commitments signed; close the round; investors stay for the next round with full history.
6. **Pass.** Record pass reason and detail; review patterns before the next wave.

---

## 5. Data model

Principles as in [Runway §5](RUNWAY.md#5-data-model). Contract for own tables: `fundraise.v1`.

**Shared and connected roles**

| Role | Contract | Mode | Use |
|---|---|---|---|
| `organizations` | core.v1 | read/write | Investors (`org_type` = investor) |
| `people` | core.v1 | read/write | Investor contacts |
| `agreements` | core.v1 | optional, read-only | CDA/NDA status per investor (written by Contracts) |
| `programs` | core.v1 | optional, read-only | Program context for tranches |
| `programs.plan_items` | programs.v2 | optional, read-only | Milestones for tranche conditions |
| `runway.fx_rates` | runway.v2 | optional, read-only | Converting amounts in other currencies to the round currency |
| `dataroom.access_grants` | dataroom.v1 | optional, read-only | Who has access |
| `dataroom.engagement` | dataroom.v1 | optional, read-only | Who viewed what, how often |

**Own tables (`fundraise.*`)**

| Table | Key fields (kind) |
|---|---|
| `fundraise.settings` (one row) | default_currency (select), stale_days (number, 14), stages (text list), pass_reasons (text list), modalities (text list), therapeutic_areas (text list), dev_stages (text list) |
| `fundraise.investor_profiles` | organization_id (text*, UUID→organizations), investor_type (select*: specialist_ls_vc / generalist_vc / pharma_cvc / strategic / family_office / angel / public_fund / other), tier (select: a / b / c), profile_status (select*: proposed / accepted / rejected), modalities (text), therapeutic_areas (text), dev_stages (text), check_min (money), check_max (money), currency (select), leads_rounds (select: yes / no / sometimes), fund_vintage_year (number), intro_path (text), source (text), source_date (date), notes (text), archived (boolean) |
| `fundraise.rounds` | name (text*), round_type (select*: pre_seed / seed / bridge / series_a / series_b / series_c / other), target_amount (money), currency (select*), status (select*: planning / active / closed / abandoned), opened_on (date), target_close (date), closed_on (date), lead_org_id (text), notes (text), archived (boolean) |
| `fundraise.opportunities` | round_id (text*), organization_id (text*), primary_contact_id (text), stage (select*: target / contacted / first_meeting / partner_meeting / due_diligence / term_sheet / committed / closed / passed), interest (select*: none / soft / verbal / signed), amount_indicated (money), amount_committed (money), currency (select*), is_lead (boolean), owner (text), next_step (text), next_due (date), last_activity_on (date), pass_reason (select), pass_detail (text), offer_received_on (date), offer_amount (money), offer_pre_money (money), offer_instrument (select: priced / safe / convertible / other), offer_board_seat (boolean), offer_expires_on (date), offer_status (select: received / negotiating / accepted / declined / expired), offer_notes (text), archived (boolean) |
| `fundraise.activities` | opportunity_id (text*), contact_id (text), activity_on (date*), kind (select*: email / call / meeting / intro / event / other), summary (text*), outcome (text), follow_up_due (date), source (select: manual / assistant) |
| `fundraise.tranches` (output) | round_id (text*), tranche_no (number*), amount (money*), currency (select*), condition (text*), milestone_id (text, UUID→programs.plan_items), expected_on (date), status (select*: expected / met / released / waived / missed) |

`*` = required. Saving an activity also updates `last_activity_on` on its opportunity in the same reviewed save. `fundraise.tranches` is published as a read-only output for Runway (cash-in) and Investor Updates.

**Data Room output contract `dataroom.v1`** (defined here so Fundraise, BD Pipeline and any custom app can read it; the Data Room app is its writer):

| Role | Fields |
|---|---|
| `dataroom.access_grants` | room_id, room_name, room_purpose (financing / licensing / m_and_a / other), organization_id, person_id, granted_on, expires_on, status (invited / active / revoked / expired), agreement_accepted_on, source (manual / tracked) |
| `dataroom.engagement` | grant_id, organization_id, person_id, document_ref, document_title, first_viewed_on, last_viewed_on, view_count, seconds_viewed (optional), downloads (optional), source (manual / docsend / sharevault / tracked), as_of |

Phase 1 (Data Room app): grants and engagement entered manually or by the assistant from DocSend/ShareVault reports. Phase 2 (platform secure rooms): the platform writes the same fields automatically. Fundraise does not change between phases.

---

## 6. Calculation rules

- **Raised** = Σ `amount_committed` where interest = signed, in the round currency. **Verbal** and **soft** are shown separately and never added to raised.
- **Currency:** amounts in another currency are converted with `runway.fx_rates` when connected and readable; otherwise flagged and excluded, never guessed.
- **Progress** = raised ÷ target (empty when no target).
- **Lead status** = opportunity with `is_lead`; badge shows its stage and offer status.
- **Stale** = active stage (contacted … term_sheet) and `last_activity_on` older than `stale_days`.
- **Funnel** = count of opportunities per stage for the round; **days in stage** from the latest stage change in record history (or `last_activity_on` when history is unavailable).
- **Pass patterns** = counts by `pass_reason` for the round and across rounds.
- **Engagement signals** (when connected): *hot* = ≥ 3 views in the last 7 days; *never opened* = active grant with no engagement rows; *re-opened* = a view after ≥ 14 days without views; *depth* = distinct documents viewed ÷ documents shared with that grant (when shared count is available).
- **Tranche on track** = linked milestone status from Programs (when connected): done → met candidate; at risk → flagged; no link → "not linked".
- **As-of date** handled as in Programs §7. Bounded reads; partial reads disable totals and say so.

---

## 7. Access control and AI connections

- App-level access as usual; investor data and amounts are confidential: share with co-founders/board explicitly, read-only where appropriate.
- Data Room engagement is readable only if the user can read the `dataroom.*` tables; otherwise the Engagement screen shows "restricted".
- Claude and ChatGPT connections inherit and narrow the user's rights; defaults: read and propose; every write reviewed. Assistant-researched investors are created with `profile_status = proposed` and become active only when the user accepts them.
- Contacts are professional only; no personal sensitive data.

---

## 8. Customization and automations

Customization paths as in [Runway §8](RUNWAY.md#8-customization-users-claude-and-chatgpt): layout gear for screens; Settings (reviewed write to `fundraise.settings`) for stages, pass reasons, fit vocabularies, stale threshold; assistant for extra fields and theme (reviewed revisions).

**Optional automations (none is fully supported):**
1. **Weekly round digest (email, TrialAgents):** Mondays 08:00 Europe/Berlin to the owner: raised / verbal / soft vs target, lead status, stale and due items, engagement highlights when connected.
2. **Signed commitment notice (email):** trigger when `opportunities.interest` becomes `signed`; to the owner.
3. **Investor research (Claude or ChatGPT runner):** monthly or on request; from the round's fit criteria, proposes new investors (organizations + `investor_profiles` with `profile_status = proposed`, source and date); dedup by organization name and website; writes only those roles under a narrow grant, or proposes for review.

---

## 9. Fit with other apps (all by role, any install order)

| App / role | Relationship |
|---|---|
| Data Room (08) — `dataroom.*` | Access and engagement per investor; "Give access" opens the Data Room form. |
| Programs (02) — `programs.plan_items` | Tranche conditions linked to milestones. |
| Runway (01) — `runway.fx_rates`; reads `fundraise.tranches` (future Runway version) | Currency conversion; tranches as contingent → committed cash-in. Until Runway reads the role, equity cash-in lines stay manual in Runway. |
| Contracts (04) — `agreements` | CDA/NDA status per investor. |
| BD Pipeline (07) | Shares organizations, people and the `dataroom.*` roles (licensing rooms). |
| Investor Updates (06) | Later: holders from closed rounds, cap-table summary, post-round updates. |
| Deal Comps (18) | Later: round benchmarks for terms. |

When a role is not connected: the dependent feature hides with a short note and, where possible, a reviewed "Connect" action ([modular §7](../../MODULAR_APPS_AND_SHARED_DATA.md#7-role-based-connections-standard-for-all-apps)).

---

## 10. Assistant behaviour

- Research and propose investors with sources and dates; never invent cheque sizes or fund details.
- Log activities from the user's own connected mail or calendar as proposals.
- Draft follow-ups (text only; the user sends) and the weekly round update.
- Summarise engagement and suggest who to follow up with.
- Never: send email, mark commitments signed without the user, give legal or investment advice.
- **`whenToUse`:** a small biotech runs a financing round and needs a ranked investor list, pipeline, follow-ups, terms, tranches and data-room engagement in one place. **`whenNotToUse`:** investor databases, email campaigns, cap-table registers, subscription documents, fund accounting.

---

## 11. Changes from v1 `investor-crm`

| v1 | v2 |
|---|---|
| Own `investors` and `contacts` tables | Shared `organizations` / `people` (core.v1) + `fundraise.investor_profiles` |
| `tasks` table | `next_step` / `next_due` on opportunities + follow-ups on activities |
| Research briefs and findings tables | Assistant-proposed investors with `profile_status`, source and date |
| Commitment status | Interest level (none/soft/verbal/signed), lead flag, offer fields |
| — | Tranches linked to milestones; data-room engagement by role; pass-reason patterns |

---

## 12. Package checklist and acceptance criteria

**Package:** new immutable `templates/apps/life.investor-crm-2.0.0.json` (draft until approved); installer schema with roles, `contract`, `optional`, `readOnly` as in §5; full `catalog.metadata.json` documentation (including the `dataroom.v1` contract it reads and the `fundraise.tranches` output it publishes); fictional `demo_data.json`; `templateLayoutSchema` with the seven ids; reviewed draft forms; build `--check`; browser test.

**Acceptance (beyond the shared contract):**
1. Only signed commitments count as raised; verbal and soft are shown separately; the sum reconciles with a hand-checked fictional round.
2. An amount in another currency converts when `runway.fx_rates` is connected; otherwise it is flagged and excluded.
3. Stale and due lists match a fictional dataset with known dates.
4. Assistant-proposed investors stay `proposed` until accepted; rejected ones never appear in the pipeline.
5. Saving an activity updates `last_activity_on` in the same reviewed save.
6. **Install-order test:** install Fundraise alone (Engagement shows the connect note); then install a provider of `dataroom.v1` (catalog Data Room or a custom app with the same roles) — Fundraise connects through the provider's install review or one reviewed "Connect" click, and shows grants and views; archive the provider — Fundraise keeps working and hides engagement.
7. Tranche linked to a Programs milestone shows its status; with Programs absent it shows "not linked".
8. Modularity test (rule 9) and archive-first checks pass.
9. Desktop 1440 / mobile 390; pipeline board scrolls horizontally inside its card.

**Open for design partners:** stage list; whether offer fields suffice or a separate term-sheet record is needed; whether investor tiers A/B/C are how founders actually rank.
