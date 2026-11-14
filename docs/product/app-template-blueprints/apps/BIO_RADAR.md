# Bio Radar — final app scope (BT2-10)

*Radars for your field: pipeline, papers, patents, commercial, funding and deals, and regulatory. Claude or ChatGPT does the searching; Bio Radar stores, structures and schedules it.*

**Status:** Final scope for build, 14 November 2026. Part of [Biotech apps v2](../BIOTECH_v2.md) (rank 10, TrialAgents edge). Replaces the earlier Landscape scope. New template `life.bio-radar` 1.0.0, display name **Bio Radar**. It absorbs and retires **Literature Radar** (`life.literature-radar`): released versions stay installable, but the template is hidden from the catalog. No existing users.

**Depends on:** the platform scope [recommended automations at install](../../RECOMMENDED_AUTOMATIONS.md), including E1–E3 (being built separately). It uses TrialAgents Automations on the user's Claude or ChatGPT runner. **One app PR**, after the platform PR is merged.

**Governing contracts:** project context, template authoring and usage guidance (latest, all `nextOffset`s), shared build contract, interface rules, access control, write authorization, field capabilities, shared data, [modular apps and shared data](../../MODULAR_APPS_AND_SHARED_DATA.md), [apps, access and automations](../../APP_CONFIGURATION_AND_AUTOMATIONS.md) (including email limits), the [recommended automations scope](../../RECOMMENDED_AUTOMATIONS.md), and the contract registry. They win on any conflict.

**Decisions (14 Nov 2026):**
- **One app, several radar types.** The user picks the radars they need: **Pipeline & trials**, **Literature**, **Patents**, **Commercial**, **Funding & deals**, **Regulatory & policy**. Each type comes with three things:
  1. its own **tracker** (table and screen)
  2. a **collection template** for the assistant (what to search, which fields to return)
  3. a **recommended automation** (scan + digest email)

  The user can add more radars of any type later.
- **The assistant does the searching and reading.** The app stores, structures (trackers, events with "so what", calendar) and tells the assistant **what** and **when** through research briefs.
- **Sources are named, not connected.** Each radar lists sources by name; the assistant decides how to reach them (its own connector or the web). **Web is the default.** Every run returns a source report.
- **Automations are platform automations.** They're offered in the install dialog: one scan + digest per radar type, plus a cross-radar high-impact alert and a quarterly review. They can be added later from Automations' "Recommended, not set up" panel. Turning on a radar type's automation at install is how the user picks their radars upfront.

---

## 1. Radar types

| Type | What it watches | Tracker (main table) | Typical named sources (web default) | Default cadence |
|---|---|---|---|---|
| **Pipeline & trials** | Competing assets in your indication or mechanism, their trials, readouts, discontinuations, new entrants | Assets + trials | TrialAgents Intel (EU trials), ClinicalTrials.gov, company pipelines and press releases | Weekly |
| **Literature** | Papers, preprints, conference abstracts, reviews on your targets, mechanisms, indications and key authors | Publications | PubMed, bioRxiv/medRxiv, journal sites, congress abstract sites | Weekly |
| **Patents** | New filings and grants, legal events (oppositions, lapses, expiries) for your targets, competitors and own families | Patents | Espacenet, Google Patents, Lens.org, USPTO, EPO Register | Monthly |
| **Commercial** | Approvals and launches, label changes, pricing and reimbursement or HTA decisions, guidelines, reported product sales in your indication | Products | Regulator databases (FDA, EMA), HTA bodies (NICE, G-BA, HAS), company reports, guideline societies | Monthly |
| **Funding & deals** | Financings, IPOs, M&A, licensing and partnering deals, grants in your field | Transactions | Press releases, SEC filings, news, grant databases (e.g. EU Funding & Tenders, NIH RePORTER) | Weekly |
| **Regulatory & policy** | Guidances, designations (orphan, PRIME, breakthrough), advisory committees, policy changes relevant to your programs | Regulatory items | FDA, EMA, MHRA, national agencies, official journals | Monthly |

Every type also writes **events** (the shared feed) with impact and "so what". Types share companies (organizations) and programs, so one competitor appears across radars.

---

## 2. The journey

