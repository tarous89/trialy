# Bio Radars — final scope for the radar family (BT2-10)

*Eight small apps that watch your field. Install only the radars you need; each comes with its tracker, a research template for Claude or ChatGPT, and its automation switched on.*

**Status:** Final scope for build, 14 November 2026. Part of [Biotech apps v2](../BIOTECH_v2.md) (rank 10, TrialAgents edge). It replaces the earlier Landscape and single-app Bio Radar scopes. No existing users.

**The family:**
- Pipeline Radar
- Trial Radar
- Literature Radar (next major version of the existing template)
- Patent Radar
- Market Radar
- Deal Radar
- Funding Radar
- Regulatory Radar

**Depends on:** the platform scope [recommended automations at install](../../RECOMMENDED_AUTOMATIONS.md) with E1–E3 (being built separately). Build order:
1. **Radar kit + Trial Radar** (one PR; our edge with TrialAgents Intel)
2. Pipeline, Literature, Deal and Funding Radar
3. Patent, Market and Regulatory Radar

Each radar after the first is a small PR on the kit.

**Governing contracts:** project context, template authoring and usage guidance (latest, all `nextOffset`s), shared build contract, interface rules, access control, write authorization, field capabilities, shared data, [modular apps and shared data](../../MODULAR_APPS_AND_SHARED_DATA.md), [apps, access and automations](../../APP_CONFIGURATION_AND_AUTOMATIONS.md) (including email limits), the [recommended automations scope](../../RECOMMENDED_AUTOMATIONS.md), and the contract registry. They win on any conflict.

**Decisions (14 Nov 2026):**
- **Separate apps.** Users install only what they need. Each radar is small (4 screens) and versioned on its own.
- **Automation on by default.** Each radar recommends a **scan + digest** and a **high-impact alert**, both **on** in the install dialog. The owner can turn them off there, or later in Automations.
- **Users can edit everything.** The tracker (fields and layout) and the research template are editable by users and by their assistant. Defaults can always be restored.
- **The assistant does the searching.** Claude or ChatGPT searches and reads; the radar stores, structures and schedules, and tells the assistant what and when through a research brief. Sources are named, not connected: the assistant decides how to reach them (its own connector or the web), **web is the default**, and every run returns a source report.
- **No cross-radar app in v1.** A cross-radar review is an on-request assistant task that reads all installed radars. A combined "Radar Overview" app comes only if design partners ask for it.
- **Literature Radar** becomes `life.literature-radar` **2.0.0** on the kit; earlier versions stay installable.

---

## 1. The radars

| App (template id) | Watches | Tracker | Standard named sources | Default cadence |
|---|---|---|---|---|
| **Pipeline Radar** (`life.pipeline-radar`) | Competing assets for your indication or mechanism: company, mechanism, modality, phase, partners, discontinuations, new entrants | Assets | Company pipelines and press releases, Pharmaprojects-type public summaries, news | Weekly |
| **Trial Radar** (`life.trial-radar`) | Trial registrations and changes (status, dates, enrollment, endpoints), readouts, results postings | Trials | **TrialAgents Intel (EU CTIS)**, ClinicalTrials.gov, WHO ICTRP, company releases | Weekly |
| **Literature Radar** (`life.literature-radar` 2.0.0) | Papers, preprints, congress abstracts, reviews on your topics, targets and authors; reading queue | Publications | PubMed, bioRxiv/medRxiv, journals, congress sites | Weekly |
| **Patent Radar** (`life.patent-radar`) | Filings, grants, legal events, expiries for targets, assignees and own families | Patent families | Espacenet, Google Patents, Lens.org, USPTO, EPO Register | Monthly |
| **Market Radar** (`life.market-radar`) | Approvals, launches, label changes, pricing, reimbursement and HTA decisions, guidelines, reported sales | Products | FDA, EMA, HTA bodies (NICE, G-BA, HAS), company reports, guideline societies | Monthly |
| **Deal Radar** (`life.deal-radar`) | Pharma and biotech deals: licensing, partnerships, options, M&A, with disclosed terms | Deals | Press releases, SEC filings, news | Weekly |
| **Funding Radar** (`life.funding-radar`) | Financings, IPOs and grants in your space; active investors | Financings | Press releases, news, SEC filings, grant databases (EU Funding & Tenders, NIH RePORTER) | Weekly |
| **Regulatory Radar** (`life.regulatory-radar`) | Guidances, designations, advisory committees, decisions, consultations and policy changes | Regulatory items | FDA, EMA, MHRA, national agencies, official journals | Monthly |

