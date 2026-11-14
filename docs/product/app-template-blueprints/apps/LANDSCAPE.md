# Landscape — final app scope (BT2-10)

*Competing assets, trials, readouts and deals for each of your programs. Claude or ChatGPT does the landscaping; the app stores, structures and schedules it.*

**Status:** Final scope for build, 14 November 2026. Part of [Biotech apps v2](../BIOTECH_v2.md) (rank 10, TrialAgents edge). New template `life.landscape` 1.0.0, display name **Landscape**. It absorbs and retires **Literature Radar** (`life.literature-radar`): released versions stay installable, but the template is hidden from the catalog. No existing users.

**Depends on:**
- TrialAgents Automations (research → email chain on the user's Claude or ChatGPT runner)
- the platform change **"Recommended automations in the install dialog"** ([Modular apps §7](../../MODULAR_APPS_AND_SHARED_DATA.md#install-dialog-data-access-and-automations), [Automations](../../APP_CONFIGURATION_AND_AUTOMATIONS.md#recommended-automations-at-install))

Build the platform through the [RA1–RA5 implementation plan](../../RECOMMENDED_AUTOMATIONS_IMPLEMENTATION.md), then this app in a separate PR. Do not treat the install popup alone as sufficient platform support.

**Governing contracts:** project context, template authoring and usage guidance (latest, all `nextOffset`s), shared build contract, interface rules, access control, write authorization, field capabilities, shared data, [modular apps and shared data](../../MODULAR_APPS_AND_SHARED_DATA.md), [apps, access and automations](../../APP_CONFIGURATION_AND_AUTOMATIONS.md) (including email limits), and the contract registry. They win on any conflict.

**Decisions (14 Nov 2026):**
- **The assistant does the landscaping.** Claude or ChatGPT searches, reads, extracts and judges. The app only stores the results, structures insights (comparison, calendar, events, impact), and tells the assistant **what** to look for and **when**, through its research briefs.
- **Sources are named, not connected.** Each landscape lists sources by name (e.g. "TrialAgents Intel – EU trials", "ClinicalTrials.gov", "PubMed", "company press releases", or a paid source the user has). The assistant decides how to reach each one: a connector the user has added, or the web. **Web is the default.** The app never connects to data sources itself.
- **Automations belong to the platform.** Research runs and emails are normal TrialAgents Automations linked to the app (research → email chain). The app ships pre-built recommendations selected by default in the concise **install dialog**; Add app approves and enables eligible work. The owner can also add and activate these features later from Automations, ChatGPT or Claude, through normal platform authorization. Optional setup failures never block the app.
- **Analytical email templates.** The emails are concise, analytical templates that live in the automation definitions (editable in Automations), not in the app.

---

## 1. The journey

| # | Stage | Who | What happens |
|---|---|---|---|
| 1 | **Install** | Owner | Install dialog: data tables, access, and the recommended automations (weekly scan + digest, high-impact alert, quarterly review) with their schedules and recipients |
| 2 | **Define** | User | A landscape per program: indication, mechanism (or target), modality, line of therapy, geographies, named sources, watchlist |
| 3 | **First build** | Assistant (on request: "build the landscape for Program X") | Proposes competitor assets, their trials and recent events, each with sources; the user reviews |
| 4 | **Monitor** | Automation (weekly default) | The research brief tells the assistant what changed since the last run to look for. Results come back as proposals, followed by the digest email |
| 5 | **Judge** | User | Confirm or dismiss events; edit the assistant's "so what" for your program |
| 6 | **Use** | User, other apps | Comparison and calendar for board, BD and investor materials; events shared with Partnerships, Investor Updates and Programs |
| 7 | **Review** | Automation (quarterly) or on request | Landscape review report: what changed, what's ahead, threats and opportunities |

---

## 2. Evidence and references

Sources read 14 November 2026: Citeline (Pharmaprojects, Biomedtracker), Evaluate competitive intelligence, AlphaSense, Patsnap, Contify, DataLookout, PageCrawl and clinical-intelligence guides. These are vendor sources; there are few public user reviews of enterprise CI tools. Validate with design partners.

| Need | Signal | Confidence |
|---|---|---|
| Pipeline by phase, mechanism and modality, plus a trial timeline | Core modules of Evaluate and Citeline | High |
| Events: readouts, approvals, deals, catalysts | Biomedtracker's core; AlphaSense agents send daily or weekly roundups | High |
| Early signals from registry changes | Status, dates, enrollment and endpoint changes often appear in registries before press releases | High |
| Affordable for small biotechs | Enterprise CI costs tens of thousands per seat; small teams often go without | High |
| Sources and judgment, not just data | Every insight needs a cited source; CI is a judgment about what the data changes for a decision; generic AI risks invented facts | High |
| Rhythm | Weekly alerts plus a quarterly landscape review; congress sprints | Medium–high |

| Reference | Role |
|---|---|
| **Citeline Biomedtracker / Pharmaprojects** | Asset and event model, catalyst calendar |
| **Evaluate** | Pipeline and trial timeline views |
| **AlphaSense** | AI briefings with sources, on a cadence |
| **DataLookout** | Registry change monitoring for small teams |

---

## 3. Scope

**In:**
- landscapes per program, defined by indication and mechanism, optionally modality, line of therapy and geography
- a named source list per landscape
- competitor assets
- competitor trials with registry IDs
- events (readouts, trial changes, approvals, regulatory, deals, financings, publications, conference data, new entrants, discontinuations)
- an impact note ("so what") per event
- a comparison table against your own asset
- a readout calendar with estimates
- a watchlist
- research briefs and run logs with a source report
- landscape review reports
- recommended automations with analytical email templates
- the `landscape.v1` events output

**Out (v1):**
- direct data connections
- copying paid-database content beyond the user's licence (the brief tells the assistant to summarise and cite)
- forecasts, market sizing and probability of success
- patent landscapes
- full-text article storage
- trial design benchmarking beyond the listed fields

**Small features that delight:**
1. **"So what for us":** every event carries one line on what it means for your program (threat, opportunity or neutral, plus what to check), confirmed by a person.
2. **Readout calendar:** "Next 90 days: 3 competitor readouts (2 estimated from registry dates)".
3. **Source report:** "Last run used: TrialAgents Intel, ClinicalTrials.gov, web. Missing: PubMed (not reachable)." Gaps are never silent.
4. **Change since last look:** an asset shows what changed (phase, trial status, dates) since you last confirmed it.
5. **Board-ready comparison:** your asset next to competitors in one table, ready to drop into Investor Updates or a data room deck.

---

## 4. Screens (7)

Custom `frontend-js` app on the Vivid kit, theme **graphite** (intelligence), declared in `templateLayoutSchema`. Four capabilities per screen; asset, trial and event details open in the side panel.

| # | Screen (id) | Capabilities |
|---|---|---|
| 1 | **Overview** (`overview`) | (1) Landscapes with counts: assets by phase, events this month, high-impact open. (2) Coming readouts (90 days). (3) Events waiting for review. (4) Last run and source report per landscape. |
| 2 | **Landscapes** (`landscapes`) | (1) Definition: program, indication, mechanism/target, modality, line, geographies, inclusion and exclusion notes. (2) **Sources:** name, what it covers, priority, notes (e.g. "summarise only"); standard list prefilled. (3) Watchlist (assets and companies). (4) "Build now" or "Refresh now" (on request in chat), and a link to this landscape's automations. |
| 3 | **Competitors** (`competitors`) | (1) Comparison table: your asset first, then competitors with company, mechanism, modality, phase, line, lead trial, n, primary endpoint, next readout, partner, status, last verified. (2) Group by phase or mechanism; filter. (3) Asset panel: trials, events, sources, changes since last confirmation. (4) Confirm or edit fields (proposals from the assistant are marked). |
| 4 | **Calendar** (`calendar`) | (1) Timeline of expected readouts and regulatory dates (estimate vs confirmed), by landscape. (2) Past events on the same timeline. (3) Filter by watchlist, impact and type. (4) Export as a table or image for decks. |
| 5 | **Events** (`events`) | (1) Review queue: proposed events with source, date and the assistant's impact note; confirm, edit or dismiss with a reason. (2) Feed of confirmed events, filtered by landscape, company, type and impact. (3) Publications and conference data as event types (absorbs Literature Radar). (4) Duplicates merged; each event links to its sources. |
| 6 | **Reviews** (`reviews`) | (1) Landscape review reports (quarterly or on request), saved as documents. (2) Pre-congress briefings. (3) Each report lists the events and sources it used. (4) Compare with the previous review. |
| 7 | **Settings** (`settings`) | (1) Standard source list and default priorities. (2) Event types and impact scale. (3) Brief defaults: lookback window, depth, language. (4) Links to Automations (where schedules and email templates live) and Access. |

---

## 5. Research briefs (what the app tells the assistant)

The app builds a brief per landscape and run type; the automation's prompt uses it, and on-request runs in chat use the same brief. The brief is generated from the app's records, so it is always current.

**Brief contents:**
- **Landscape:** definition, own asset summary, known competitor assets and trials with last-verified dates, watchlist.
- **Task:**
  - *build:* find all relevant assets, trials and recent events
  - *refresh:* find changes since `last_run_on`, focusing on registry changes, readouts, approvals, deals, financings, publications, new entrants and discontinuations
  - *review:* a quarterly synthesis
- **Sources, in priority order, by name.** "Reach each source however you can (connector if available, otherwise the web). If a source can't be reached, say so and continue."
- **Rules:**
  - every fact needs a source URL or reference and a date
  - mark estimates (e.g. registry primary completion) as estimates
  - summarise paid sources, don't copy them
  - don't guess missing values
  - respect exclusions
- **Return format** (structured): asset, trial and event proposals with fields as in §7; an impact note per event; and a **source report** (each named source: used / not reachable / not relevant; plus other sources used).

The assistant's results are saved as reviewed proposals (platform write review). Nothing is confirmed without a person.

---

## 6. Recommended automations and email templates

These are platform automations linked to the app. They are offered concisely in the install dialog, all selected by default unless the user opts out; Add app activates eligible work. Afterwards they are managed in Automations and through authorized chat. Reuse the [platform automation scope](../../RECOMMENDED_AUTOMATIONS.md), including independent app availability and later setup from app features. Each one runs on the runner of the assistant the owner chooses (Claude or ChatGPT), and the email step respects the platform email limits: one app email per recipient per rolling hour, and the daily account cap.

| Automation | Default | Schedule | Steps |
|---|---|---|---|
| **Landscape scan + weekly digest** | On | Weekly, Monday 07:00 (daily or monthly selectable) | Research (refresh brief, all landscapes) → email to chosen members |
| **High-impact alert** | On | After each scan | Email only when a watched asset has a high-impact proposed event (readout, approval or rejection, trial stop, major deal); grouped into one email per run |
| **Quarterly landscape review** | On | First Monday of each quarter | Research (review brief) → report saved to Reviews → email summary |

**Email templates** (stored in the automation; editable; the assistant fills them from the run; about 200 words maximum; empty sections omitted; every item links to its event in the app):

**1. Weekly digest**
> **Subject:** Landscape · {landscape} · week of {date}: {n_high} high-impact · {n_changes} changes · {n_upcoming} readouts in 90 days
>
> **Bottom line:** one or two sentences on what changed for {program} this week.
> **High impact** (max 3): {company} {asset}: {event} → *for us:* {so what} · [source]
> **Trial changes** (max 3): {trial id}: {change} (e.g. completion moved Q2→Q4 2027; enrollment cut 240→160)
> **Coming up (90 days):** {date or estimate} {company} {asset}: {readout}
> **New in the landscape** (max 3): new entrants, publications, deals
> **Coverage:** sources used · not reachable: {list} (only if any)
> Review {n} proposed events →

**2. High-impact alert**
> **Subject:** Alert · {company} {asset}: {event headline}
>
> **What happened:** one sentence with date and source.
> **Why it matters for {program}:** one or two sentences (threat, opportunity or neutral).
> **Check next:** one or two concrete follow-ups (e.g. "compare their primary endpoint with ours", "tell BD: partner X now has a competing asset").
> Confirm in Landscape →

**3. Quarterly review summary**
> **Subject:** Landscape review · {landscape} · {quarter}
>
> **Positioning:** where {program} stands vs. the field (phase, differentiation), in two sentences.
> **What changed this quarter** (max 5).
> **Ahead next two quarters:** readouts and regulatory dates.
> **Threats / opportunities** (max 3 each).
> **Decisions to consider** (max 3).
> Full report →

---

## 7. Data model

Principles as in [Runway §5](RUNWAY.md#5-data-model). App tables use the `landscape.*` prefix.

**Shared roles**

| Role | Contract | Mode | Use |
|---|---|---|---|
| `programs` | core.v1 | read | Own assets a landscape belongs to |
| `organizations` | core.v1 | read/write | Competitor companies and partners |
| `studies` | core.v1 | optional, read | Own trials for comparison |

**Own tables (`landscape.*`)**

| Table | Key fields (kind) |
|---|---|
| `landscape.settings` (one row) | default_sources (text, JSON), event_types (text, JSON), lookback_days (number, 90), brief_depth (select: focused / broad, focused), language (text) |
| `landscape.landscapes` | name (text*), program_id (text*), indication (text*), mechanism (text*), modality (text), line_of_therapy (text), geographies (text), include_notes (text), exclude_notes (text), sources (text*, JSON: name, covers, priority, notes), watchlist (text, JSON: asset ids, organization ids), last_run_on (date), status (select*: active / paused), archived (boolean) |
| `landscape.assets` | landscape_id (text*), name (text*), organization_id (text*), partner_ids (text), mechanism (text), modality (text), phase (select*: preclinical / phase_1 / phase_1_2 / phase_2 / phase_2_3 / phase_3 / filed / approved / discontinued), indications (text), line_of_therapy (text), status (select*: active / paused / discontinued), next_readout (text), next_readout_estimated (boolean), watched (boolean), sources (text*, JSON), last_verified_on (date), review_status (select*: proposed / confirmed / dismissed) |
| `landscape.trials` | asset_id (text*), registry_ids (text*, e.g. EU CT number, NCT), title (text), phase (text), status (text), enrollment (number), primary_endpoint (text), primary_completion (date), completion_estimated (boolean), countries (text), last_change (text), sources (text*, JSON), last_verified_on (date), review_status (select*) |
| `landscape.events` (output, `landscape.v1`) | landscape_id (text*), program_id (text*), asset_id (text), organization_id (text), kind (select*: readout / trial_start / trial_change / trial_stop / approval / regulatory / deal / financing / publication / conference / new_entrant / discontinuation / other), title (text*), summary (text), occurred_on (date), expected (boolean), expected_window (text), impact (select*: high / medium / low / none), direction (select: threat / opportunity / neutral), so_what (text), sources (text*, JSON), status (select*: proposed / confirmed / dismissed), dismiss_reason (text), confirmed_by (text), run_id (text) |
| `landscape.runs` | landscape_id (text*), kind (select*: build / refresh / review), run_on (date*), assistant (select: claude / chatgpt), automation_id (text), sources_report (text*, JSON), proposals (number), status (select*: completed / partial / failed) |
| `landscape.reviews` | landscape_id (text*), period (text*), document_id (text*), event_ids (text), created_on (date*), created_by (select: claude / chatgpt / user) |

`*` = required. All assistant output is a proposal (`review_status` / `status` = proposed) until confirmed. Confirming an asset or trial sets `last_verified_on`.

**Registry:** add output role `landscape.events` (contract `landscape.v1`, writer `life.landscape`). Readers: Partnerships (partner and competitor deals), Investor Updates (draft source), Programs (context).

---

## 8. Rules

- **Next readout:** confirmed company guidance if present, otherwise the registry primary completion date marked as an estimate (shown as "est."; never as a confirmed date).
- **Changed since last confirmation:** fields that differ between the latest proposal and the confirmed value are highlighted until confirmed or dismissed.
- **Duplicates:** proposals with the same registry ID, or the same company, asset, kind and date ±7 days, are merged, and their sources combined.
- **Source required:** a proposal without a source cannot be confirmed.
- **High-impact alert:** only for watched assets or companies with impact = high; at most one alert email per run, grouping all such events.
- **Source report:** each named source is used / not reachable / not relevant per run. A source not reachable in 3 consecutive runs shows a hint in Overview.

---

## 9. Access control and AI

- **App-level access as usual.** Landscape data is internal and may include licensed content summaries; it is never shared outside the workspace.
- **Claude and ChatGPT** (each user's connection, and the runner for automations) read the brief and the landscape records the user can read. They propose assets, trials, events, impact notes and reviews, and never confirm.
- **Automations** follow platform rules: owner-managed, one runner per automation, email to workspace members only, and platform email limits.

---

## 10. Connections to other apps (by role, any install order)

| App | How | What the user gets |
|---|---|---|
| **Programs (02)** | Shares `programs`; reads `landscape.events` as context | Competitive context next to each program |
| **Partnerships (07)** | Shares `organizations`; reads `landscape.events` (deals, new entrants) | Competitor deals and partner pipelines in BD |
| **Investor Updates (06)** | The assistant uses `landscape.events` and the comparison as a draft source | "Competitive landscape" section with sources |
| **Fundraise (03), Data Room (08)** | Comparison and calendar exported as tables or images into documents | Landscape slides in decks and rooms |
| **TrialAgents Intel** | Named source (recommended for EU trials) | EU trial data with sponsors, sites and CROs |

Landscape never writes another app's own tables.

---

## 11. Assistant behaviour

- Follow the brief: named sources in priority order; any access route; say when a source is unreachable.
- Every fact gets a source and a date; mark estimates as estimates; never invent values; summarise paid content.
- Write impact notes that are specific to the user's program and suggest one concrete check.
- Keep emails within the templates and word limits.
- Never: confirm proposals, give investment or valuation advice, or present estimates as facts.
- **`whenToUse`:** competitor assets, trials, readouts, approvals, deals and publications for a biotech's programs; landscape reviews and congress briefings. **`whenNotToUse`:** partner pipeline management (Partnerships), forecasting and market sizing, patent analysis.

---

## 12. Package checklist and acceptance criteria

**Package:**
- template source under `templates/source/landscape/` and immutable `templates/apps/life.landscape-1.0.0.json` (draft until approved)
- roles as in §7, and the `landscape.v1` registry entry
- standard source list
- the brief builder
- **recommended automations** (§6) declared in the catalog with their email templates
- full `catalog.metadata.json`
- fictional `demo_data.json`: 2 landscapes, 14 assets, 20 trials, 40 events, 3 runs with source reports, 1 review
- `templateLayoutSchema` with seven screen ids
- build `--check` and browser test
- Literature Radar hidden from the catalog

**Acceptance (beyond the shared contract):**
1. **Install:** the install dialog shows three concise automation rows, all selected. The owner keeps two and turns one off; Add app enables the eligible two, linked to this app with the chosen runner and recipients. Missing setup is shown separately and never prevents app use. The opted-out recipe remains available later in Automations and chat.
2. **Build on request:** "build the landscape for Program X" produces asset, trial and event proposals with sources and a source report. Proposals without sources cannot be confirmed.
3. **Scheduled refresh:** the weekly run uses the refresh brief (changes since the last run), proposes events with impact notes, records the run with its source report, and sends the digest in the template format within the word limit. Changing the cadence in Automations changes the next run.
4. **Unreachable source:** a named source the assistant cannot reach is reported, and the run continues on the web. After 3 runs a hint appears.
5. **High-impact alert:** a high-impact event on a watched asset triggers one alert email per run, within the email limits. Events on unwatched assets don't.
6. **Estimates:** a registry completion date shows as "est." in the comparison, calendar and emails.
7. **Output:** confirmed events are readable by Partnerships, Investor Updates and Programs as `landscape.v1`; proposed and dismissed events are not.
8. **Assistants** propose only; nothing is confirmed without a person.
9. **Modularity and archiving:** the modularity test (rule 9) and archive-first checks pass. Archiving the app pauses its linked automations, and restoring offers to resume them.
10. **Layout:** desktop 1440 and mobile 390.

**Open for design partners:** default sources per therapeutic area; impact scale wording; whether weekly is the right default.