| # | Stage | Who | What happens |
|---|---|---|---|
| 1 | **Install** | Owner | Install dialog: data, access, and the **Automations** section listing one scan + digest per radar type (Pipeline on by default, others off), plus the high-impact alert (on) and quarterly review (off); runner and recipients |
| 2 | **Create radars** | User | "New radar": pick a type, link a program (optional), define the scope (e.g. indication + mechanism; targets + CPC classes; HTA countries), name the sources, and set a watchlist. The type's standard sources and fields are prefilled |
| 3 | **First build** | Assistant, on request ("build the patent radar for Program X") | Uses the type's collection template; proposes tracker rows and events with sources; the user reviews |
| 4 | **Monitor** | Automation per type | The refresh brief covers all active radars of that type: changes since the last run → proposals + source report → digest email (type-specific template) |
| 5 | **Judge** | User | Confirm, edit or dismiss proposals; edit the "so what" |
| 6 | **Use** | User, other apps | Trackers, calendar and events in decks and updates; events shared with Programs, Partnerships and Investor Updates; transactions for Fundraise and later Deal Comps |
| 7 | **Review** | Automation (quarterly) or on request | Cross-radar review report per program |

---

## 3. Evidence and references

Sources read 14 November 2026: Citeline (Pharmaprojects, Biomedtracker), Evaluate, AlphaSense, Patsnap, Contify, DataLookout, PageCrawl, clinical-intelligence guides; Literature Radar 1.2.2. Earlier findings: enterprise intelligence costs tens of thousands per seat, so small teams often go without; registry changes are early signals; every insight needs a cited source; generic AI risks invented facts; weekly alerts plus a quarterly review is a common rhythm. Validate with design partners.

| Reference | Role |
|---|---|
| **Citeline Pharmaprojects / Biomedtracker, Evaluate** | Pipeline, events and catalyst model |
| **Patsnap / Lens.org** | Patent families and legal-event model (no legal opinions) |
| **AlphaSense / Contify** | AI briefings with sources, on a cadence, per topic |
| **DataLookout** | Low-cost registry monitoring for small teams |
| **Literature Radar 1.2.2** (ours) | Publications, reading queue, synthesis |

---

## 4. Scope

**In:**
- six radar types with trackers, collection templates and recommended automations
- multiple radars per type, each with scope, named sources and a watchlist
- the shared events feed with impact and "so what"
- a calendar (readouts, PDUFA and CHMP dates, HTA decisions, patent expiries, deal milestones)
- a reading queue for literature
- research briefs and runs with source reports
- review reports
- outputs `radar.events` and `radar.transactions`

**Out (v1):**
- direct data connections
- copying paid content beyond the user's licence (summarise and cite)
- forecasts and market sizing
- probability of success
- legal opinions (freedom to operate, validity, infringement)
- full-text storage of articles or patents (links and summaries only)
- social media monitoring

**Small features that delight:**
1. **Pick your radars at install:** the toggles in the install dialog *are* the radar choice. Turn on Pipeline and Patents, and both arrive with schedules and digests ready.
2. **"So what for us"** on every event, confirmed by a person.
3. **One company, all radars:** open "Alpha Pharma" and see its competing assets, new patents, its last financing and its recent papers.
4. **Calendar across radars:** a competitor readout, a patent expiry and an HTA decision on one timeline, with estimates marked "est.".
5. **Source report:** "Patents radar: Espacenet used, Lens.org not reachable, web used." Gaps are never silent.
6. **Reading queue:** papers to read, with a 3-line summary and why each matters (from Literature Radar).

---

## 5. Screens

Custom `frontend-js` app on the Vivid kit, theme **graphite**, declared in `templateLayoutSchema`. **Type tabs appear only for radar types in use**, and tabs can be reordered or hidden in the layout gear. Four capabilities per screen; detail panels on the side. All lists are paged (performance note for large finding sets).