---

## 2. The radar kit (shared by all eight)

One shared source package (`templates/source/radar-kit/`) builds every radar. Each radar adds only its tracker definition, collection template, sources, email section and demo data.

### 2.1 Screens (4 per radar)

Custom `frontend-js` on the Vivid kit, theme **graphite**, declared in `templateLayoutSchema`. All lists are paged.

| # | Screen (id) | Capabilities |
|---|---|---|
| 1 | **Overview** (`overview`) | (1) High-impact items to review. (2) Coming dates in 90 days (estimates marked "est."). (3) What changed since the last run. (4) Last run and source report, with any gaps. |
| 2 | **Tracker** (`tracker`, label per radar: Assets / Trials / Publications / Patents / Products / Deals / Financings / Items) | (1) The radar's table, with filters, grouping, saved views and export. (2) Detail panel: fields with sources, history, "changed since confirmation". (3) Confirm, edit or dismiss proposals. (4) Watch an item. |
| 3 | **Events** (`events`) | (1) Review queue: proposed events with source, date and the assistant's "so what"; confirm, edit, dismiss with a reason. (2) Confirmed feed with filters. (3) Calendar view of dated events. (4) Duplicates merged. |
| 4 | **Setup** (`setup`) | (1) **Scopes:** one or more per radar (e.g. one per program), each with its definition fields, named sources (name, covers, priority, notes) and watchlist. (2) **Research template:** the editable collection template (see 2.3), with version history and "Restore default". (3) **Tracker fields:** add, hide or rename fields (platform field customization); new fields are added to the research template's return format automatically. (4) Links to Automations (schedule, recipients, email text) and Access, plus "Build now" / "Refresh now" (on request in chat). |

### 2.2 Common data (`<radar>.*` prefix per app, e.g. `trialradar.*`)

| Table | Key fields (kind) |
|---|---|
| `<radar>.settings` (one row) | lookback_days (number, 90), impact_scale (text, JSON), research_template (text*, the workspace's current template), research_template_version (number), language (text) |
| `<radar>.scopes` | name (text*), program_id (text), definition (text*, JSON; fields per radar, §3), sources (text*, JSON: name, covers, priority, notes), watchlist (text, JSON), include_notes (text), exclude_notes (text), last_run_on (date), status (select*: active / paused), archived (boolean) |
| `<radar>.<tracker>` | Radar-specific fields (§3), plus scope_id (text*), sources (text*, JSON), last_verified_on (date), watched (boolean), review_status (select*: proposed / confirmed / dismissed) |
| `<radar>.events` (output) | scope_id (text*), program_id (text), organization_id (text), item_id (text), kind (select*: per radar, §3), title (text*), summary (text), occurred_on (date), expected (boolean), expected_window (text), impact (select*: high / medium / low / none), direction (select: threat / opportunity / neutral), so_what (text), sources (text*, JSON), status (select*: proposed / confirmed / dismissed), dismiss_reason (text), confirmed_by (text), run_id (text) |
| `<radar>.runs` | scope_ids (text*), kind (select*: build / refresh), run_on (date*), assistant (select: claude / chatgpt), automation_id (text), research_template_version (number), sources_report (text*, JSON per scope), proposals (number), status (select*: completed / partial / failed) |

**Shared roles:** `programs` (core.v1, optional, read), `organizations` (core.v1, read/write; companies, investors, agencies).

**Outputs:** each radar writes its own events output in one common contract, `radar.v1`: `pipelineradar.events`, `trialradar.events`, `literatureradar.events`, `patentradar.events`, `marketradar.events`, `dealradar.events`, `fundingradar.events`, `regulatoryradar.events`. Deal Radar and Funding Radar also output their trackers as `dealradar.deals` and `fundingradar.financings`. This keeps one writer per output. Only confirmed rows are readable by other apps.

### 2.3 Research template and brief

Every radar ships a **default research template**: an instruction plus a structured return format. Users (or their assistant, as a reviewed proposal) can edit it in Setup. It's versioned; "Restore default" brings back the template's version, and each run records which version it used.

At run time the radar builds a **brief**: research template + each active scope's definition, sources, watchlist, exclusions + `last_run_on` + the tracker's current fields (including custom ones). Automations and on-request chat runs use the same brief.

**Rules in every default template (users may add rules but not remove these):**
- every fact needs a source URL or reference and a date
- mark estimates as estimates
- summarise paid content, don't copy it
- don't guess missing values
- respect exclusions
- give no legal, investment or medical advice
- reach each named source however you can (connector if available, otherwise the web); report sources you can't reach and continue
- return a **source report**

### 2.4 Recommended automations (per radar, both on)

| Key | Name | Default | Trigger | Steps |
|---|---|---|---|---|
| `scan` | {Radar} scan + digest | **On** | The radar's default cadence (§1), 07:00 workspace time (Monday for weekly; first Monday for monthly) | Research (refresh brief, all active scopes) → email (research content; sent only if there's something to report) |
| `alert` | {Radar} high-impact alert | **On** | After `scan` (E3) | Email only if the run proposed a high-impact event on a watched item; one email per run |

