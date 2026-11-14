# Bio Radars — final scope for the radar family (BT2-10)

*Eight small apps that watch your field. Install only the radars you need; each comes with its tracker, a research template for Claude or ChatGPT, and its automation switched on.*

**Status:** Final scope for build, 14 November 2026; revised the same day against the shipped automation platform ([#168](https://github.com/tarous89/trialy/pull/168), [#169](https://github.com/tarous89/trialy/pull/169)), see §6. Part of [Biotech apps v2](../BIOTECH_v2.md) (rank 10, TrialAgents edge). It replaces the earlier Landscape and single-app Bio Radar scopes. No existing users.

**The family:**
- Pipeline Radar
- Trial Radar
- Literature Radar (next major version of the existing template)
- Patent Radar
- Market Radar
- Deal Radar
- Funding Radar
- Regulatory Radar

**Depends on:** [app automations at install](../../RECOMMENDED_AUTOMATIONS.md) with E1–E4, shipped in #168 (recipes, install popup, summary and brief bindings, `after` email) and #169 (research saves results in the app database under grants approved with the install). The contract is `src/automations/recipes-schema.ts`; template guidance 1.3.27+. Offers appear only where `APP_AUTOMATION_RECIPES_ENABLED=true`; radar tests run with it on. Also uses platform additions E5 (research + email in one automation) and E6 (fields resolved at run time), §6, built in their own platform PR. Build order:
1. **Radar kit + Trial Radar** (one PR; our edge with TrialAgents Intel)
2. Pipeline, Literature, Deal and Funding Radar
3. Patent, Market and Regulatory Radar

Each radar after the first is a small PR on the kit.

**Governing contracts:** project context, template authoring and usage guidance (latest, all `nextOffset`s), shared build contract, interface rules, access control, write authorization, field capabilities, shared data, [modular apps and shared data](../../MODULAR_APPS_AND_SHARED_DATA.md), [apps, access and automations](../../APP_CONFIGURATION_AND_AUTOMATIONS.md) (including email limits), the [recommended automations scope](../../RECOMMENDED_AUTOMATIONS.md), and the contract registry. They win on any conflict.

**Decisions (14 Nov 2026):**
- **Separate apps.** Users install only what they need. Each radar is small (4 screens) and versioned on its own.
- **Automation on by default.** Each radar recommends a **scan + digest** (one automation: Claude or ChatGPT research, then email) and a **high-impact alert** after the scan (§2.4), both selected in the install popup. The owner can opt out there, or set them up later in Automations → From app features.
- **Users can edit everything.** The tracker (fields and layout) and the research template are editable by users and by their assistant. Defaults can always be restored.
- **The assistant does the searching.** Claude or ChatGPT searches and reads; the radar stores, structures and schedules, and tells the assistant what and when through a research brief. Sources are named, not connected: the assistant decides how to reach them (its own connector or the web), **web is the default**, and every run returns a source report.
- **Research updates the radar directly.** Each scan adds and updates tracker rows and events itself, with sources; there is no approval per run or per item. Users see what each run changed, can correct or dismiss anything, and every change keeps its history.
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
| 1 | **Overview** (`overview`) | (1) High-impact items from recent runs. (2) Coming dates in 90 days (estimates marked "est."). (3) What changed since the last run. (4) Last run and source report, with any gaps. |
| 2 | **Tracker** (`tracker`, label per radar: Assets / Trials / Publications / Patents / Products / Deals / Financings / Items) | (1) The radar's table, with filters, grouping, saved views and export. (2) Detail panel: fields with sources, history (which run changed what), "changed in last run". (3) Edit, mark seen or dismiss. (4) Watch an item. |
| 3 | **Events** (`events`) | (1) New since last run: events with source, date and the assistant's "so what"; mark reviewed, edit, or dismiss with a reason. (2) Feed with filters. (3) Calendar view of dated events. (4) Duplicates merged. |
| 4 | **Setup** (`setup`) | (1) **Scopes:** one or more per radar (e.g. one per program), each with its definition fields, named sources (name, covers, priority, notes) and watchlist. (2) **Research template:** the editable collection template (see 2.3), with version history and "Restore default". (3) **Tracker fields:** add, hide or rename fields (platform field customization); new fields are added to the research template's return format automatically. (4) Links to Automations (schedule, recipients, email text) and Access, plus "Build now" / "Refresh now" (on request in chat). |

### 2.2 Common data (`<radar>.*` prefix per app, e.g. `trialradar.*`)

| Table | Key fields (kind) |
|---|---|
| `<radar>.settings` (one row) | lookback_days (number, 90), impact_scale (text, JSON), research_template (text*, the workspace's current template), research_template_version (number), language (text) |
| `<radar>.scopes` | name (text*), program_id (text), definition (text*, JSON; fields per radar, §3), sources (text*, JSON: name, covers, priority, notes), watchlist (text, JSON), include_notes (text), exclude_notes (text), status (select*: active / paused), archived (boolean). `last_run_on` is derived (latest completed run covering the scope), not stored |
| `<radar>.<tracker>` | Radar-specific fields (§3), plus natural_key (text*), scope_id (text*), sources (text*, JSON), last_verified_on (date), last_changed_run_id (text), changed_fields (text, JSON: fields the last run changed), seen (boolean), watched (boolean), dismissed (boolean), user_notes (text) |
| `<radar>.events` (output) | scope_id (text*), program_id (text), organization_id (text), item_id (text), natural_key (text*), kind (select*: per radar, §3), title (text*), summary (text), occurred_on (date), expected (boolean), expected_window (text), impact (select*: high / medium / low / none), direction (select: threat / opportunity / neutral), so_what (text), sources (text*, JSON), run_id (text), status (select*: new / reviewed / dismissed; research writes `new`), dismiss_reason (text), reviewed_by (text) |
| `<radar>.runs` | run_id (text*, the platform run id), scope_ids (text*), kind (select*: build / refresh), run_on (date*), assistant (select: claude / chatgpt), automation_id (text), research_template_version (number), sources_report (text*, JSON per scope), items_added (number), items_updated (number), events_added (number), status (select*: completed / partial / failed) |

**Who writes what.** Scans and chat research runs write the radar directly, with no approval per run or item: they create and update tracker rows and events (always with sources), set `changed_fields` and `last_changed_run_id` on the rows they change, and save one runs row per run. They never delete rows and leave user-owned fields alone: `seen`, `watched`, `dismissed`, `user_notes`, an event's `status` once it's `reviewed` or `dismissed`, `dismiss_reason` and `reviewed_by`. A dismissed item is not recreated: the natural key matches it, and the run only adds sources. The platform's per-field history shows every change by run, so a user can see and revert anything.

**Shared roles:** `programs` (core.v1, optional, read), `organizations` (core.v1, read/write; companies, investors, agencies).

**Outputs:** each radar writes its own events output in one common contract, `radar.v1`: `pipelineradar.events`, `trialradar.events`, `literatureradar.events`, `patentradar.events`, `marketradar.events`, `dealradar.events`, `fundingradar.events`, `regulatoryradar.events`. Deal Radar and Funding Radar also output their trackers as `dealradar.deals` and `fundingradar.financings`. This keeps one writer per output. Rows that are not dismissed are readable by other apps; dismissed rows are not.

### 2.3 Research template and brief

Every radar ships a **default research template**: an instruction plus a structured return format. Users can edit it in Setup, or ask their assistant to (a normal reviewed app change, not research). It's stored in `<radar>.settings` (record data, so editing it never needs automation re-approval). It's versioned; "Restore default" brings back the template's version, and each run records which version it used.

At run time the radar builds a **brief**: research template + each active scope's definition, sources, watchlist, exclusions + `last_run_on` + the tracker's current fields, including custom ones + the natural keys of items and events already in the radar, including dismissed ones (so the assistant updates instead of duplicating). The brief is the app's read-only execution binding `brief`, declared as the scan's `research.briefBinding`. It returns `{context}` of at most 64,000 characters, pages the key lists past that budget (the assistant reads the rest through its read bindings), and reads only the scan's declared read fields. Automations call it through `read_app_monitor_brief`; on-request chat runs call the same binding, so both use the same brief.

The automation's fixed `objective`, `instructions` and `sourcePolicy` only say: read the brief, follow its research template, save tracker rows, events and the runs row, and finish with typed `findings`. Everything a user can edit lives in the brief, so editing the template or scopes never changes the approved automation.

**Rules in every default template (users may add rules but not remove these):**
- every fact needs a source URL or reference and a date
- mark estimates as estimates
- summarise paid content, don't copy it
- don't guess missing values
- respect exclusions
- give no legal, investment or medical advice
- reach each named source however you can (connector if available, otherwise the web); report sources you can't reach and continue
- return a **source report**

### 2.4 Recommended automations (per radar, both selected)

Two `recommendedAutomations` (well under the limit of 10), both selected in the install popup.

| Key | Name | Trigger | Steps |
|---|---|---|---|
| `scan` | {Radar} scan + digest | `calendar` at the radar's cadence (§1), 07:00 workspace time zone: weekly on Monday; monthly with `monthRule: {kind: "weekday", nth: 1, weekday: 1}` (first Monday) | **1. Research** on the chosen runner (Claude or ChatGPT): `briefBinding: "brief"`; reads settings, scopes, tracker, events and runs; writes tracker and events (create and update, except the user-owned fields in §2.2) and runs (create). **2. Email:** `summaryBinding: "digest_summary"` writes §2.5 from the run's rows; `nonEmpty: false` when the run changed nothing, so nothing is sent |
| `alert` | {Radar} high-impact alert | `{kind: "after", recipe: "scan", when: "meaningful"}` | **Email:** `summaryBinding: "alert_summary"` returns `nonEmpty: true` only if the run added or changed a high-impact event on a watched item; all such events go in one email per run |

- **One automation, two steps.** The scan and its digest are one row in the install popup and one automation in Automations, shown with both connectors (Claude/ChatGPT and Email). They pause, edit and delete together. Internally the email still runs only after the research has saved, and a failed email never reruns the research (platform addition **E5**, §6).
- **Install popup.** One Add app approves the app, its tables and access, both automations and the scan's write access. The popup states it in plain language: "Updates {items} and events in {Radar} from each scan. Doesn't delete rows or change your notes, watches or dismissals." Recipients default to the owner (`editableAtInstall`: cadence, day, time, recipients).
- **No runner.** With no ready Claude or ChatGPT runner, the scan shows **Needs setup** ("Connect Claude or ChatGPT to activate research") and the alert waits on it. Connecting a runner later offers **Enable**; it never switches on by itself.
- **Opt-outs.** Opting out of the scan leaves the alert waiting, never active on its own. The owner can set either up later from Automations → From app features.
- **Empty runs.** With no active scope, the brief says so; the scan saves its runs row and finishes `no_update`, so no email is sent. A run that changes nothing still saves its runs row; the digest summary then returns `nonEmpty: false`.
- **Run status.** Partial, failed and test runs never send the digest or alert. An unreachable named source with a successful fallback is still a `completed` platform run; the source report records the gap (§2.6).

### 2.5 Email templates (summary functions, editable)

The digest and alert are written by the read-only summary bindings `digest_summary` and `alert_summary` (E1). They get the run (`run.recordIds`, `run_id`) and return `{nonEmpty, subject, text}`. Wording lives in the kit, with the radar's section from §3. Each recipient's access is rechecked at send time, and the platform's email limits apply. The recipe's own `subject` and `text` are the fallback shown in Automations.

All emails follow the same rules: about 200 words maximum, empty sections omitted, every item linked into the app.

**Digest:**
> **Subject:** {Radar} · {date}: {n_high} high-impact · {n_new} new · {n_dates} dates in 90 days
>
> **Bottom line:** one or two sentences on what changed for your programs.
> **High impact** (max 3): {item}: {what happened} → *for us:* {so what} · [source]
> **{Radar section}** (max 3; §3)
> **Coming up (90 days):** dated items, with estimates marked "est."
> **Coverage:** sources used · not reachable (only if any)
> Open {n} new items →

**Alert:**
> **Subject:** {Radar} alert · {item}: {headline}
>
> **What happened:** one sentence with date and source.
> **Why it matters for {program}:** one or two sentences.
> **Check next:** one or two concrete follow-ups.
> Open in {Radar} →

### 2.6 Common rules

- **Estimates** (registry completion dates, expected decision dates, patent expiry estimates) show "est." everywhere.
- **Duplicates** with the same natural key (§3) are merged and their sources combined.
- **Changed in last run:** fields a run changed (`changed_fields`) are highlighted until the user marks the row seen; the detail panel shows old value, new value, run and source.
- **No unsourced data:** `sources` is required, so a run can't save a row or event without one.
- **Source report:** each named source is used / not reachable / not relevant per scope and run. A source not reachable in 3 consecutive runs shows a hint on Overview.
- **Cross-radar review** (on request: "review all radars for Program X"): the assistant reads the events outputs of every installed radar it can access and writes a report document. No app or automation is needed.

### 2.7 Access and AI

- App-level access as usual; radar data is internal.
- Claude and ChatGPT read briefs and the records the user can read.
- **Research writes directly.** Scheduled scans write under the access approved at install (§2.4), with no approval per run. A "Build now" or "Refresh now" in chat writes the same way under that same access, using the same brief.
- **Everything else stays reviewed.** Research-template edits, scope changes, tracker field changes and other edits from an assistant are normal reviewed app changes. Research never touches user-owned fields (§2.2).
- Automations follow platform rules. The app creates, enables and schedules none itself; Setup only links to Automations.

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
- `templates/source/radar-kit/` with screens, common tables, the `brief` binding, the `digest_summary` and `alert_summary` bindings, research-template editor with versions, source report, and the two recommended-automation recipes (§2.4) validated by `validateRecipeDeclarations`
- a generator that builds each radar's immutable `templates/apps/life.<radar>-<version>.json` from the kit plus the radar definition
- `radar.v1` registry entries for every output

**Per radar:** definition (scope fields, tracker fields, natural key, event kinds, standard sources, default research template, digest section, cadence), `catalog.metadata.json` with `whenToUse` and `whenNotToUse`, fictional `demo_data.json`, build `--check` and browser test.

**Acceptance (kit, tested with Trial Radar first, then each radar):**
1. **Install:** the install popup shows the radar's 2 recommendations (scan + digest, alert), both selected, with the plain-language write summary. Add app creates them linked to the app on the chosen runner, with the scan's write access. Scan + digest is one automation with both connectors. With no runner the scan shows Needs setup and the alert waits. Opting out of the scan leaves the alert waiting.
2. **Scope and build:** creating a scope prefills definition fields and sources. "Build now" in chat fills the tracker and events directly, with sources, and saves a runs row with the source report. A row without sources can't be saved.
3. **Scheduled scan + digest:** one automation; it uses the refresh brief for all active scopes, records the run (with research template version and source report), and sends the digest within the word limit, and only if there's something to report. With no active scope, it does nothing.
4. **Alert:** one email per run, only for watched high-impact events, within email limits; none for partial, failed or test runs.
5. **Edit the research template:** a user edit is used by the next run; the version is recorded; "Restore default" works; required rules can't be removed.
6. **Edit the tracker:** a new custom field appears in the table and in the brief's return format, and the next scan fills it without re-approval (E6); hiding a field hides it in the table only. Removing a field makes the next scan skip it without failing.
7. **Unreachable source** is reported and the run continues on the web; after 3 runs a hint appears.
8. **Estimates** show "est." in the tracker, calendar and emails.
9. **Outputs:** rows that are not dismissed are readable by connected apps; dismissed ones are not.
10. **Direct writes, kept in bounds:** a scan creates and updates rows and events with no per-run approval; its attempts to delete rows or change user-owned fields are refused by its access; a dismissed item is not recreated; every change shows in field history with its run. Template, scope and field edits from an assistant stay reviewed.
11. **Modularity and archiving:** the modularity test (rule 9) and archive-first checks pass; archive pauses linked automations.
12. **Performance:** 5,000 events and 2,000 tracker rows stay responsive (paged).
13. **Layout:** desktop 1440 and mobile 390.

**Trial Radar extra:** TrialAgents Intel is the first named source for EU trials. A run where Intel is reachable records EU CT numbers; when it isn't, the source report says so and the run uses ClinicalTrials.gov and the web.

**Open for design partners:** default cadences per radar; which radars to show first in the catalog; impact wording.

---

## 6. Platform fit and the platform additions this needs

The kit is built on the shipped platform (#168 recipes, install popup, summary and brief bindings, `after` email; #169 research saves in the app database under access approved with the install). Two small additions, E5 and E6, are built in their own platform PR before the radar kit (see [recommended automations §7](../../RECOMMENDED_AUTOMATIONS.md)). The kit declares the scan's read and write bindings with `fields: "all"` and `exceptFields` listing the user-owned fields in §2.2.

| # | Addition | Why | Shape |
|---|---|---|---|
| **E5** | **Research + email in one automation** | Scan + digest should be one automation with two connectors (Claude/ChatGPT, then Email), not two linked ones | A recipe (and an automation) may have a `research` step followed by an `email` step. It shows as one row in the install popup and one automation in Automations, with both connectors, and pauses, edits and deletes as one. Internally it reuses the E3 machinery: the email runs only after a completed, saved research run, once per run; a failed email never reruns research; partial, failed and test runs send nothing. Same email limits and recipient checks. Separate `after` recipes (like `alert`) stay supported |
| **E6** | **Work with the fields that exist at run time** | Adding, renaming or hiding a tracker field shouldn't stop the scan or need re-approval | Approve research access **per table, not per field list**: "this app's tables X, Y, all fields the assistant may write, except Z" (`fields: "all"` plus `exceptFields`). At each run, the platform resolves the current writable fields of those tables: new fields are included, removed fields are skipped, calculated and read-only fields and the excepted fields are never writable. The approval's stamp covers the tables, the app binding and access settings, not the field list. So field edits keep the automation running, while moving a table out of the app, changing access or the assistant's rights still needs review. The brief and read bindings resolve the same way |

**What's unchanged.** Writes stay within the app's own tables and the user's current access; the grant expires and can be revoked; every write has a receipt and field history; a field the user marks "assistant can't write" is never written. Template, scope and field edits by an assistant remain reviewed app changes.

**Changes from the first version of this scope:** research updates the radar directly, so there is no proposed / confirmed queue; scan + digest is one automation (E5); custom fields work without re-approval (E6); there's no `defaultOn` field, since every install recommendation starts selected; the digest and alert are read-only summary bindings; the brief is a read-only binding; `last_run_on` is worked out from the runs table; and with no runner the scan shows Needs setup.