| # | Screen (id) | Capabilities |
|---|---|---|
| 1 | **Overview** (`overview`) | (1) Radars by type with counts and last run. (2) High-impact events to review. (3) Coming dates (90 days) across radars. (4) Source report gaps. |
| 2 | **Radars** (`radars`) | (1) New radar from a type, with prefilled fields and sources. (2) Scope definition per type (see §7 `scope` fields), program link, named sources (name, covers, priority, notes), watchlist. (3) "Build now" / "Refresh now" on request, and links to the type's automation. (4) Pause or archive a radar. |
| 3 | **Pipeline** (`pipeline`) | (1) Comparison table: own asset first, then competitors (company, mechanism, modality, phase, line, lead trial, n, endpoint, next readout est./confirmed, partner, last verified). (2) Trials per asset with registry IDs and changes. (3) Group by phase or mechanism. (4) Confirm or edit proposals. |
| 4 | **Literature** (`literature`) | (1) Publications with type (paper, preprint, abstract, review), journal or venue, date, DOI/PMID, topic, relevance. (2) Reading queue: to read / read / key, with assignee. (3) 3-line summary and why it matters. (4) Synthesis notes per topic. |
| 5 | **Patents** (`patents`) | (1) Patent families: number(s), office, assignee, title, priority date, status (filed / published / granted / lapsed / expired / opposed), estimated expiry, CPC, relevance. (2) Legal events. (3) Claims summary (assistant, marked as a summary, not legal advice). (4) Watch by assignee, target or own family. |
| 6 | **Commercial** (`commercial`) | (1) Products in your indication: company, approvals by region with dates, label highlights, pricing or reimbursement status by country, guideline position, reported sales (as reported, with period). (2) Upcoming decisions (PDUFA, CHMP, HTA). (3) Changes since last confirmation. (4) Sources per field. |
| 7 | **Funding & deals** (`deals`) | (1) Transactions: kind (financing / IPO / M&A / license / partnership / grant), parties, date, amount and currency, upfront and milestones (as disclosed), stage, asset, investors. (2) Filter by kind, modality, stage, period. (3) Totals by period (disclosed amounts only). (4) Send to Fundraise or Partnerships context (as events). |
| 8 | **Regulatory** (`regulatory`) | (1) Items: agency, kind (guidance / designation / advisory committee / decision / policy), date, status, programs affected. (2) Consultation deadlines. (3) Impact notes. (4) Sources. |
| 9 | **Events** (`events`) | (1) Review queue across radars: proposed events with source, date and the assistant's impact note; confirm, edit, dismiss with a reason. (2) Feed of confirmed events, filtered by radar, type, company, impact. (3) Duplicates merged. (4) Export. |
| 10 | **Calendar** (`calendar`) | (1) Dated items across radars (estimate vs confirmed). (2) Filter by radar, type, watchlist. (3) Past events on the same timeline. (4) Export as a table or image. |
| 11 | **Reviews & settings** (`settings`) | (1) Review reports (quarterly or on request), saved as documents. (2) Radar types: default fields, sources and collection templates (editable copies per workspace). (3) Event types and impact scale. (4) Links to Automations (schedules and email templates) and Access. |

---

## 6. Collection templates and briefs

Each radar type ships a **collection template**: a written instruction plus a structured return format for the assistant. The app combines it with each radar's scope, sources, watchlist and last-run date into a **brief**. Automations and on-request chat runs use the same brief.

**Common to every brief:**
- **Task:** build (everything relevant), refresh (changes since `last_run_on`) or review (synthesis).
- **Sources:** named, in priority order. "Reach each one however you can (connector if available, otherwise the web). If a source can't be reached, say so and continue."
- **Rules:**
  - every fact needs a source URL or reference and a date
  - mark estimates as estimates
  - summarise paid content, don't copy it
  - don't guess missing values
  - respect exclusions
  - give no legal, investment or medical advice
- **Return:** tracker proposals (fields as in §7), event proposals with impact and "so what", and the **source report**.

**What each type's template asks for:**

| Type | Look for | Return fields |
|---|---|---|
| Pipeline & trials | Competing assets matching indication/mechanism (+ modality, line); trial registrations and changes (status, dates, enrollment, endpoints); readouts; discontinuations; new entrants | Asset and trial fields; events: readout, trial_start, trial_change, trial_stop, new_entrant, discontinuation |
| Literature | Publications and preprints on the scope's topics, targets and key authors; congress abstracts in the period | Publication fields with a 3-line summary and why it matters; event: publication or conference for high-relevance items |
| Patents | New publications and grants by watched assignees or matching targets/CPC classes; legal events on watched families; expiries within 24 months | Patent fields with a claims summary marked "summary, not legal advice"; events: patent_filed, patent_granted, patent_legal_event, patent_expiry |
| Commercial | Approvals and label changes; launch news; pricing, reimbursement and HTA decisions in the scope's countries; guideline updates; sales as reported | Product fields per region and country; events: approval, label_change, launch, hta_decision, pricing, guideline, sales_reported |
| Funding & deals | Financings, IPOs, M&A, licensing and partnering deals, grants matching the scope (modality, indication, region, stage) | Transaction fields (disclosed values only); event: financing, ipo, acquisition, license, partnership, grant |
| Regulatory & policy | Guidances, designations, advisory committees, decisions and policy changes affecting the scope | Regulatory item fields; events: guidance, designation, adcom, regulatory_decision, policy |