These are created in the install dialog on the owner's chosen runner, with recipients defaulting to the owner. If no runner is connected they're created switched off, with the "connect to activate" note. With no active scope, a scan does nothing and sends nothing.

### 2.5 Email templates (in the automations, editable)

All emails follow the same rules: about 200 words maximum, empty sections omitted, every item linked into the app.

**Digest:**
> **Subject:** {Radar} · {date}: {n_high} high-impact · {n_new} new · {n_dates} dates in 90 days
>
> **Bottom line:** one or two sentences on what changed for your programs.
> **High impact** (max 3): {item}: {what happened} → *for us:* {so what} · [source]
> **{Radar section}** (max 3; §3)
> **Coming up (90 days):** dated items, with estimates marked "est."
> **Coverage:** sources used · not reachable (only if any)
> Review {n} proposals →

**Alert:**
> **Subject:** {Radar} alert · {item}: {headline}
>
> **What happened:** one sentence with date and source.
> **Why it matters for {program}:** one or two sentences.
> **Check next:** one or two concrete follow-ups.
> Confirm in {Radar} →

### 2.6 Common rules

- **Estimates** (registry completion dates, expected decision dates, patent expiry estimates) show "est." everywhere.
- **Duplicates** with the same natural key (§3) are merged and their sources combined.
- **Changed since confirmation:** fields are highlighted until confirmed or dismissed.
- **Unsourced proposals** can't be confirmed.
- **Source report:** each named source is used / not reachable / not relevant per scope and run. A source not reachable in 3 consecutive runs shows a hint on Overview.
- **Cross-radar review** (on request: "review all radars for Program X"): the assistant reads the events outputs of every installed radar it can access and writes a report document. No app or automation is needed.

### 2.7 Access and AI

- App-level access as usual; radar data is internal.
- Claude and ChatGPT read briefs and the records the user can read. They propose tracker rows, events, summaries and research-template edits, and never confirm.
- Automations follow platform rules.

---

## 3. Radar specifics

| Radar | Scope definition | Tracker fields (beyond common) | Natural key | Event kinds | Digest section |
|---|---|---|---|---|---|
| **Pipeline** | indication, mechanism/target, modality, line, geographies | name, organization_id, partner_ids, mechanism, modality, phase (preclinical … approved / discontinued), indications, line, status, next_milestone, next_milestone_estimated, own (boolean) | company + asset name | new_entrant, phase_change, partnership, discontinuation, readout, other | Phase changes and new entrants |
| **Trial** | indication, mechanism or interventions, sponsors, phases, countries | registry_ids, title, sponsor_id, asset, phase, status, enrollment, primary_endpoint, primary_completion, completion_estimated, countries, sites_count, last_change | registry ID | trial_registered, status_change, date_change, enrollment_change, endpoint_change, results_posted, readout, trial_stopped | Trial changes (status, dates, enrollment, endpoints) |
| **Literature** | topics, targets, authors, journals, keywords | title, kind (paper / preprint / abstract / review), venue, published_on, doi, pmid, url, authors, topic, summary (3 lines), why_it_matters, relevance, queue_status (to_read / read / key / skipped), assignee | DOI or PMID | publication, conference_data, retraction | Must-read papers with a one-line why |
| **Patent** | targets, CPC classes, assignees, own families, offices | family_id, numbers, office, assignee_id, title, priority_date, status (filed / published / granted / lapsed / expired / opposed / withdrawn), expiry_estimate, cpc, claims_summary, own_family | family ID | patent_published, patent_granted, legal_event, opposition, expiry_upcoming | New grants and legal events; expiries in 24 months. Plus **"Not legal advice"** on the screen and in emails |
| **Market** | indication, countries or regions | name, organization_id, approvals (region, date, label highlights), access (country, status, price note, decision date), guideline_position, sales_reported (period, amount, currency, source), next_decision, next_decision_on | company + product + indication | approval, label_change, launch, hta_decision, pricing, guideline, sales_reported | Approvals, HTA and pricing decisions, label changes |
| **Deal** | modalities, indications, regions, deal kinds, stages | kind (license / partnership / option / acquisition / collaboration), title, announced_on, organization_ids, asset, modality, indication, stage, upfront, milestones, total, currency, royalties_note, disclosed | parties + kind + date ±7 days | deal_announced, deal_terminated, option_exercised | Largest disclosed deals; period totals (disclosed only) |
| **Funding** | modalities, indications, regions, stages, round kinds | kind (seed / series / crossover / ipo / follow_on / grant / debt), company_id, announced_on, amount, currency, lead_investor_ids, investor_ids, stage, modality, indication, use_of_proceeds | company + kind + date ±7 days | financing, ipo, grant | Rounds in your space; most active investors this period |
| **Regulatory** | agencies, topics, indications, designation types | agency, kind (guidance / designation / adcom / decision / policy / consultation), title, date, status, deadline, programs_affected, summary | agency + title + date | guidance, designation, adcom, regulatory_decision, policy, consultation_open | New guidances and designations; consultation deadlines |

