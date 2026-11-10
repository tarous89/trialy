# Biotech company apps — use cases and reference apps (v2)

**Status:** Proposed shortlist, 10 November 2026. Supersedes [BIOTECH_v1.md](BIOTECH_v1.md) (BT-01…BT-06) as the planning list for biotech templates. It is a planning document, not the live catalog: package QA and database approval state still decide availability. All rules in the [shared design and build contract](DESIGN_AND_BUILD_CONTRACT.md) and the [blueprint README boundaries](README.md#boundaries--must-pass-before-marketing-an-app-as-functional) apply unchanged (no patient data, no mandatory external system, governed writes, no regulated-platform claims, never clone a benchmark).

**Audience:** small biotech companies (up to ~50 employees), specifically executives (CEO/CFO/CSO/CMO), project and program management, clinical operations, business development and scientific leaders.

## How this list was built

1. **Ranked by need.** Rank = how many small biotechs have the need × how often the team works in it. Most companies of this size are preclinical, so universal needs (cash, programs, fundraising, contracts, outsourcing) rank above clinical-stage needs.
2. **Target the spreadsheet layer.** These apps do not replace Microsoft 365/Google, Slack, Carta, the accounting system, Benchling or DocuSign. They replace the Excel trackers that sit between those systems, up to the point where a company buys an enterprise system (e.g. a CTMS).
3. **Small, single-purpose apps.** Multi-module products were split into simpler apps (e.g. investor pipeline vs investor updates, data room index vs due-diligence Q&A). Users can ask the assistant to merge apps, and records are shared by default, so splitting costs little.
4. **One primary reference app each,** chosen as the best-known workflow for that job in life sciences or startups. References describe proven workflows only; no UI, copy, code, data or branding is reused.

## The list (20 use cases)

| Rank | ID | Use case | Main users | Reference app | Tier | v1 source |
|---:|---|---|---|---|---|---|
| 1 | BT2-01 | Cash Runway & Scenarios | CEO, CFO, board | Jirav | Core | adapt `cash-runway` |
| 2 | BT2-02 | Program & Milestone Oversight | CEO, PM, functional leads | Smartsheet | Core | adapt `project-oversight` |
| 3 | BT2-03 | Investor Pipeline | CEO, CFO | Foundersuite | Core | adapt `investor-crm` |
| 4 | BT2-04 | Contract & Agreement Register | CEO, BD, ClinOps, finance | Ironclad | Core | **new** |
| 5 | BT2-05 | CRO Sourcing & Bid Comparison | ClinOps, R&D leads | Science Exchange / Scientist.com | Core | merge `cro-selection` + `sponsor-rfp-management` |
| 6 | BT2-06 | Investor Updates & Reporting | CEO, CFO | Visible | Core | **new** (split from Investor CRM) |
| 7 | BT2-07 | BD & Partnering CRM | CEO, BD | Inova Partnering (Inpart) | Core | adapt `partnership-tracker` |
| 8 | BT2-08 | Data Room Index & Readiness | CEO, CFO, BD | ShareVault | Core | **new** |
| 9 | BT2-09 | Lab Inventory & Ordering | Lab managers, scientists | Quartzy | Core | adapt `inventory-management` |
| 10 | BT2-10 | Competitive & Pipeline Landscape | CEO, BD, CSO/CMO | Citeline Biomedtracker (alt. Evaluate) | Core · **TrialAgents edge** | **new** (absorbs `literature-radar` intent) |
| 11 | BT2-11 | Clinical Trial Budget & Accruals | CFO, ClinOps | Condor | Extended | **new** |
| 12 | BT2-12 | Due Diligence Q&A Tracker | CEO, CFO, BD | Ansarada (Q&A workflow) | Extended | **new** (split from data room) |
| 13 | BT2-13 | Experiment & Study Records | CSO, scientists | Benchling | Extended | adapt `experiment-notebook` |
| 14 | BT2-14 | Board & Governance | CEO, company secretary | Diligent Boards | Extended | **new** |
| 15 | BT2-15 | IP & Patent Portfolio | CEO, CSO, IP counsel | Anaqua | Extended | **new** |
| 16 | BT2-16 | CRO & Vendor Oversight | ClinOps, PM | Veeva Vault CTMS | Clinical-stage | adapt `cro-oversight` |
| 17 | BT2-17 | Site & Investigator Shortlist | ClinOps, CMO | Veeva Study Startup + Citeline Sitetrove | Clinical-stage · **TrialAgents edge** | merge `co-site-feasibility` + `investigator-crm` |
| 18 | BT2-18 | Deal Comps & Asset Valuation | CEO, BD, CFO | DealForma | Extended | **new** |
| 19 | BT2-19 | Non-dilutive Funding Pipeline | CEO, CFO, CSO | Instrumentl | Extended | adapt `grant-pipeline` (EU sources) |
| 20 | BT2-20 | Regulatory Strategy & Agency Interactions | CMO, regulatory lead | Veeva Vault RIM | Clinical-stage | reshape `trial-regulatory-submission` |

**Tiers.** *Core* (1–10): needed by nearly every small biotech; build first. *Extended* (11–15, 18–19): common and valuable, often tied to a fundraising or licensing event. *Clinical-stage* (16, 17, 20): only once a program enters the clinic.

**TrialAgents edge.** BT2-10 and BT2-17 can open pre-filled with TrialAgents Intel trial, sponsor, site and investigator data, which no spreadsheet can do. Rank reflects breadth of need, not strategic value: consider launching these two early as the differentiating hook alongside the Core finance and program apps.

### Connected packs

The apps are separate, but several share records and form natural packs (all over the shared Organization / Person / Program records):

- **Finance pack:** Cash Runway (01) ← Clinical Trial Budget & Accruals (11) → Investor Updates (06). Accruals feed the runway; the runway feeds updates and board packs.
- **Deal pack** (fundraising *and* licensing follow the same path: targets → outreach → CDA → non-confidential deck → data room → diligence → term sheet): Investor Pipeline (03), BD & Partnering CRM (07), Contract Register (04), Data Room Index (08), Due Diligence Q&A (12), Deal Comps (18).
- **Outsourcing pack:** CRO Sourcing (05) → Contract Register (04) → CRO & Vendor Oversight (16) → Accruals (11).
- **Clinical pack:** Competitive Landscape (10), Site & Investigator Shortlist (17), Regulatory Interactions (20), CRO Oversight (16).
- **Science pack:** Experiment & Study Records (13), Lab Inventory (09), IP Portfolio (15).

### Shared record types (shared by default)

Organization (investor, partner, CRO, vendor, site, competitor, funder) · Person (professional contacts only) · Program/Asset (indication, modality, stage) · Study · Contract reference · Document reference (title, version, location link — files stay in the customer's storage) · Task · Source/finding. Each app keeps its own private records (e.g. rounds, bids, accrual lines) and links to the shared ones by stable ID.

---

## App briefs

Format per app: users and job · reference app · scope (in / out) · records · screens · assistant and data angle. Screen recipes follow the v1 conventions in [BIOTECH_v1.md](BIOTECH_v1.md) and the [build contract](DESIGN_AND_BUILD_CONTRACT.md).

### BT2-01 — Cash Runway & Scenarios (rank 1, Core)
- **Users / job:** CEO and CFO see cash, monthly burn and runway, and test what-if scenarios (delay a study, add hires, close a round) before board meetings.
- **Reference app:** Jirav — driver-based plans, forecast assumptions and scenarios.
- **In scope:** cash balance snapshots, burn by program and category, headcount plan lines, scenario assumptions, runway months per scenario. **Out:** general ledger, payroll, bank feeds, tax, cap table.
- **Records:** Cash snapshot; Budget line (program, category, month, amount, currency); Headcount plan line; Scenario; Assumption. Shared: Program, Study.
- **Screens:** Runway overview · Burn by program · Scenario builder · Headcount plan · Assumptions log.
- **Assistant angle:** explain runway changes month over month; draft the runway section of investor updates (06); pull accrual estimates from 11 when present. One currency per scenario; no implicit FX.

### BT2-02 — Program & Milestone Oversight (rank 2, Core)
- **Users / job:** leadership and PM see every program's milestones, dependencies, risks and decisions in one board-ready view.
- **Reference app:** Smartsheet — milestone views, dependencies, risk and action reporting.
- **In scope:** programs, milestones (planned vs forecast vs actual), dependencies, risks, decisions, actions. **Out:** resource scheduling, timesheets, portfolio valuation.
- **Records:** Milestone; Dependency; Risk (likelihood, impact, owner, mitigation); Decision; Action. Shared: Program, Study, Organization.
- **Screens:** Portfolio overview · Program timeline · Risk register · Decision & action log · Status report.
- **Assistant angle:** draft monthly status and board slides from the records; flag slipped milestones and overdue actions.

### BT2-03 — Investor Pipeline (rank 3, Core)
- **Users / job:** run a financing round: target investors, track outreach and diligence, and separate verbal interest from signed commitments.
- **Reference app:** Foundersuite — investor CRM and fundraising pipeline.
- **In scope:** rounds, investors, contacts, opportunities by stage, interactions, next steps, commitments (signed vs verbal). **Out:** sending email, investor databases, subscription documents, cap table.
- **Records:** Round; Investor opportunity; Interaction; Commitment. Shared: Organization (fund), Person.
- **Screens:** Round overview · Investor directory · Pipeline board · Interaction log · Commitments.
- **Assistant angle:** research fund fit and recent investments in the assistant; prepare meeting briefs. Reuse the v1 `investor-crm` data contract and commitment-counting rules.

### BT2-04 — Contract & Agreement Register (rank 4, Core)
- **Users / job:** one register of every CDA, MSA, SOW/work order, change order, MTA, consulting and licence agreement, with renewals, expiries and obligations.
- **Reference app:** Ironclad — contract repository, key dates and obligations (workflow reference only).
- **In scope:** agreement metadata, counterparty, type, status, effective/expiry dates, value and currency, parent/child links (MSA → SOW → change order), obligations and reminders, document link. **Out:** e-signature, clause authoring, legal advice, hosting signed originals.
- **Records:** Agreement; Amendment/change order; Obligation; Key date. Shared: Organization, Person, Program, Study, Document reference.
- **Screens:** Expiries & obligations overview · Agreement register · Agreement detail (hierarchy) · Obligations tracker · CDA tracker.
- **Assistant angle:** extract key dates and obligations from a contract the user provides, as a reviewed proposal; remind before expiry. Every other pack links here.

### BT2-05 — CRO Sourcing & Bid Comparison (rank 5, Core)
- **Users / job:** define an outsourcing need (preclinical study, CMC, clinical), collect bids, compare them on a common grid and record the award decision.
- **Reference app:** Science Exchange / Scientist.com — life-science R&D outsourcing, sourcing and bid comparison. (Replaces v1 Bonfire, which is public-sector procurement.)
- **In scope:** sourcing request, vendor longlist, bid lines normalised to a common structure, weighted scoring, award decision and rationale. **Out:** purchasing, payment, vendor qualification audits.
- **Records:** Sourcing request; Bid; Bid line; Score; Award decision. Shared: Organization (vendor), Program, Study.
- **Screens:** Requests overview · Vendor longlist · Bid comparison grid · Weighted scoring · Decision record.
- **Assistant angle:** compare bid documents line by line and flag missing items; on award, offer to create the agreement in 04 and the vendor in 16.

### BT2-06 — Investor Updates & Reporting (rank 6, Core)
- **Users / job:** send consistent monthly or quarterly updates to existing investors and keep the KPI history behind them.
- **Reference app:** Visible — investor updates and KPI reporting.
- **In scope:** update drafts and issued versions, KPI series, highlights/lowlights, asks, recipient list (names only). **Out:** sending email from the app (manual send or a separately approved TrialAgents email action), investor portals.
- **Records:** Update; KPI; KPI value; Recipient group. Shared: Organization, Person, Program.
- **Screens:** Updates archive · Update editor · KPI history · Recipients.
- **Assistant angle:** draft the update from 01, 02 and 03 records; keep wording consistent quarter to quarter.

### BT2-07 — BD & Partnering CRM (rank 7, Core)
- **Users / job:** manage out- and in-licensing targets, academic collaborations and conference meetings from first contact to term sheet.
- **Reference app:** Inova Partnering (Inpart) — life-science partnering pipeline and partnering meetings.
- **In scope:** partner companies and contacts, opportunities by stage, conference meetings (e.g. BIO, BIO-Europe), CDA status (linked to 04), non-confidential materials sent, follow-ups. **Out:** deal rooms (see 08), contract drafting.
- **Records:** Partnering opportunity; Meeting; Material sent; Follow-up. Shared: Organization, Person, Program/Asset, Agreement.
- **Screens:** BD overview · Partner directory · Opportunity pipeline · Conference meetings · Follow-ups.
- **Assistant angle:** research partner pipelines and deal history; prepare one-page meeting briefs before conferences.

### BT2-08 — Data Room Index & Readiness (rank 8, Core)
- **Users / job:** prepare and run a data room for a round or licensing deal: what must be in it, what is missing, which version was shared with whom.
- **Reference app:** ShareVault — life-science virtual data room for fundraising, licensing and M&A.
- **In scope:** room index (standard folder structure for financing and licensing rooms), required-document checklist with readiness status, document references and versions, access list per party, change log. **Out (v2):** hosting files for external parties, watermarking, view tracking. Files stay in Drive/SharePoint/Box; hosting is a separate later decision because it is a security product.
- **Records:** Data room; Room section; Required item; Document reference; Access grant (party, scope, dates). Shared: Organization, Person, Program, Agreement (CDA must exist before access).
- **Screens:** Readiness overview · Room index · Missing items · Access list · Change log.
- **Assistant angle:** check readiness against a standard financing or licensing checklist; summarise what changed since a party last had access.

### BT2-09 — Lab Inventory & Ordering (rank 9, Core)
- **Users / job:** track reagents and consumables, handle requests and reorder before items run out.
- **Reference app:** Quartzy — lab inventory, requests and reordering.
- **In scope:** items, locations, lots and expiry, stock levels, requests, approvals, orders, reorder points. **Out:** supplier punch-out, purchasing systems, human biospecimens.
- **Records:** Item; Stock lot; Location; Request; Order. Shared: Organization (supplier), Program.
- **Screens:** Stock overview · Inventory · Requests & approvals · Orders · Expiring & low stock.
- **Assistant angle:** suggest reorders; summarise spend by program for 01.

### BT2-10 — Competitive & Pipeline Landscape (rank 10, Core · TrialAgents edge)
- **Users / job:** know which competitor assets target the same indication or mechanism, their trial status and upcoming readouts, and recent deals.
- **Reference app:** Citeline Biomedtracker (alternative: Evaluate) — competitor pipeline and event tracking.
- **In scope:** competitor assets, linked trials, stage, expected readouts, events (readouts, approvals, deals, financings), relevance notes; scientific publications as a finding type (absorbs v1 Literature Radar intent). **Out:** forecasts, market sizing, paid-database data.
- **Records:** Competitor asset; Event; Finding (source, date, relevance). Shared: Organization, Program (own asset for comparison), Study.
- **Screens:** Landscape overview (by indication / mechanism) · Competitor assets · Trial & readout calendar · Events feed · Watchlist & findings.
- **Assistant / data angle:** pre-fill trials and sponsors from TrialAgents Intel; scheduled research proposes new findings for human review.

### BT2-11 — Clinical Trial Budget & Accruals (rank 11, Extended)
- **Users / job:** compare CRO budgets with actual invoices and work done, and estimate monthly accruals without a spreadsheet maze.
- **Reference app:** Condor — clinical trial finance, accruals and CRO reconciliation.
- **In scope:** contracted budget by activity (linked to SOWs in 04), change orders, invoices, progress drivers (e.g. sites activated, patients enrolled — aggregate counts only), accrual estimates by month, budget vs actual. **Out:** accounting entries, ERP posting, audit sign-off, site or patient-level payments.
- **Records:** Budget line; Invoice; Progress driver; Accrual estimate. Shared: Study, Organization (CRO), Agreement.
- **Screens:** Study finance overview · Budget vs actual · Invoices · Accrual worksheet · Change orders.
- **Assistant angle:** check invoices against contract lines and flag mismatches; feed approved accruals into 01.

### BT2-12 — Due Diligence Q&A Tracker (rank 12, Extended)
- **Users / job:** handle incoming diligence questions from investors or partners: assign, answer, approve and track what was disclosed to whom.
- **Reference app:** Ansarada — data room Q&A workflow.
- **In scope:** question log per party, category, assignee, draft and approved answer, linked documents (08), status and due date. **Out:** sending answers externally from the app.
- **Records:** DD question; Answer; Disclosure record. Shared: Organization, Person, Document reference.
- **Screens:** Q&A overview · Question log · Answer review · Disclosure history.
- **Assistant angle:** draft answers from approved documents; spot repeated questions across parties and reuse approved answers.

### BT2-13 — Experiment & Study Records (rank 13, Extended)
- **Users / job:** a lightweight record of experiments and preclinical studies for small or virtual biotechs: plans, protocols, results and linked samples.
- **Reference app:** Benchling — notebook, protocols and linked samples. (Replaces v1 eLabFTW, an academic tool.)
- **In scope:** experiments, protocols (versioned references), results summaries, linked inventory items (09) and outsourced studies (05/16). **Out:** sequence design, registry, instrument integration, GxP/21 CFR Part 11 claims.
- **Records:** Experiment; Protocol reference; Result; Sample link. Shared: Program, Organization (CRO for outsourced studies).
- **Screens:** Experiments overview · Experiment record · Protocols · Results by program.
- **Positioning note:** Benchling already sells to startups, so position this for teams that outsource most lab work and need an index of studies and results rather than a full notebook.

### BT2-14 — Board & Governance (rank 14, Extended)
- **Users / job:** prepare board meetings and keep resolutions, approvals and action items in one place.
- **Reference app:** Diligent Boards — board packs, minutes and actions.
- **In scope:** meetings, agenda, board-pack contents (document references), minutes references, resolutions and written consents (metadata), action items. **Out:** legally binding e-signature, statutory filings, cap table.
- **Records:** Board meeting; Agenda item; Resolution; Board action. Shared: Person, Document reference, Program.
- **Screens:** Governance overview · Meeting prep · Resolutions register · Actions.
- **Assistant angle:** assemble the board pack outline from 01, 02, 03 and 06.

### BT2-15 — IP & Patent Portfolio (rank 15, Extended)
- **Users / job:** an executive view of patent families, key deadlines, annuity costs and freedom-to-operate actions, alongside outside counsel's formal docketing.
- **Reference app:** Anaqua — IP portfolio and deadline management.
- **In scope:** patent families, applications per jurisdiction, status, priority/key dates, annuity estimates, inventors (professional), linked programs, FTO actions. **Out:** official docketing of record, legal opinions.
- **Records:** Patent family; Application; Deadline; FTO action. Shared: Program, Person, Organization (law firm).
- **Screens:** Portfolio overview · Families & jurisdictions · Deadlines · Costs · FTO actions.
- **Assistant angle:** summarise portfolio coverage per program for 08 and investor diligence.

### BT2-16 — CRO & Vendor Oversight (rank 16, Clinical-stage)
- **Users / job:** sponsor-side oversight of CROs and key vendors during studies: deliverables, KPIs, issues and escalations.
- **Reference app:** Veeva Vault CTMS — sponsor oversight and monitoring KPI rollups (a small operational slice).
- **In scope:** vendor deliverables, study-level KPIs (aggregate), issues and escalations, governance meetings, performance reviews. **Out:** CTMS/eTMF replacement, patient-level data.
- **Records:** Deliverable; KPI value; Issue; Governance meeting. Shared: Study, Organization, Agreement.
- **Screens:** Oversight overview · Deliverables · KPIs · Issues & escalations · Governance log.
- **Assistant angle:** prepare governance meeting agendas and minutes drafts; reuse the v1 `cro-oversight` package.

### BT2-17 — Site & Investigator Shortlist (rank 17, Clinical-stage · TrialAgents edge)
- **Users / job:** build a site and investigator shortlist for a study from real trial history, then track feasibility outreach and relationships.
- **Reference apps:** Veeva Study Startup (feasibility workflow) + Citeline Sitetrove (site/investigator intelligence).
- **In scope:** candidate sites and PIs with trial history, scoring, feasibility questionnaire status, relationship notes, shortlist decision. **Out:** automated outreach, site contracts (link to 04), patient data. Split into two apps (shortlist vs relationships) if usage shows it.
- **Records:** Candidate site; Candidate investigator; Feasibility response; Score. Shared: Organization (site), Person (PI), Study.
- **Screens:** Shortlist overview · Candidate sites · Investigators · Feasibility tracker · Relationship log.
- **Assistant / data angle:** pre-fill candidates from TrialAgents Intel rankings; merges v1 `co-site-feasibility` and `investigator-crm`.

### BT2-18 — Deal Comps & Asset Valuation (rank 18, Extended)
- **Users / job:** benchmark a licensing deal or round against comparable deals, and keep the valuation assumptions behind a negotiating position.
- **Reference app:** DealForma — biopharma licensing, venture and M&A deal benchmarking.
- **In scope:** user-entered or researched comparable deals (with sources), deal terms (upfront, milestones, royalties), rNPV assumption sets per asset, scenario comparison. **Out:** paid-database content, fairness opinions.
- **Records:** Comparable deal; Deal term; Valuation assumption set. Shared: Program/Asset, Organization.
- **Screens:** Comps overview · Comparable deals · Valuation assumptions · Scenario comparison.
- **Assistant angle:** research public deal announcements with sources; draft term-sheet benchmarks for 07 and 03.

### BT2-19 — Non-dilutive Funding Pipeline (rank 19, Extended)
- **Users / job:** find and manage grants and other non-dilutive funding (e.g. EIC, national agencies, foundations) from opportunity to reporting.
- **Reference app:** Instrumentl — grant discovery, qualification, application pipeline and reporting.
- **In scope:** opportunities (EU and national sources first), eligibility and fit, application pipeline, deadlines, awarded grants and reporting obligations. **Out:** submission to funding portals.
- **Records:** Funding opportunity; Application; Award; Reporting obligation. Shared: Organization (funder), Program.
- **Screens:** Funding overview · Opportunities · Applications · Awards & reporting.
- **Assistant angle:** scheduled research proposes new calls; adapt the v1 `grant-pipeline` package.

### BT2-20 — Regulatory Strategy & Agency Interactions (rank 20, Clinical-stage)
- **Users / job:** plan and record interactions with regulators (scientific advice, pre-IND/IND-enabling meetings, designations) and track commitments.
- **Reference app:** Veeva Vault RIM — regulatory planning and correspondence tracking (workflow only).
- **In scope:** regulatory plan per program, agency meetings, briefing-package status, questions and agency feedback, designations (e.g. orphan, PRIME), commitments with due dates. **Out:** eCTD publishing, submissions, regulated-system claims.
- **Records:** Agency interaction; Question & feedback; Designation; Commitment. Shared: Program, Study, Organization (agency), Document reference.
- **Screens:** Regulatory overview · Interactions · Feedback log · Designations · Commitments.
- **Assistant angle:** summarise agency feedback across meetings; reshape the v1 `trial-regulatory-submission` package to this lighter scope.

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