Workspaces can edit copies of the collection templates in Settings. The originals stay as the template default.

---

## 7. Data model

Principles as in [Runway §5](RUNWAY.md#5-data-model). App tables use the `radar.*` prefix. The install creates all tables (they're empty until a radar uses them), so adding a radar type later needs no new install step.

**Shared roles**

| Role | Contract | Mode | Use |
|---|---|---|---|
| `programs` | core.v1 | read | Own programs a radar belongs to |
| `organizations` | core.v1 | read/write | Companies, universities, investors, agencies |
| `studies` | core.v1 | optional, read | Own trials for comparison |

**Common tables**

| Table | Key fields (kind) |
|---|---|
| `radar.settings` (one row) | lookback_days (number, 90), brief_depth (select: focused / broad), language (text), impact_scale (text, JSON), collection_templates (text, JSON: workspace copies per type) |
| `radar.radars` | name (text*), type (select*: pipeline / literature / patents / commercial / deals / regulatory), program_id (text), scope (text*, JSON: type-specific, e.g. pipeline {indication, mechanism, modality, line, geographies}; patents {targets, cpc, assignees, own_families}; commercial {indication, countries}; deals {modalities, indications, regions, stages, kinds}; literature {topics, targets, authors}; regulatory {agencies, topics}), include_notes (text), exclude_notes (text), sources (text*, JSON: name, covers, priority, notes), watchlist (text, JSON), last_run_on (date), status (select*: active / paused), archived (boolean) |
| `radar.events` (output, `radar.v1`) | radar_id (text*), radar_type (text*), program_id (text), organization_id (text), subject_table (text), subject_id (text), kind (select*: see §6), title (text*), summary (text), occurred_on (date), expected (boolean), expected_window (text), impact (select*: high / medium / low / none), direction (select: threat / opportunity / neutral), so_what (text), sources (text*, JSON), status (select*: proposed / confirmed / dismissed), dismiss_reason (text), confirmed_by (text), run_id (text) |
| `radar.runs` | radar_type (text*), radar_ids (text*), kind (select*: build / refresh / review), run_on (date*), assistant (select: claude / chatgpt), automation_id (text), sources_report (text*, JSON per radar), proposals (number), status (select*: completed / partial / failed) |
| `radar.reviews` | program_id (text), radar_ids (text), period (text*), document_id (text*), event_ids (text), created_on (date*), created_by (select: claude / chatgpt / user) |

**Tracker tables** (every row also has `radar_id` (text*), `sources` (text*, JSON), `last_verified_on` (date), `review_status` (select*: proposed / confirmed / dismissed))

| Table | Key fields (kind) |
|---|---|
| `radar.assets` | name (text*), organization_id (text*), partner_ids (text), mechanism, modality, phase (select*: preclinical … approved / discontinued), indications, line_of_therapy, status (select*: active / paused / discontinued), next_readout (text), next_readout_estimated (boolean), watched (boolean), own (boolean) |
| `radar.trials` | asset_id (text*), registry_ids (text*), title, phase, status, enrollment (number), primary_endpoint, primary_completion (date), completion_estimated (boolean), countries, last_change |
| `radar.publications` | title (text*), kind (select*: paper / preprint / abstract / review / other), venue (text), published_on (date*), doi (text), pmid (text), url (text*), authors (text), topic (text), summary (text), why_it_matters (text), relevance (select: high / medium / low), queue_status (select: to_read / read / key / skipped), assignee (text) |
| `radar.patents` | family_id (text), numbers (text*), office (text), assignee_id (text), title (text*), priority_date (date), status (select*: filed / published / granted / lapsed / expired / opposed / withdrawn), expiry_estimate (date), cpc (text), claims_summary (text), relevance (select), own_family (boolean), legal_events (text, JSON) |
| `radar.products` | name (text*), organization_id (text*), indication (text*), approvals (text, JSON: region, date, label highlights), access (text, JSON: country, status, price note, decision date), guideline_position (text), sales_reported (text, JSON: period, amount, currency, source), next_decision (text), next_decision_on (date) |
| `radar.transactions` (output, `radar.v1`) | kind (select*: financing / ipo / acquisition / license / partnership / grant), title (text*), announced_on (date*), organization_ids (text*), lead_investor_ids (text), asset (text), modality (text), indication (text), stage (text), amount (number), currency (text), upfront (number), milestones (number), terms_note (text), disclosed (boolean) |
| `radar.regulatory_items` | agency (text*), kind (select*: guidance / designation / adcom / decision / policy / consultation), title (text*), date (date*), status (text), deadline (date), programs_affected (text), summary (text) |

`*` = required. All assistant output starts as proposed; confirming sets `last_verified_on`. A proposal without a source can't be confirmed.

**Registry:** outputs `radar.events` and `radar.transactions`, contract `radar.v1`, writer `life.bio-radar`. Readers:
- `radar.events`: Programs, Partnerships, Investor Updates
- `radar.transactions`: Fundraise (comparable rounds), Partnerships (comparable deals), Deal Comps later (BT2-18)

Only confirmed rows are readable by other apps.

---

## 8. Recommended automations and email templates

Declared in the catalog as `recommendedAutomations` ([platform scope](../../RECOMMENDED_AUTOMATIONS.md)) and offered in the install dialog. Each is a platform automation linked to the app, on the runner the owner picks; emails go to workspace members under the email limits. Each type's scan covers all active radars of that type; with no active radar of the type, the run does nothing and sends nothing.

| Key | Name | Default | Trigger | Steps |
|---|---|---|---|---|
| `pipeline-scan` | Pipeline & trials scan + digest | **On** | Weekly, Monday 07:00 | Research (pipeline brief) → email (research content) |
| `literature-scan` | Literature scan + digest | Off | Weekly, Monday 07:00 | Research → email |
| `patents-scan` | Patents scan + digest | Off | Monthly, first Monday 07:00 | Research → email |
| `commercial-scan` | Commercial scan + digest | Off | Monthly, first Monday 07:00 | Research → email |
| `deals-scan` | Funding & deals scan + digest | Off | Weekly, Monday 07:00 | Research → email |
| `regulatory-scan` | Regulatory & policy scan + digest | Off | Monthly, first Monday 07:00 | Research → email |
| `high-impact-alert` | High-impact alert | **On** | After any scan (E3) | Email only if the run proposed a high-impact event on a watched item; one email per run |
| `quarterly-review` | Quarterly review | Off | Quarterly, first Monday | Research (review brief, all radars per program) → report saved to Reviews → email summary |

> **Platform note:** this is 8 recommendations. The platform scope's limit is raised from 6 to **10** per template (updated in [RECOMMENDED_AUTOMATIONS.md](../../RECOMMENDED_AUTOMATIONS.md) §2).

**Email templates** (stored in the automations; editable; filled by the research run; about 200 words maximum; empty sections omitted; every item links into the app):

**Digest (one per type, same frame):**
> **Subject:** {Type} radar · {date}: {n_high} high-impact · {n_new} new · {n_dates} dates in 90 days
>
> **Bottom line:** one or two sentences on what changed for your programs.
> **High impact** (max 3): {item}: {what happened} → *for us:* {so what} · [source]
> **{Type section}** (max 3; see below)
> **Coming up (90 days):** dated items, with estimates marked "est."
> **Coverage:** sources used · not reachable (only if any)
> Review {n} proposals →

Type sections:
- **Pipeline:** trial changes and new entrants.
- **Literature:** must-read papers with a one-line why.
- **Patents:** new grants and legal events on watched families, and expiries within 24 months.
- **Commercial:** approvals, HTA and pricing decisions, label changes.
- **Funding & deals:** the largest disclosed deals and financings in scope, with totals for the period (disclosed only).
- **Regulatory:** new guidances and designations, and consultation deadlines.

**High-impact alert:**
> **Subject:** Alert · {item}: {headline}
>
> **What happened:** one sentence with date and source.
> **Why it matters for {program}:** one or two sentences.
> **Check next:** one or two concrete follow-ups.
> Confirm in Bio Radar →

**Quarterly review summary:**
> **Subject:** Bio Radar review · {program} · {quarter}
>
> **Positioning** (2 sentences) · **What changed** (max 5, across radars) · **Ahead next two quarters** · **Threats / opportunities** (max 3 each) · **Decisions to consider** (max 3) · Full report →

---

## 9. Rules

- **Estimates:** registry completion dates, expected decision dates and patent expiry estimates are marked "est." everywhere (tracker, calendar, emails). They're never shown as confirmed.
- **Duplicates:** the same registry ID, DOI/PMID, patent family or transaction (parties + kind + date ±7 days) merges proposals and combines sources.
- **Changed since confirmation:** differing fields are highlighted until confirmed or dismissed.
- **High-impact alert:** only watched items with impact = high; one email per run.
- **Source report:** each named source is used / not reachable / not relevant per radar and run. A source not reachable in 3 consecutive runs shows a hint.
- **Deals totals:** sum of disclosed amounts only, converted to the reporting currency only if Runway's rates are available (otherwise listed by currency).
- **Patents:** claims summaries and relevance are informational; the app shows "Not legal advice" on the Patents screen and in patent emails.
- Bounded, paged reads everywhere.

---

## 10. Access control and AI

- **App-level access as usual.** Radar data is internal; summaries of licensed content stay in the workspace.
- **Claude and ChatGPT** (each user's connection, and the runner for automations) read briefs and the records the user can read. They propose tracker rows, events, summaries and reviews, and never confirm.
- **Automations** follow platform rules: owner-managed, chosen runner, email to members only, email limits.

---

## 11. Connections to other apps (by role, any install order)

| App | How | What the user gets |
|---|---|---|
| **Programs (02)** | Shares `programs`; reads `radar.events` | Competitor and regulatory context next to milestones |
| **Partnerships (07)** | Shares `organizations`; reads `radar.events` and `radar.transactions` | Partner pipelines, competitor deals, comparable deals |
| **Fundraise (03)** | Reads `radar.transactions` (financings) | Comparable rounds and active investors in your space |
| **Investor Updates (06)** | Draft source (`radar.events`, pipeline comparison) | Sourced "landscape" section |
| **Data Room (08), Board (14)** | Comparison, calendar and review reports as documents | Landscape slides and board appendix |
| **Deal Comps (18), later** | Reads `radar.transactions` | Deal comparables |

Bio Radar never writes another app's own tables.

---

## 12. Assistant behaviour

- Follow the type's collection template and the radar's brief: named sources in order, any access route, report unreachable sources.
- Source and date for every fact; mark estimates; never invent values; summarise paid content.
- Write "so what" specific to the user's program, with one concrete check.
- Keep emails within templates and word limits.
- Never: confirm proposals, give legal (patents), investment or medical advice, or present estimates as facts.
- **`whenToUse`:** watching a biotech's field: competitor pipelines and trials, literature, patents, commercial and HTA decisions, financings and deals, regulatory changes; reviews and briefings. **`whenNotToUse`:** managing own partners (Partnerships), own trials (Programs), forecasting, legal opinions.

---

## 13. Package checklist and acceptance criteria

**Package:**
- template source under `templates/source/bio-radar/` and immutable `templates/apps/life.bio-radar-1.0.0.json` (draft until approved)
- roles as in §7, and `radar.v1` registry entries
- six radar types with default fields, sources and collection templates
- the brief builder
- `recommendedAutomations` as in §8, with email templates
- full `catalog.metadata.json`
- fictional `demo_data.json`: one radar per type for two programs, 12 assets, 18 trials, 30 publications, 15 patent families, 6 products, 20 transactions, 10 regulatory items, 60 events, runs with source reports, 1 review
- `templateLayoutSchema` with screen ids (type tabs hidden when unused)
- build `--check` and browser test
- Literature Radar hidden from the catalog

**Acceptance (beyond the shared contract and the platform scope):**
1. **Install:** the install dialog lists the 8 recommendations with defaults. The owner turns on Patents and Deals as well; the four automations are created and linked to the app.
2. **New radar:** creating a Patents radar prefills its fields and sources, and its tab appears. Unused type tabs stay hidden.
3. **Build on request:** "build the pipeline radar for Program X" returns tracker and event proposals with sources and a source report. Unsourced proposals can't be confirmed.
4. **Scheduled scan:** each type's scan covers its active radars, records the run with source reports, and sends the type's digest within the word limit. With no active radar of a type, nothing is sent.
5. **Unreachable source:** it's reported and the run continues on the web; after 3 runs a hint appears.
6. **High-impact alert:** one email per run, only for watched high-impact events, within email limits.
7. **Estimates** show "est." in trackers, calendar and emails.
8. **Outputs:** confirmed events and transactions are readable by Programs, Partnerships, Fundraise and Investor Updates; proposed and dismissed ones are not.
9. **Patents** show "Not legal advice" on the screen and in emails.
10. **Assistants** propose only.
11. **Modularity and archiving:** the modularity test (rule 9) and archive-first checks pass. Archiving the app pauses linked automations; restoring offers to resume them.
12. **Performance:** paged lists with 5,000 events and 2,000 publications stay responsive.
13. **Layout:** desktop 1440 and mobile 390.

**Open for design partners:** which radar types are on by default; default cadences; impact wording.