**Literature Radar 2.0.0:** it keeps the existing Literature Radar intent (topics, reading queue, synthesis) on the kit. The existing synthesis feature becomes a "Synthesis note" per scope in Setup.

---

## 4. Connections (by role, any install order)

| App | Reads | What the user gets |
|---|---|---|
| **Programs (02)** | Pipeline, Trial, Regulatory events | Competitor and regulatory context next to milestones |
| **Partnerships (07)** | Pipeline events, `dealradar.deals` | Partner pipelines and comparable deals in BD |
| **Fundraise (03)** | `fundingradar.financings` | Comparable rounds and active investors |
| **Investor Updates (06)** | Any radar's events (draft source) | Sourced "landscape" section |
| **Deal Comps (18), later** | `dealradar.deals`, `fundingradar.financings` | Comparables |

Readers use the in-app integration pattern ("Use data from Trial Radar"). Each feature hides itself when the radar isn't installed. Radars never write another app's own tables.

---

## 5. Package checklist and acceptance criteria

**Kit package:**
- `templates/source/radar-kit/` with screens, common tables, the brief builder, research-template editor with versions, source report, digest and alert email templates, and recommended-automations declarations
- a generator that builds each radar's immutable `templates/apps/life.<radar>-<version>.json` from the kit plus the radar definition
- `radar.v1` registry entries for every output

**Per radar:** definition (scope fields, tracker fields, natural key, event kinds, standard sources, default research template, digest section, cadence), `catalog.metadata.json` with `whenToUse` and `whenNotToUse`, fictional `demo_data.json`, build `--check` and browser test.

**Acceptance (kit, tested with Trial Radar first, then each radar):**
1. **Install:** the install dialog shows the radar's 2 recommendations, both on. They're created and linked to the app on the chosen runner; with no runner, they're created switched off with the note.
2. **Scope and build:** creating a scope prefills definition fields and sources. "Build now" in chat returns tracker and event proposals with sources and a source report. Unsourced proposals can't be confirmed.
3. **Scheduled scan:** it uses the refresh brief for all active scopes, records the run (with research template version and source report), and sends the digest within the word limit, and only if there's something to report. With no active scope, it does nothing.
4. **Alert:** one email per run, only for watched high-impact events, within email limits.
5. **Edit the research template:** a user edit is used by the next run; the version is recorded; "Restore default" works; required rules can't be removed.
6. **Edit the tracker:** a new custom field appears in the table and in the brief's return format; hiding a field hides it in the table only.
7. **Unreachable source** is reported and the run continues on the web; after 3 runs a hint appears.
8. **Estimates** show "est." in the tracker, calendar and emails.
9. **Outputs:** confirmed rows are readable by the connected apps; proposed and dismissed ones are not.
10. **Assistants** propose only.
11. **Modularity and archiving:** the modularity test (rule 9) and archive-first checks pass; archive pauses linked automations.
12. **Performance:** 5,000 events and 2,000 tracker rows stay responsive (paged).
13. **Layout:** desktop 1440 and mobile 390.

**Trial Radar extra:** TrialAgents Intel is the first named source for EU trials. A run where Intel is reachable records EU CT numbers; when it isn't, the source report says so and the run uses ClinicalTrials.gov and the web.

**Open for design partners:** default cadences per radar; which radars to show first in the catalog; impact wording.
