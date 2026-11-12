# Biotech company apps — use cases and reference apps (v2)

**Status:** Proposed shortlist, 10 November 2026. Supersedes [BIOTECH_v1.md](BIOTECH_v1.md) (BT-01…BT-06) as the planning list for biotech templates. It is a planning document, not the live catalog: package QA and database approval state still decide availability. All rules in the [shared design and build contract](DESIGN_AND_BUILD_CONTRACT.md) and the [blueprint README boundaries](README.md#boundaries--must-pass-before-marketing-an-app-as-functional) apply unchanged (no patient data, no mandatory external system, governed writes, no regulated-platform claims, never clone a benchmark).

**Audience:** small biotech companies (up to ~50 employees), specifically executives (CEO/CFO/CSO/CMO), project and program management, clinical operations, business development and scientific leaders.

## How this list was built

1. **Ranked by need.** Rank = how many small biotechs have the need × how often the team works in it. Most companies of this size are preclinical, so universal needs (cash, programs, fundraising, contracts, outsourcing) rank above clinical-stage needs.
2. **Target the spreadsheet layer.** These apps do not replace Microsoft 365/Google, Slack, Carta, the accounting system, Benchling or DocuSign. They replace the Excel trackers that sit between those systems, up to the point where a company buys an enterprise system (e.g. a CTMS).
3. **Small, single-purpose apps.** Multi-module products were split into simpler apps (e.g. investor pipeline vs investor updates, data room index vs due-diligence Q&A). Users can ask the assistant to merge apps, and records are shared by default, so splitting costs little.
4. **One primary reference app each,** chosen as the best-known workflow for that job in life sciences or startups. References describe proven workflows only; no UI, copy, code, data or branding is reused.

## Build status (12 November 2026)

| App | Scope | Build |
|---|---|---|
| 01 Runway | [apps/RUNWAY.md](apps/RUNWAY.md) | `life.cash-runway` 2.1.0 published (#131) |
| 02 Programs | [apps/PROGRAMS.md](apps/PROGRAMS.md) | `life.project-oversight` 2.1.0 published (#136), with manual cash forecast and Runway integration |
| 03 Fundraise | [apps/FUNDRAISE.md](apps/FUNDRAISE.md) | Scoped; build next |
| 08 Data Room | to scope | Build right after Fundraise (writer of the `dataroom.v1` roles Fundraise reads) |
| 04 Contracts | [apps/CONTRACTS.md](apps/CONTRACTS.md) | Scoped |
| 05 CRO Bids | [apps/CRO_BIDS.md](apps/CRO_BIDS.md) | Scoped; needs platform [External exchange](../EXTERNAL_EXCHANGE.md) first |

All apps follow [modular apps and shared data](../MODULAR_APPS_AND_SHARED_DATA.md): core contract v1 roles, the add-app dialog (Connect / Create new per table, access), and **in-app integrations** — an app keeps its own table for data another app can provide, offers one subtle "Add <app>" / "Use its data" line, and reads the provider read-only once the user chooses it. There is no "not connected" state. Contracts for every output role are in `templates/contracts/outputs.json` (readable via `read_app_template_guidance(resource:"contracts")`).

## The list (20 use cases)

| Rank | ID | App | What it does | Main users | Reference app | Tier | v1 source |
|---:|---|---|---|---|---|---|---|
| 1 | BT2-01 | **Runway** | Cash, burn and runway by program, with what-if scenarios. | CEO, CFO, board | Abacum Life Sciences (domain) + Jirav (mechanics) | Core | replaces `cash-runway` |
| 2 | BT2-02 | **Programs** | Milestones, dependencies, risks and decisions across all programs. | CEO, PM, functional leads | Smartsheet (+ life-science PPM concepts: OnePlan, Planisware) | Core | replaces `project-oversight` |
| 3 | BT2-03 | **Fundraise** | Investor pipeline for a round, from first contact to signed commitment. | CEO, CFO | Foundersuite (+ Visible for engagement) | Core | replaces `investor-crm` |
| 4 | BT2-04 | **Contracts** | Register of CDAs, MSAs, SOWs and other agreements with key dates and obligations. | CEO, BD, ClinOps, finance | ContractSafe/ContractWorks (size) + Gatekeeper/Contract Logix (biotech) + Ironclad (AI extraction) | Core | **new** |
| 5 | BT2-05 | **CRO Bids** | Collect, compare and score outsourcing bids, then record the award. | ClinOps, R&D leads | Scientist.com (+ Science Exchange; ClinAI / bid-grid practice) | Core | merge `cro-selection` + `sponsor-rfp-management` |
| 6 | BT2-06 | **Investor Updates** | Regular updates, KPI history and a cap-table summary for existing investors. | CEO, CFO | Visible | Core | **new** (split from Investor CRM) |
| 7 | BT2-07 | **BD Pipeline** | Partnering targets, conference meetings and licensing deals by stage. | CEO, BD | Inova Partnering (Inpart) | Core | adapt `partnership-tracker` |
| 8 | BT2-08 | **Data Room** | Data room index, readiness gaps and who has access to which version. | CEO, CFO, BD | ShareVault | Core | **new** |
| 9 | BT2-09 | **Lab Inventory** | Reagents and consumables, requests and reorders. | Lab managers, scientists | Quartzy | Core | adapt `inventory-management` |
| 10 | BT2-10 | **Landscape** | Competitor assets, trials, readouts and deals in your indications. | CEO, BD, CSO/CMO | Citeline Biomedtracker (alt. Evaluate) | Core · **TrialAgents edge** | **new** (absorbs `literature-radar` intent) |
| 11 | BT2-11 | **Trial Finance** | Clinical budgets vs invoices and monthly accrual estimates. | CFO, ClinOps | Condor | Extended | **new** |
| 12 | BT2-12 | **Diligence Q&A** | Incoming diligence questions, approved answers and what was disclosed to whom. | CEO, CFO, BD | Ansarada (Q&A workflow) | Extended | **new** (split from data room) |
| 13 | BT2-13 | **Lab Records** | Experiments, protocols and results linked to programs and outsourced studies. | CSO, scientists | Benchling | Extended | adapt `experiment-notebook` |
| 14 | BT2-14 | **Board** | Board meetings, packs, resolutions and action items. | CEO, company secretary | Diligent Boards | Extended | **new** |
| 15 | BT2-15 | **IP Portfolio** | Patent families, deadlines, costs and freedom-to-operate actions. | CEO, CSO, IP counsel | Anaqua | Extended | **new** |
| 16 | BT2-16 | **CRO Oversight** | Vendor deliverables, KPIs, issues and governance during studies. | ClinOps, PM | Veeva Vault CTMS | Clinical-stage | adapt `cro-oversight` |
| 17 | BT2-17 | **Site Finder** | Shortlist sites and investigators from trial history and track feasibility. | ClinOps, CMO | Veeva Study Startup + Citeline Sitetrove | Clinical-stage · **TrialAgents edge** | merge `co-site-feasibility` + `investigator-crm` |
| 18 | BT2-18 | **Deal Comps** | Comparable deals and valuation assumptions for negotiations. | CEO, BD, CFO | DealForma | Extended | **new** |
| 19 | BT2-19 | **Grants** | Non-dilutive funding calls, applications, awards and reporting. | CEO, CFO, CSO | Instrumentl | Extended | adapt `grant-pipeline` (EU sources) |
| 20 | BT2-20 | **Regulatory** | Agency meetings, feedback, designations and commitments. | CMO, regulatory lead | Veeva Vault RIM | Clinical-stage | reshape `trial-regulatory-submission` |

**Tiers.** *Core* (1–10): needed by nearly every small biotech; build first. *Extended* (11–15, 18–19): common and valuable, often tied to a fundraising or licensing event. *Clinical-stage* (16, 17, 20): only once a program enters the clinic.

**TrialAgents edge.** BT2-10 and BT2-17 can open pre-filled with TrialAgents Intel trial, sponsor, site and investigator data, which no spreadsheet can do. Rank reflects breadth of need, not strategic value: consider launching these two early as the differentiating hook alongside the Core finance and program apps.

### Connected packs

The apps are separate, but several share records and form natural packs (all over the shared Organization / Person / Program records):

- **Finance pack:** Runway (01) ← Trial Finance (11) → Investor Updates (06) → Board (14). Accruals feed the runway; the runway feeds updates and board packs.
- **Deal pack** (fundraising *and* licensing follow the same path: targets → outreach → CDA → non-confidential deck → data room → diligence → term sheet): Fundraise (03), BD Pipeline (07), Contracts (04), Data Room (08), Diligence Q&A (12), Deal Comps (18).
- **Outsourcing pack:** CRO Bids (05) → Contracts (04) → CRO Oversight (16) → Trial Finance (11).
- **Clinical pack:** Landscape (10), Site Finder (17), Regulatory (20), CRO Oversight (16).
- **Science pack:** Lab Records (13), Lab Inventory (09), IP Portfolio (15).

### Shared record types (shared by default)

All apps follow [modular apps and shared data](../MODULAR_APPS_AND_SHARED_DATA.md): core shared tables use the core data contract, apps reuse rather than copy, data from other apps comes through in-app integrations (own table first, read-only once linked), and archiving an app or tab never deletes data.


Organization (investor, partner, CRO, vendor, site, competitor, funder) · Person (professional contacts only) · Program/Asset (indication, modality, stage) · Study · Contract reference · Document reference (title, version, location link — files stay in the customer's storage) · Task · Source/finding. Each app keeps its own private records (e.g. rounds, bids, accrual lines) and links to the shared ones by stable ID.

---

## App briefs

Format per app: users and job · reference app · scope (in / out) · records · screens · assistant and data angle. Screen recipes follow the v1 conventions in [BIOTECH_v1.md](BIOTECH_v1.md) and the [build contract](DESIGN_AND_BUILD_CONTRACT.md).

### BT2-01 — Runway (rank 1, Core)
*Cash, burn and runway by program, with what-if scenarios.*  
*Long name: Cash Runway & Scenarios*
- **Users / job:** CEO and CFO see cash, monthly burn and runway, and test what-if scenarios (delay a study, add hires, close a round) before board meetings.
- **Reference apps:** Abacum Life Sciences (domain: program spend, runway to milestones) and Jirav (mechanics: plan of record, forecasts, scenarios).
- **In scope:** cash balance snapshots, burn by program and category, headcount plan lines, scenario assumptions, runway months per scenario. **Out:** general ledger, payroll, bank feeds, tax, cap table.
- **Records:** Cash snapshot; Budget line (program, category, month, amount, currency); Headcount plan line; Scenario; Assumption. Shared: Program, Study.
- **Screens:** Runway overview · Burn by program · Scenario builder · Headcount plan · Assumptions log.
- **Assistant angle:** explain runway changes month over month; draft the runway section of investor updates (06); pull accrual estimates from 11 when present. Multi-currency with automatic rates (see detailed scope).
- **Detailed scope:** research in [First app in detail: Runway](#first-app-in-detail-runway-bt2-01) below; final build scope in [apps/RUNWAY.md](apps/RUNWAY.md).

### BT2-02 — Programs (rank 2, Core)
*Milestones, dependencies, risks and decisions across all programs.*  
*Long name: Program & Milestone Oversight*
- **Users / job:** leadership and PM see every program's milestones, dependencies, risks and decisions in one board-ready view.
- **Reference app:** Smartsheet — milestone views, dependencies, risk and action reporting.
- **In scope:** programs, milestones (planned vs forecast vs actual), dependencies, risks, decisions, actions. **Out:** resource scheduling, timesheets, portfolio valuation.
- **Records:** Milestone; Dependency; Risk (likelihood, impact, owner, mitigation); Decision; Action. Shared: Program, Study, Organization.
- **Screens:** Portfolio overview · Program timeline · Risk register · Decision & action log · Status report.
- **Assistant angle:** draft monthly status and board slides from the records; flag slipped milestones and overdue actions.
- **Detailed scope:** final build scope in [apps/PROGRAMS.md](apps/PROGRAMS.md).

### BT2-03 — Fundraise (rank 3, Core)
*Investor pipeline for a round, from first contact to signed commitment.*  
*Long name: Investor Pipeline*
- **Users / job:** run a financing round: target investors, track outreach and diligence, and separate verbal interest from signed commitments.
- **Reference app:** Foundersuite — investor CRM and fundraising pipeline.
- **In scope:** rounds, investors, contacts, opportunities by stage, interactions, next steps, commitments (signed vs verbal). **Out:** sending email, investor databases, subscription documents, cap table.
- **Records:** Round; Investor opportunity; Interaction; Commitment. Shared: Organization (fund), Person.
- **Screens:** Round overview · Investor directory · Pipeline board · Interaction log · Commitments.
- **Assistant angle:** research fund fit and recent investments in the assistant; prepare meeting briefs. Reuse the v1 `investor-crm` data contract and commitment-counting rules.
- **Detailed scope:** final build scope in [apps/FUNDRAISE.md](apps/FUNDRAISE.md). Connects to Data Room (08) by the `dataroom.v1` roles in any install order; build Data Room next.

### BT2-04 — Contracts (rank 4, Core)
*Register of CDAs, MSAs, SOWs and other agreements with key dates and obligations.*  
*Long name: Contract & Agreement Register*
- **Users / job:** one register of every CDA, MSA, SOW/work order, change order, MTA, consulting and licence agreement, with renewals, expiries and obligations.
- **Reference app:** Ironclad — contract repository, key dates and obligations (workflow reference only).
- **In scope:** agreement metadata, counterparty, type, status, effective/expiry dates, value and currency, parent/child links (MSA → SOW → change order), obligations and reminders, document link. **Out:** e-signature, clause authoring, legal advice, hosting signed originals.
- **Records:** Agreement; Amendment/change order; Obligation; Key date. Shared: Organization, Person, Program, Study, Document reference.
- **Screens:** Expiries & obligations overview · Agreement register · Agreement detail (hierarchy) · Obligations tracker · CDA tracker.
- **Assistant angle:** extract key dates and obligations from a contract the user provides, as a reviewed proposal; remind before expiry. Every other pack links here.
- **Detailed scope:** final build scope in [apps/CONTRACTS.md](apps/CONTRACTS.md).

### BT2-05 — CRO Bids (rank 5, Core)
*Collect, compare and score outsourcing bids, then record the award.*  
*Long name: CRO Sourcing & Bid Comparison*
- **Users / job:** define an outsourcing need (preclinical study, CMC, clinical), collect bids, compare them on a common grid and record the award decision.
- **Reference app:** Science Exchange / Scientist.com — life-science R&D outsourcing, sourcing and bid comparison. (Replaces v1 Bonfire, which is public-sector procurement.)
- **In scope:** sourcing request, vendor longlist, bid lines normalised to a common structure, weighted scoring, award decision and rationale. **Out:** purchasing, payment, vendor qualification audits.
- **Records:** Sourcing request; Bid; Bid line; Score; Award decision. Shared: Organization (vendor), Program, Study.
- **Screens:** Requests overview · Vendor longlist · Bid comparison grid · Weighted scoring · Decision record.
- **Assistant angle:** compare bid documents line by line and flag missing items; on award, offer to create the agreement in 04 and the vendor in 16.
- **Detailed scope:** final build scope in [apps/CRO_BIDS.md](apps/CRO_BIDS.md); suppliers respond through the platform [External exchange](../EXTERNAL_EXCHANGE.md).

### BT2-06 — Investor Updates (rank 6, Core)
*Regular updates and KPI history for existing investors.*  
*Long name: Investor Updates & Reporting*
- **Users / job:** send consistent monthly or quarterly updates to existing investors and keep the KPI history behind them.
- **Reference app:** Visible — investor updates and KPI reporting.
- **In scope:** update drafts and issued versions, KPI series, highlights/lowlights, asks, recipient list (names only). **Out:** sending email from the app (manual send or a separately approved TrialAgents email action), investor portals.
- **Records:** Update; KPI; KPI value; Recipient group. Shared: Organization, Person, Program.
- **Screens:** Updates archive · Update editor · KPI history · Recipients.
- **Assistant angle:** draft the update from 01, 02 and 03 records; keep wording consistent quarter to quarter.

### BT2-07 — BD Pipeline (rank 7, Core)
*Partnering targets, conference meetings and licensing deals by stage.*  
*Long name: BD & Partnering CRM*
- **Users / job:** manage out- and in-licensing targets, academic collaborations and conference meetings from first contact to term sheet.
- **Reference app:** Inova Partnering (Inpart) — life-science partnering pipeline and partnering meetings.
- **In scope:** partner companies and contacts, opportunities by stage, conference meetings (e.g. BIO, BIO-Europe), CDA status (linked to 04), non-confidential materials sent, follow-ups. **Out:** deal rooms (see 08), contract drafting.
- **Records:** Partnering opportunity; Meeting; Material sent; Follow-up. Shared: Organization, Person, Program/Asset, Agreement.
- **Screens:** BD overview · Partner directory · Opportunity pipeline · Conference meetings · Follow-ups.
- **Assistant angle:** research partner pipelines and deal history; prepare one-page meeting briefs before conferences.

### BT2-08 — Data Room (rank 8, Core)
*Data room index, readiness gaps and who has access to which version.*  
*Long name: Data Room Index & Readiness*
- **Users / job:** prepare and run a data room for a round or licensing deal: what must be in it, what is missing, which version was shared with whom.
- **Reference app:** ShareVault — life-science virtual data room for fundraising, licensing and M&A.
- **In scope:** room index (standard folder structure for financing and licensing rooms), required-document checklist with readiness status, document references and versions, access list per party, change log. **Out (v2):** hosting files for external parties, watermarking, view tracking. Files stay in Drive/SharePoint/Box; hosting is a separate later decision because it is a security product.
- **Records:** Data room; Room section; Required item; Document reference; Access grant (party, scope, dates). Shared: Organization, Person, Program, Agreement (CDA must exist before access).
- **Screens:** Readiness overview · Room index · Missing items · Access list · Change log.
- **Assistant angle:** check readiness against a standard financing or licensing checklist; summarise what changed since a party last had access.

### BT2-09 — Lab Inventory (rank 9, Core)
*Reagents and consumables, requests and reorders.*  
*Long name: Lab Inventory & Ordering*
- **Users / job:** track reagents and consumables, handle requests and reorder before items run out.
- **Reference app:** Quartzy — lab inventory, requests and reordering.
- **In scope:** items, locations, lots and expiry, stock levels, requests, approvals, orders, reorder points. **Out:** supplier punch-out, purchasing systems, human biospecimens.
- **Records:** Item; Stock lot; Location; Request; Order. Shared: Organization (supplier), Program.
- **Screens:** Stock overview · Inventory · Requests & approvals · Orders · Expiring & low stock.
- **Assistant angle:** suggest reorders; summarise spend by program for 01.

### BT2-10 — Landscape (rank 10, Core · TrialAgents edge)
*Competitor assets, trials, readouts and deals in your indications.*  
*Long name: Competitive & Pipeline Landscape*
- **Users / job:** know which competitor assets target the same indication or mechanism, their trial status and upcoming readouts, and recent deals.
- **Reference app:** Citeline Biomedtracker (alternative: Evaluate) — competitor pipeline and event tracking.
- **In scope:** competitor assets, linked trials, stage, expected readouts, events (readouts, approvals, deals, financings), relevance notes; scientific publications as a finding type (absorbs v1 Literature Radar intent). **Out:** forecasts, market sizing, paid-database data.
- **Records:** Competitor asset; Event; Finding (source, date, relevance). Shared: Organization, Program (own asset for comparison), Study.
- **Screens:** Landscape overview (by indication / mechanism) · Competitor assets · Trial & readout calendar · Events feed · Watchlist & findings.
- **Assistant / data angle:** pre-fill trials and sponsors from TrialAgents Intel; scheduled research proposes new findings for human review.

### BT2-11 — Trial Finance (rank 11, Extended)
*Clinical budgets vs invoices and monthly accrual estimates.*  
*Long name: Clinical Trial Budget & Accruals*
- **Users / job:** compare CRO budgets with actual invoices and work done, and estimate monthly accruals without a spreadsheet maze.
- **Reference app:** Condor — clinical trial finance, accruals and CRO reconciliation.
- **In scope:** contracted budget by activity (linked to SOWs in 04), change orders, invoices, progress drivers (e.g. sites activated, patients enrolled — aggregate counts only), accrual estimates by month, budget vs actual. **Out:** accounting entries, ERP posting, audit sign-off, site or patient-level payments.
- **Records:** Budget line; Invoice; Progress driver; Accrual estimate. Shared: Study, Organization (CRO), Agreement.
- **Screens:** Study finance overview · Budget vs actual · Invoices · Accrual worksheet · Change orders.
- **Assistant angle:** check invoices against contract lines and flag mismatches; feed approved accruals into 01.

### BT2-12 — Diligence Q&A (rank 12, Extended)
*Incoming diligence questions, approved answers and what was disclosed to whom.*  
*Long name: Due Diligence Q&A Tracker*
- **Users / job:** handle incoming diligence questions from investors or partners: assign, answer, approve and track what was disclosed to whom.
- **Reference app:** Ansarada — data room Q&A workflow.
- **In scope:** question log per party, category, assignee, draft and approved answer, linked documents (08), status and due date. **Out:** sending answers externally from the app.
- **Records:** DD question; Answer; Disclosure record. Shared: Organization, Person, Document reference.
- **Screens:** Q&A overview · Question log · Answer review · Disclosure history.
- **Assistant angle:** draft answers from approved documents; spot repeated questions across parties and reuse approved answers.

### BT2-13 — Lab Records (rank 13, Extended)
*Experiments, protocols and results linked to programs and outsourced studies.*  
*Long name: Experiment & Study Records*
- **Users / job:** a lightweight record of experiments and preclinical studies for small or virtual biotechs: plans, protocols, results and linked samples.
- **Reference app:** Benchling — notebook, protocols and linked samples. (Replaces v1 eLabFTW, an academic tool.)
- **In scope:** experiments, protocols (versioned references), results summaries, linked inventory items (09) and outsourced studies (05/16). **Out:** sequence design, registry, instrument integration, GxP/21 CFR Part 11 claims.
- **Records:** Experiment; Protocol reference; Result; Sample link. Shared: Program, Organization (CRO for outsourced studies).
- **Screens:** Experiments overview · Experiment record · Protocols · Results by program.
- **Positioning note:** Benchling already sells to startups, so position this for teams that outsource most lab work and need an index of studies and results rather than a full notebook.

### BT2-14 — Board (rank 14, Extended)
*Board meetings, packs, resolutions and action items.*  
*Long name: Board & Governance*
- **Users / job:** prepare board meetings and keep resolutions, approvals and action items in one place.
- **Reference app:** Diligent Boards — board packs, minutes and actions.
- **In scope:** meetings, agenda, board-pack contents (document references), minutes references, resolutions and written consents (metadata), action items. **Out:** legally binding e-signature, statutory filings, cap table.
- **Records:** Board meeting; Agenda item; Resolution; Board action. Shared: Person, Document reference, Program.
- **Screens:** Governance overview · Meeting prep · Resolutions register · Actions.
- **Assistant angle:** assemble the board pack outline from 01, 02, 03 and 06.

### BT2-15 — IP Portfolio (rank 15, Extended)
*Patent families, deadlines, costs and freedom-to-operate actions.*  
*Long name: IP & Patent Portfolio*
- **Users / job:** an executive view of patent families, key deadlines, annuity costs and freedom-to-operate actions, alongside outside counsel's formal docketing.
- **Reference app:** Anaqua — IP portfolio and deadline management.
- **In scope:** patent families, applications per jurisdiction, status, priority/key dates, annuity estimates, inventors (professional), linked programs, FTO actions. **Out:** official docketing of record, legal opinions.
- **Records:** Patent family; Application; Deadline; FTO action. Shared: Program, Person, Organization (law firm).
- **Screens:** Portfolio overview · Families & jurisdictions · Deadlines · Costs · FTO actions.
- **Assistant angle:** summarise portfolio coverage per program for 08 and investor diligence.

### BT2-16 — CRO Oversight (rank 16, Clinical-stage)
*Vendor deliverables, KPIs, issues and governance during studies.*  
*Long name: CRO & Vendor Oversight*
- **Users / job:** sponsor-side oversight of CROs and key vendors during studies: deliverables, KPIs, issues and escalations.
- **Reference app:** Veeva Vault CTMS — sponsor oversight and monitoring KPI rollups (a small operational slice).
- **In scope:** vendor deliverables, study-level KPIs (aggregate), issues and escalations, governance meetings, performance reviews. **Out:** CTMS/eTMF replacement, patient-level data.
- **Records:** Deliverable; KPI value; Issue; Governance meeting. Shared: Study, Organization, Agreement.
- **Screens:** Oversight overview · Deliverables · KPIs · Issues & escalations · Governance log.
- **Assistant angle:** prepare governance meeting agendas and minutes drafts; reuse the v1 `cro-oversight` package.

### BT2-17 — Site Finder (rank 17, Clinical-stage · TrialAgents edge)
*Shortlist sites and investigators from trial history and track feasibility.*  
*Long name: Site & Investigator Shortlist*
- **Users / job:** build a site and investigator shortlist for a study from real trial history, then track feasibility outreach and relationships.
- **Reference apps:** Veeva Study Startup (feasibility workflow) + Citeline Sitetrove (site/investigator intelligence).
- **In scope:** candidate sites and PIs with trial history, scoring, feasibility questionnaire status, relationship notes, shortlist decision. **Out:** automated outreach, site contracts (link to 04), patient data. Split into two apps (shortlist vs relationships) if usage shows it.
- **Records:** Candidate site; Candidate investigator; Feasibility response; Score. Shared: Organization (site), Person (PI), Study.
- **Screens:** Shortlist overview · Candidate sites · Investigators · Feasibility tracker · Relationship log.
- **Assistant / data angle:** pre-fill candidates from TrialAgents Intel rankings; merges v1 `co-site-feasibility` and `investigator-crm`.

### BT2-18 — Deal Comps (rank 18, Extended)
*Comparable deals and valuation assumptions for negotiations.*  
*Long name: Deal Comps & Asset Valuation*
- **Users / job:** benchmark a licensing deal or round against comparable deals, and keep the valuation assumptions behind a negotiating position.
- **Reference app:** DealForma — biopharma licensing, venture and M&A deal benchmarking.
- **In scope:** user-entered or researched comparable deals (with sources), deal terms (upfront, milestones, royalties), rNPV assumption sets per asset, scenario comparison. **Out:** paid-database content, fairness opinions.
- **Records:** Comparable deal; Deal term; Valuation assumption set. Shared: Program/Asset, Organization.
- **Screens:** Comps overview · Comparable deals · Valuation assumptions · Scenario comparison.
- **Assistant angle:** research public deal announcements with sources; draft term-sheet benchmarks for 07 and 03.

### BT2-19 — Grants (rank 19, Extended)
*Non-dilutive funding calls, applications, awards and reporting.*  
*Long name: Non-dilutive Funding Pipeline*
- **Users / job:** find and manage grants and other non-dilutive funding (e.g. EIC, national agencies, foundations) from opportunity to reporting.
- **Reference app:** Instrumentl — grant discovery, qualification, application pipeline and reporting.
- **In scope:** opportunities (EU and national sources first), eligibility and fit, application pipeline, deadlines, awarded grants and reporting obligations. **Out:** submission to funding portals.
- **Records:** Funding opportunity; Application; Award; Reporting obligation. Shared: Organization (funder), Program.
- **Screens:** Funding overview · Opportunities · Applications · Awards & reporting.
- **Assistant angle:** scheduled research proposes new calls; adapt the v1 `grant-pipeline` package.

### BT2-20 — Regulatory (rank 20, Clinical-stage)
*Agency meetings, feedback, designations and commitments.*  
*Long name: Regulatory Strategy & Agency Interactions*
- **Users / job:** plan and record interactions with regulators (scientific advice, pre-IND/IND-enabling meetings, designations) and track commitments.
- **Reference app:** Veeva Vault RIM — regulatory planning and correspondence tracking (workflow only).
- **In scope:** regulatory plan per program, agency meetings, briefing-package status, questions and agency feedback, designations (e.g. orphan, PRIME), commitments with due dates. **Out:** eCTD publishing, submissions, regulated-system claims.
- **Records:** Agency interaction; Question & feedback; Designation; Commitment. Shared: Program, Study, Organization (agency), Document reference.
- **Screens:** Regulatory overview · Interactions · Feedback log · Designations · Commitments.
- **Assistant angle:** summarise agency feedback across meetings; reshape the v1 `trial-regulatory-submission` package to this lighter scope.

---

## First app in detail: Runway (BT2-01)

> **Final scope:** [apps/RUNWAY.md](apps/RUNWAY.md). This section keeps the evidence and research.

*Cash, burn and runway by program, with what-if scenarios.* Replaces v1 `cash-runway` 1.2.2 as the next major version. There are no existing users, so v2 does not need to stay compatible with v1 data.

### 1. Evidence: what small biotechs need from a runway tool

**How we know (and how sure we are).** The needs below are drawn from three kinds of source, read 10 November 2026: (a) biotech-specific finance software (Abacum Life Sciences, Condor, Exigyn) and what they choose to build; (b) advice from biotech CFOs, fractional-CFO firms and advisors; (c) the generic reference, Jirav, and its user reviews. The sources agree strongly, but most are vendors or advisors with something to sell, and none is a survey of small biotechs. **Treat this as a well-supported hypothesis to validate with 5–10 biotech CEOs/CFOs (design partners) before building.**

What the sources consistently say:

| Need | Signal | Confidence |
|---|---|---|
| Cash, burn and runway are *the* metrics | Biotech CFO advice reduces decisions to cash, burn rate and runway; bankers call runway the single most important metric for clinical-stage biotechs. | High |
| Runway must be measured **against the next milestone**, not just in months | Grant Thornton: what matters is time to the next scientific or commercial milestone; biotech FP&A vendors model burn against milestones, delays and readouts. | High |
| **18–24 months** is the target; start raising before it falls below that | Repeatedly cited as the industry standard; advisors suggest starting bridge talks at the 18-month mark. | Medium–high |
| **Spend by program/study** | Abacum, Exigyn and Condor all centre on program- or study-level spend. | High |
| **Scenarios**: delay, slip, pause a program, move a financing | Abacum recalculates the cash-out date for protocol shifts, enrollment delays and milestone moves; advisors recommend a standing "base vs slip" pair every quarter. | High |
| People are the largest cost line | Abacum cites personnel at 60–70% of biotech costs; Jirav notes up to 80% of company expenses. | Medium (vendor figures) |
| Grants and CRO commitments sit in the same model | Abacum tracks grant drawdown and CRO commitments against restricted funding. | Medium |
| Several currencies, user-set rates | Abacum rolls up EU subsidiaries and converts at user-set FX rates. | Medium |
| A 13-week cash view and three-statement model | Recommended by Abacum's webinar for clinical-stage teams, but aimed at larger finance teams. | Low for <50 people → **not in MVP** |

### 2. Reference apps

**Is there a better, more specialised reference than Jirav? Yes, for the domain.**

| App | What it is | Use as reference for |
|---|---|---|
| **Abacum — Life Sciences** (primary, domain) | General FP&A with a life-sciences offering: spend by program, study and site; runway modelled against milestones, delays and readouts; scenarios that recalculate the cash-out date; grants and CRO commitments; user-set FX rates; AI that explains changes. Integrates NetSuite, Sage Intacct, Snowflake, BigQuery; typical go-live about 6 weeks. | What to model (programs, milestones, grants, CRO commitments, FX) and which questions the app must answer. |
| **Jirav** (secondary, mechanics) | Driver-based FP&A for SMBs and accounting firms. | How plans work: locked plan of record, cloned forecasts and scenarios, actual vs forecast months, roll-forward, drivers, roster + hires, direct cash flow, zero-cash date. |
| Condor | Biopharma R&D finance: clinical trial forecasting, accruals, close; raised a $24M Series A in 2026. | Already the reference for Trial Finance (11); too deep for Runway. |
| Exigyn | Biotech FP&A modules: cash runway, headcount, trial budgets, board reporting; Series A–B and later. Little public product detail. | Confirms the module set; not enough detail to copy workflows. |

**Our gap versus all of them:** they need an ERP integration, a finance team and weeks of setup. Runway should give a credible runway number **in one session from a bank balance and a few lines of spend**, which is what a 10–50 person biotech without a full-time CFO can actually use.

Jirav research notes (kept for build detail): plans are created blank or cloned and are active or archived; a plan of record is locked and read-only, cannot be unlocked, and is cloned to change; actual months are read-only and forecast months editable, with an auto roll-forward; the rolling-forecast loop is lock → clone → roll forward → variance report; standard drivers are annual target, fixed spread, growth, periodic growth, amount per headcount, % of another account and custom; workforce planning uses a roster plus planned and driver-based hires with fully loaded cost; cash is shown as a direct cash-flow table with a zero-check line, plus zero-cash date and a minimum cash balance; runway is offered in three definitions (trailing operating, predicted, standard). Reviews praise scenario speed and onboarding; complaints are the learning curve, hard conditional logic and slow reports. No dedicated side-by-side scenario screen is documented. Jirav's marketing screenshots have no captions or alt text, so UI notes come from help-center descriptions, not image inspection.

### 3. Scope rule: only what is clearly used

Every feature must pass one test: **would a CEO or part-time CFO of a 10–50 person biotech use it at least monthly, or need it for a board meeting or a raise?** If not, it is cut or deferred. Things the app does once (setup) must take minutes, not days.

**MVP features (kept)**

| Area | Feature | Why it stays |
|---|---|---|
| Cash | Opening bank balance; month-end balance confirmation | Everything starts from cash. |
| Plan | Spend lines with program, category, vendor and one of **4 drivers**: monthly amount, one-off, spread over a period, payment schedule (dated instalments, e.g. CRO milestones) | Covers how biotechs actually budget; payment schedules model CRO contracts. |
| Plan | Commitment status per line: Committed / Discretionary | Shows what can be cut to extend runway. |
| People | Roles (name optional), program, start/end month, salary, currency; one loaded-cost % | People are the largest cost; hires are the most common what-if. |
| Cash in | Equity tranches, grants, partnership payments, tax credits; each Committed or Contingent, with expected month | Runway counts committed cash only; contingent shown separately. |
| Milestones | A light milestone list (name, program, target month), linked to Programs (02) when that app exists | The core biotech question: does the cash reach the milestone? |
| Plans | **Plan of record** (locked board budget) and one **Forecast** | Board budget vs current view is the standard governance pair. |
| Scenarios | Unlimited, **preview by default**, saved only on purpose (see §5) | What-ifs are the main reason to open the app. |
| Actuals | Monthly actuals by category (program optional); mark month closed; forecast rolls forward | Keeps the forecast honest without bookkeeping. |
| Results | Runway months, cash-out date, cash at each milestone, monthly burn, cash curve, direct cash-flow table | The answers boards and investors ask for. |
| Variance | Actual vs plan of record by month and category, one commentary per month | The second most common board question. |
| Currencies | 12 currencies with automatic exchange rates (see §4) | International CROs and investors are normal even for small biotechs. |
| Snapshot | Freeze the month's results and commentary for board/investor use | Feeds Investor Updates (06) and Board (14). |
| Export | CSV/Excel of the cash-flow table; copy chart as image | Numbers end up in slides. |

**Cut or deferred (and why)**

| Feature | Decision | Reason |
|---|---|---|
| Accounting-file import / connectors | **Not in v2.0** | No single export format works across EU, UK, US and CA systems; actuals at category level are 10–20 numbers a month, and Claude can fill them from any report the user shares in chat. Revisit only if design partners ask. |
| Drivers "% of another line", "per FTE", custom formulas | Cut | Rare in small biotechs; the loaded-cost % covers per-head costs. |
| Close checklist, review workflow (draft / in review / approved) | Cut | Overhead for teams of this size; "mark month closed" and "save snapshot" are enough. |
| Departments, budget owners, sign-off | Deferred | Needs a finance team; programs matter more than departments. |
| Annual raise assumptions | Cut | One loaded-cost % and editing salaries covers it. |
| 13-week cash view | Deferred | Useful near a cash crunch; most small biotechs plan monthly. |
| Three-statement model, revenue, AR/AP, consolidation, debt | Cut | Pre-revenue, single-entity focus. |
| R&D tax-credit calculator | Cut | Country-specific; enter the expected credit as a cash-in line instead. |
| Line-level commentary | Cut | One commentary per month is what boards read. |
| Multiple alert rules | Reduced to one optional alert (runway below target) | Avoids noisy automations. |

### 4. Small features that make users happy

Chosen because they remove a common annoyance or answer a board question in one glance; each is cheap to build on top of the MVP.

1. **Automatic currency conversion.** Enter every line in its own currency (e.g. a USD CRO contract in a EUR company); the app converts with monthly ECB reference rates, loaded by an optional monthly automation or entered/proposed in chat (see [RUNWAY.md §6 and §8](apps/RUNWAY.md)). Supported: **USD, EUR, GBP, CHF, CAD, AUD, JPY, CNY, SEK, DKK, NOK, INR**.
2. **Currency exposure line.** "38% of the next 12 months' spend is in USD; a 10% stronger dollar shortens runway by 0.7 months." One sentence, computed from the lines.
3. **Runway in one sentence.** "Cash lasts until March 2028, 4 months after the Phase 1 readout." Shown at the top of the Overview and copyable into emails.
4. **Milestone markers on the cash curve,** coloured by cushion: green ≥ 6 months after the milestone, amber 3–6, red < 3.
5. **Start-raise date.** The month the forecast runway falls below the target (default 18 months), e.g. "To keep 18 months of runway, start raising by June 2027."
6. **"Why did runway change?" bridge.** Compared with the last snapshot: "Runway fell from 22 to 19 months: Phase 1 start moved (−2.1), two hires added (−0.8), grant received earlier (+0.4)". This is the first question at every board meeting.
7. **Instant what-if preview.** Ask Claude "what if the Series A closes 4 months later?" and see the new curve overlaid immediately, without saving anything.
8. **Contingent cash toggle.** One switch shows runway with and without contingent grants or milestone payments.

### 5. Final build scope

The final scope (screens, workflows, data model, calculation rules, access control, AI connections, customization, automations, fit with other apps, package checklist and acceptance criteria) is in **[apps/RUNWAY.md](apps/RUNWAY.md)**. Sections 1–4 above record the research and reasoning behind it; where they differ in detail, RUNWAY.md wins.

---

## Changes from v1

| v1 app | v2 outcome |
|---|---|
| BT-01 Investor CRM (Foundersuite) | Split into BT2-03 Investor Pipeline (Foundersuite) and BT2-06 Investor Updates (Visible) |
| BT-02 Partnership Tracker (Inpart/Inova) | Kept as BT2-07 BD & Partnering CRM |
| BT-03 Cash Runway (Jirav) | Kept as BT2-01; clinical cost side moves to BT2-11 (Condor) |
| BT-04 Hiring & Resource Management (Runn) | **Dropped.** Rare at this size; headcount plan lines live in BT2-01 |
| BT-05 CRO Selection (Bonfire) | Kept as BT2-05 with new reference Science Exchange / Scientist.com; merges sponsor RFP management |
| BT-06 Project Oversight (Smartsheet) | Kept as BT2-02 |

Related catalog apps (from the Clinical operations and Research teams lists) now covered here: `cro-oversight` → 16; `co-site-feasibility` + `investigator-crm` → 17; `trial-regulatory-submission` → 20 (lighter); `experiment-notebook` → 13 (reference changed from eLabFTW to Benchling); `inventory-management` → 9; `grant-pipeline` → 19; `literature-radar` → absorbed into 10.

## Considered and not in the 20

- **KOL, advisory board & consultants** (reference: Veeva Link) — valuable, but partly covered by 04 and 17. Next candidate if a slot opens.
- **Audit & vendor-qualification readiness** (reference: Qualio) — readiness tracking only; a full QMS conflicts with the no-regulated-claims rule.
- **Publication Management** (iEnvision Datavision) — a medical-affairs tool for larger pharma; rare under 50 employees.
- **Trial Monitoring & Pharmacovigilance** (Veeva CTMS + SafetyDocs) — usually outsourced to CROs and PV vendors at this size.
- **Hiring & Resource Management** (Runn) — see above.
- **Cap table** (Carta) — **do not build.** It is a legal ownership record and an established category; link to it instead.

## Reference app sources

Workflow references only; check current positioning before each build.

- Abacum Life Sciences — https://www.abacum.ai/industry/life-sciences
- Abacum, rolling runway for biotech — https://www.abacum.ai/blog/rolling-runway-biotech
- Condor FP&A for biopharma — https://condorsoftware.com/platform/fpa
- Grant Thornton, cash runway in life sciences — https://www.grantthornton.nl/en/insights-en/articles/cash-runway-in-life-sciences/
- Jirav planning and forecasting — https://www.jirav.com/business-planning-budgeting-forecasting
- Jirav scenario planning — https://jirav.com/scenario-planning
- Jirav runway definitions — https://www.jirav.com/blog/how-to-calculate-cash-flow-runway
- Jirav help center: plan management https://help.jirav.com/plans/plan-management · plan of record https://help.jirav.com/plans/plan-of-record-por · rolling forecast https://help.jirav.com/rolling-forecast · direct cash flow https://help.jirav.com/direct-cash-flow · minimum cash balance https://help.jirav.com/minimum-cash-balance-forecast · workforce planning https://help.jirav.com/workforce-planning-guide · standard drivers https://help.jirav.com/standard-drivers · dashboards https://help.jirav.com/dashboards
- Jirav user reviews — https://www.g2.com/products/jirav/reviews · https://www.capterra.com/p/195572/Jirav/reviews/
- Euna Procurement (formerly Bonfire), public-sector procurement — https://eunasolutions.com/
- Science Exchange, R&D outsourcing marketplace for biotech — https://www.scienceexchange.com/
- Scientist.com, R&D procurement platform — https://www.scientist.com/
- Benchling for Startups — https://www.benchling.com/startups
- Condor, clinical trial accruals for emerging biopharma — https://condorsoftware.com/solutions/emerging-biopharma
- Visible, investor updates and fundraising CRM — https://visible.vc/
- ShareVault, life-science virtual data room — https://sharevault.com/industries/life-sciences/
- DealForma, biopharma deal benchmarking — https://dealforma.com/
- Inova / Inpart, life-science partnering software (Inova acquired IN-PART in 2022)
- Citeline (Biomedtracker, Sitetrove) — https://www.citeline.com/
- Veeva Vault CTMS — https://www.veeva.com/products/veeva-ctms/
