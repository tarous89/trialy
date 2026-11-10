# Biotech company apps — use cases and reference apps (v2)

**Status:** Proposed shortlist, 10 November 2026. Supersedes [BIOTECH_v1.md](BIOTECH_v1.md) (BT-01…BT-06) as the planning list for biotech templates. It is a planning document, not the live catalog: package QA and database approval state still decide availability. All rules in the [shared design and build contract](DESIGN_AND_BUILD_CONTRACT.md) and the [blueprint README boundaries](README.md#boundaries--must-pass-before-marketing-an-app-as-functional) apply unchanged (no patient data, no mandatory external system, governed writes, no regulated-platform claims, never clone a benchmark).

**Audience:** small biotech companies (up to ~50 employees), specifically executives (CEO/CFO/CSO/CMO), project and program management, clinical operations, business development and scientific leaders.

## How this list was built

1. **Ranked by need.** Rank = how many small biotechs have the need × how often the team works in it. Most companies of this size are preclinical, so universal needs (cash, programs, fundraising, contracts, outsourcing) rank above clinical-stage needs.
2. **Target the spreadsheet layer.** These apps do not replace Microsoft 365/Google, Slack, Carta, the accounting system, Benchling or DocuSign. They replace the Excel trackers that sit between those systems, up to the point where a company buys an enterprise system (e.g. a CTMS).
3. **Small, single-purpose apps.** Multi-module products were split into simpler apps (e.g. investor pipeline vs investor updates, data room index vs due-diligence Q&A). Users can ask the assistant to merge apps, and records are shared by default, so splitting costs little.
4. **One primary reference app each,** chosen as the best-known workflow for that job in life sciences or startups. References describe proven workflows only; no UI, copy, code, data or branding is reused.

## The list (20 use cases)

| Rank | ID | App | What it does | Main users | Reference app | Tier | v1 source |
|---:|---|---|---|---|---|---|---|
| 1 | BT2-01 | **Runway** | Cash, burn and runway by program, with what-if scenarios. | CEO, CFO, board | Jirav | Core | adapt `cash-runway` |
| 2 | BT2-02 | **Programs** | Milestones, dependencies, risks and decisions across all programs. | CEO, PM, functional leads | Smartsheet | Core | adapt `project-oversight` |
| 3 | BT2-03 | **Fundraise** | Investor pipeline for a round, from first contact to signed commitment. | CEO, CFO | Foundersuite | Core | adapt `investor-crm` |
| 4 | BT2-04 | **Contracts** | Register of CDAs, MSAs, SOWs and other agreements with key dates and obligations. | CEO, BD, ClinOps, finance | Ironclad | Core | **new** |
| 5 | BT2-05 | **CRO Bids** | Collect, compare and score outsourcing bids, then record the award. | ClinOps, R&D leads | Science Exchange / Scientist.com | Core | merge `cro-selection` + `sponsor-rfp-management` |
| 6 | BT2-06 | **Investor Updates** | Regular updates and KPI history for existing investors. | CEO, CFO | Visible | Core | **new** (split from Investor CRM) |
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

Organization (investor, partner, CRO, vendor, site, competitor, funder) · Person (professional contacts only) · Program/Asset (indication, modality, stage) · Study · Contract reference · Document reference (title, version, location link — files stay in the customer's storage) · Task · Source/finding. Each app keeps its own private records (e.g. rounds, bids, accrual lines) and links to the shared ones by stable ID.

---

## App briefs

Format per app: users and job · reference app · scope (in / out) · records · screens · assistant and data angle. Screen recipes follow the v1 conventions in [BIOTECH_v1.md](BIOTECH_v1.md) and the [build contract](DESIGN_AND_BUILD_CONTRACT.md).

### BT2-01 — Runway (rank 1, Core)
*Cash, burn and runway by program, with what-if scenarios.*  
*Long name: Cash Runway & Scenarios*
- **Users / job:** CEO and CFO see cash, monthly burn and runway, and test what-if scenarios (delay a study, add hires, close a round) before board meetings.
- **Reference app:** Jirav — driver-based plans, forecast assumptions and scenarios.
- **In scope:** cash balance snapshots, burn by program and category, headcount plan lines, scenario assumptions, runway months per scenario. **Out:** general ledger, payroll, bank feeds, tax, cap table.
- **Records:** Cash snapshot; Budget line (program, category, month, amount, currency); Headcount plan line; Scenario; Assumption. Shared: Program, Study.
- **Screens:** Runway overview · Burn by program · Scenario builder · Headcount plan · Assumptions log.
- **Assistant angle:** explain runway changes month over month; draft the runway section of investor updates (06); pull accrual estimates from 11 when present. One currency per scenario; no implicit FX.
- **Detailed scope:** see [First app in detail: Runway](#first-app-in-detail-runway-bt2-01) below.

### BT2-02 — Programs (rank 2, Core)
*Milestones, dependencies, risks and decisions across all programs.*  
*Long name: Program & Milestone Oversight*
- **Users / job:** leadership and PM see every program's milestones, dependencies, risks and decisions in one board-ready view.
- **Reference app:** Smartsheet — milestone views, dependencies, risk and action reporting.
- **In scope:** programs, milestones (planned vs forecast vs actual), dependencies, risks, decisions, actions. **Out:** resource scheduling, timesheets, portfolio valuation.
- **Records:** Milestone; Dependency; Risk (likelihood, impact, owner, mitigation); Decision; Action. Shared: Program, Study, Organization.
- **Screens:** Portfolio overview · Program timeline · Risk register · Decision & action log · Status report.
- **Assistant angle:** draft monthly status and board slides from the records; flag slipped milestones and overdue actions.

### BT2-03 — Fundraise (rank 3, Core)
*Investor pipeline for a round, from first contact to signed commitment.*  
*Long name: Investor Pipeline*
- **Users / job:** run a financing round: target investors, track outreach and diligence, and separate verbal interest from signed commitments.
- **Reference app:** Foundersuite — investor CRM and fundraising pipeline.
- **In scope:** rounds, investors, contacts, opportunities by stage, interactions, next steps, commitments (signed vs verbal). **Out:** sending email, investor databases, subscription documents, cap table.
- **Records:** Round; Investor opportunity; Interaction; Commitment. Shared: Organization (fund), Person.
- **Screens:** Round overview · Investor directory · Pipeline board · Interaction log · Commitments.
- **Assistant angle:** research fund fit and recent investments in the assistant; prepare meeting briefs. Reuse the v1 `investor-crm` data contract and commitment-counting rules.

### BT2-04 — Contracts (rank 4, Core)
*Register of CDAs, MSAs, SOWs and other agreements with key dates and obligations.*  
*Long name: Contract & Agreement Register*
- **Users / job:** one register of every CDA, MSA, SOW/work order, change order, MTA, consulting and licence agreement, with renewals, expiries and obligations.
- **Reference app:** Ironclad — contract repository, key dates and obligations (workflow reference only).
- **In scope:** agreement metadata, counterparty, type, status, effective/expiry dates, value and currency, parent/child links (MSA → SOW → change order), obligations and reminders, document link. **Out:** e-signature, clause authoring, legal advice, hosting signed originals.
- **Records:** Agreement; Amendment/change order; Obligation; Key date. Shared: Organization, Person, Program, Study, Document reference.
- **Screens:** Expiries & obligations overview · Agreement register · Agreement detail (hierarchy) · Obligations tracker · CDA tracker.
- **Assistant angle:** extract key dates and obligations from a contract the user provides, as a reviewed proposal; remind before expiry. Every other pack links here.

### BT2-05 — CRO Bids (rank 5, Core)
*Collect, compare and score outsourcing bids, then record the award.*  
*Long name: CRO Sourcing & Bid Comparison*
- **Users / job:** define an outsourcing need (preclinical study, CMC, clinical), collect bids, compare them on a common grid and record the award decision.
- **Reference app:** Science Exchange / Scientist.com — life-science R&D outsourcing, sourcing and bid comparison. (Replaces v1 Bonfire, which is public-sector procurement.)
- **In scope:** sourcing request, vendor longlist, bid lines normalised to a common structure, weighted scoring, award decision and rationale. **Out:** purchasing, payment, vendor qualification audits.
- **Records:** Sourcing request; Bid; Bid line; Score; Award decision. Shared: Organization (vendor), Program, Study.
- **Screens:** Requests overview · Vendor longlist · Bid comparison grid · Weighted scoring · Decision record.
- **Assistant angle:** compare bid documents line by line and flag missing items; on award, offer to create the agreement in 04 and the vendor in 16.

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

*Cash, burn and runway by program, with what-if scenarios.* Replaces v1 `cash-runway` 1.2.2 as the next major version.

### 1. Reference app research: Jirav

Sources: Jirav product pages (planning, scenario planning, cash flow forecasting, workforce planning), the Jirav help center (Plan, Plan management, Plan of Record, Rolling forecast, Direct cash flow, Minimum cash balance, Workforce planning, Dashboards, Reports) and user reviews on G2/Capterra, read 10 November 2026. Jirav's marketing screenshots carry no captions or descriptive alt text, so the UI notes below come from the help-center descriptions of screens, tables and controls rather than from image inspection.

**What Jirav is.** Driver-based FP&A for small and mid-sized companies and the accounting firms serving them. It connects to the accounting system, payroll and CRM, and models the income statement, balance sheet and cash flow together.

**Core concepts and workflows we observed:**

| Jirav concept | How it works | Relevance for a small biotech |
|---|---|---|
| **Plans** (Manage Plans screen) | Create a blank plan or clone an existing one; clones are independent copies. Plans are active or archived; the number of active plans is capped. | High: base forecast + a few scenarios is exactly the biotech need. |
| **Plan of Record (PoR)** | A locked, read-only plan (e.g. the board-approved budget), marked with a lock icon. Locking cannot be undone; to change it you clone it. Dashboards can point at the current PoR. | High: the board-approved budget is the baseline every variance is measured against. |
| **Actuals vs forecast period** | Each plan has read-only actual months (white headers) and editable forecast months (blue headers); an auto roll-forward adds a month of actuals. | High: maps to the monthly close. |
| **Rolling forecast / budget vs actual** | Lock PoR → clone to a working plan → move the forecast start forward each month → variance report comparing working plan vs PoR. | High: the core monthly loop. |
| **Drivers** | Standard drivers: annual target, fixed spread, growth on historicals, periodic growth, amount per headcount, % of another account, custom formula. | Medium: biotechs need a smaller, different set (see §3). |
| **Workforce planning** | Staff roster plus planned hires; driver-based hires (e.g. one hire per N customers); term dates for leavers; fully loaded cost (payroll tax, benefits, bonus). | High for people cost; driver-based hires (revenue ratios) are rarely relevant pre-revenue. |
| **Cash** | Direct cash flow table (inflows, outflows, other, beginning/ending cash, a zero-check line); zero-cash date; minimum cash balance assumption. | High: pre-revenue biotech is managed on cash, not P&L. |
| **Runway metrics** | Three definitions: trailing operating runway (cash ÷ last 6 months' operating cash flow), predicted runway (cash ÷ forecast operating cash flow), standard runway (cash ÷ last period's change in cash). | High: we adopt two of them explicitly. |
| **Scenarios** | Clone a plan, change assumptions (price, hires, location, best/worst case), see the effect across statements, compare via reports. No dedicated side-by-side comparison screen is documented. | High, and a gap we can fill with a real compare screen. |
| **Dashboards & reports** | Tiles (number, bar, line, table, text, statement tiles), KPI library, report packages, variance analysis, Excel export, sharing. | Medium: we need one fixed overview plus a board-pack snapshot. |
| **Tasks** | Month-end close and annual budget checklists. | Medium: a close checklist keeps the monthly loop honest. |

**What users say.** Praised: driver-based forecasting, scenario speed, workforce planning, onboarding support, and use by startups until they hire a full-time CFO. Criticised: learning curve for custom models, conditional assumptions (IF-style logic) are hard, slow report load, limits on reports and custom tables.

**What does not fit biotech.** Jirav is built around revenue (SaaS ARR, bookings, deferred revenue, AR). A pre-revenue biotech is driven by program spend, contracted CRO payments, financing tranches, grants and tax credits, and its key question is *"do we have enough cash to reach the next value-inflection milestone?"*. Jirav has no notion of programs, studies, milestones or catalysts.

### 2. Positioning

> **Runway is a cash-first planning app for pre-revenue biotechs:** a board-approved budget, a monthly forecast, a few scenarios, and one answer always visible: *how long does the cash last, and does it get us past the next milestone?*

**Take from Jirav:** locked plan of record + working forecast + cloned scenarios; actual vs forecast months with a monthly roll-forward; a small driver library; roster + planned hires with loaded cost; direct cash flow view; zero-cash date and minimum reserve; variance vs plan; close checklist.

**Leave out:** three-statement modelling, revenue models, AR/AP/deferred revenue, consolidations, line-of-credit draw logic, algorithmic auto-forecast, configurable dashboard builder, accounting/payroll integrations (later, optional, via connectors).

**Add for biotech (not in Jirav):**
1. **Runway to milestone:** program milestones from Programs (02) overlaid on the cash curve, showing cash on hand at each milestone and months of cushion after it.
2. **Spend by program and study:** every line carries a program (and optionally study), so burn can be shown per asset.
3. **Committed vs contingent cash:** financing tranches, grants, partnership milestones and tax credits each carry a status; base runway counts committed cash only, with a separate "including contingent" line.
4. **Contracted spend:** CRO/vendor payment schedules linked to Contracts (04), and monthly accrual estimates from Trial Finance (11) when that app is used.
5. **A real scenario compare screen:** up to four plans side by side on zero-cash date, runway, cash at each milestone and cumulative burn.
6. **Claude as the analyst:** importing spreadsheets, setting up scenarios from plain language, explaining variances and drafting commentary; all numbers are computed by the app's deterministic rules, never by the assistant.

### 3. Features

**MVP (v2.0)**

| Area | Features |
|---|---|
| Setup | Reporting currency; opening cash balance and date; programs (shared records); spend categories (people, external R&D by program, G&A, facilities, capex, other); minimum cash reserve; close day. |
| Plans | Plan types *Plan of record* (locked), *Forecast* (one working plan) and *Scenario* (up to 4 active); clone, archive, lock as plan of record (irreversible, clone to edit); actuals-through month per plan. |
| Plan lines & drivers | Lines with program, category, vendor, commitment status (Committed / Discretionary / Contingent) and one driver: **Fixed monthly**, **One-off** (date), **Spread over period** (total across start–end), **Payment schedule** (dated instalments, e.g. CRO milestones, linkable to an agreement in Contracts), **Per FTE** (amount × FTE count from People), **% of another line**. |
| People | Roster of current staff (role, department, program allocation %, start, end, annual salary) and planned hires (role, target start, salary); loaded-cost % per plan; monthly FTE and people cost per program. Names optional: roles are enough. |
| Cash in | Financing events: equity tranches, grants, partnership upfront/milestones, R&D tax credits, interest; each with expected date, amount, status (Committed / Contingent), conditions and evidence link. |
| Actuals & close | Monthly actuals by category and program (manual entry or Claude-assisted import from an accounting export); month-end cash balance confirmation; close checklist; roll the forecast forward one month after close. |
| Results | Monthly direct cash flow (inflows, outflows by category, net burn, beginning and ending cash); net and gross burn; trailing runway (cash ÷ average net burn over the last 3 closed months, configurable 3/6); forecast runway and zero-cash date; reserve-breach date; cash at each program milestone. |
| Variance | Actual vs plan of record and forecast vs plan of record by month, category and program, with % and commentary per line. |
| Scenarios | Scenario = cloned plan + listed adjustments: shift a program's or study's spend by N months, scale a program's spend by %, stop a program from a date, add/remove hires, move or resize a financing event, change the reserve. Side-by-side compare on key results. Promote a scenario to the forecast. |
| Reporting | Monthly snapshot (frozen copy of key results + commentary) with review status Draft / In review / Approved, used by Investor Updates (06) and Board (14). |

**Later (v2.x)**
Accounting import connectors (Xero, QuickBooks, DATEV export, NetSuite); departmental budget owners and sign-off; planning FX rates as explicit, versioned assumptions; 13-week cash view; R&D tax credit calculator per country; additional drivers (IF-style conditions); runway alerts as automations; dashboard tile customisation.

### 4. Workflows

1. **Set up (first session, with Claude).** Claude asks for reporting currency, latest bank balance and date, programs and the minimum reserve, then offers to import an existing budget spreadsheet: it maps columns to plan lines and drivers and proposes records for review. Result: a first *Forecast* plan and the Overview screen showing runway.
2. **Approve the budget.** CFO reviews the forecast with the CEO/board, then locks a copy as the *Plan of record* (e.g. "FY2027 budget, board-approved 12 Dec"). Locking is irreversible; changes later happen in the forecast.
3. **Monthly close and roll-forward.** After the month ends: enter or import actuals; confirm the month-end bank balance; tick the close checklist; Claude flags lines with variance above the chosen threshold and drafts commentary; the CFO edits and approves; the forecast rolls forward one month. Result: a variance view and an updated runway.
4. **Reforecast.** When assumptions change (study delayed, new hire approved, round size changed), the CFO edits the forecast directly or via Claude ("move the Phase 1 start from March to June"). The plan of record stays unchanged for variance.
5. **What-if scenarios.** Clone the forecast into a scenario and apply adjustments, typically by asking Claude ("what if the Series A closes 4 months later and we pause program B?"). Compare up to four plans on zero-cash date, runway, cash at each milestone. Promote the chosen scenario to become the forecast if adopted.
6. **Board and investor reporting.** Freeze a monthly snapshot (key results, charts, commentary), mark it approved and use it in Investor Updates (06) and Board (14). Snapshots never change after approval.
7. **Watch the runway (optional automation).** A monthly check after close compares runway against thresholds (e.g. under 12 months, reserve breach within 6 months, milestone cash cushion below 3 months) and sends a TrialAgents notification. Automations are optional and never block the app.

### 5. Screens (7)

Each screen keeps the v1 convention of four primary capabilities.

1. **Overview** — (1) cash today, trailing and forecast runway, zero-cash date, with the plan shown; (2) cash curve by month for the forecast with the reserve line and program milestones marked; (3) net burn by month (actual then forecast) split by category; (4) alerts: reserve breach, lines over budget, missing close, unapproved snapshot.
2. **Cash flow** — (1) monthly direct cash table: inflows, outflows by category and program, net burn, beginning/ending cash; (2) switch plan (forecast, plan of record, any scenario) and toggle "including contingent cash"; (3) drill from any cell to the underlying lines; (4) export to CSV/Excel.
3. **Plan** — (1) plan lines table with driver, program, category, commitment status and monthly preview; (2) add/edit a line with a driver form; (3) filter by program, category, vendor, commitment; (4) manage plans: clone, archive, lock as plan of record.
4. **People** — (1) roster and planned hires with role, program allocation, start/end and salary; (2) monthly FTE and people cost by program; (3) loaded-cost % and raise assumptions per plan; (4) add/move/remove a hire with immediate runway effect.
5. **Cash in** — (1) financing events table with status, expected date and conditions; (2) committed vs contingent totals by month; (3) link evidence (term sheet, grant agreement) from Contracts or a document link; (4) mark an event as received to turn it into an actual.
6. **Scenarios** — (1) list of scenarios with their adjustments in plain words; (2) side-by-side compare of up to four plans on zero-cash date, runway, cash at each milestone and cumulative burn; (3) cash-curve overlay chart; (4) promote a scenario to the forecast.
7. **Close & variance** — (1) month list with close status and checklist; (2) actuals entry/import for the open month; (3) variance by category and program vs plan of record with commentary; (4) monthly snapshots with review status.

### 6. Data model

All scalar fields, one reporting currency, lowercase snake_case keys, as in v1.

| Record | Key fields |
|---|---|
| **Plan** | name, plan_type (plan_of_record / forecast / scenario), status (active / archived), locked (boolean), base_plan_id, actuals_through (month), currency, description, locked_at |
| **Plan line** | plan_id, name, category, program_id, study_id, vendor_org_id, agreement_id, commitment (Committed / Discretionary / Contingent), driver (fixed_monthly / one_off / spread / schedule / per_fte / pct_of_line), amount, start_month, end_month, ref_line_id, pct, notes |
| **Payment instalment** | plan_line_id, due_month, amount, trigger (text), status (planned / invoiced / paid) |
| **Position** | plan_id, role, department, program_id, allocation_pct, start_month, end_month, annual_salary, status (current / planned), person_id (optional) |
| **Cash-in event** | plan_id, type (equity / grant / partnership / tax_credit / interest / other), counterparty_org_id, amount, expected_month, status (Committed / Contingent / Received), conditions, evidence_ref |
| **Actual** | month, category, program_id, amount, direction (in / out), source (manual / import), source_ref |
| **Cash balance** | as_of_date, amount, account_label, confirmed (boolean) |
| **Scenario adjustment** | plan_id, kind (shift_program / scale_program / stop_program / add_hire / remove_hire / move_cash_in / resize_cash_in / set_reserve), target_id, months, pct, amount, from_month, note |
| **Close period** | month, status (open / in_review / closed), checklist (text), closed_by, closed_at |
| **Snapshot** | month, plan_id, metrics (JSON text, frozen), commentary, status (Draft / In review / Approved), approved_by |
| **Settings** | reporting_currency, min_cash_reserve, loaded_cost_pct, trailing_window (3 / 6), variance_threshold_pct, alert thresholds |

Shared records used: Program and milestones (Programs, 02), Study, Organization (vendors, investors, funders), Agreement (Contracts, 04), accrual estimates (Trial Finance, 11).

### 7. Calculation rules

- **Opening cash and actuals** follow the v1 contract unchanged: latest confirmed start-of-day balance on or before the cutoff; only actuals from that date to the cutoff count; invalid dates, a missing opening or truncated reads block exact cash claims.
- **Monthly outflow** of a plan line comes from its driver; payment schedules use their instalments; per-FTE lines use that month's FTE from People; % lines use the referenced line in the same month (no circular references).
- **People cost** per month = Σ (annual salary ÷ 12 × allocation × (1 + loaded-cost %)) for positions active that month; a position counts from its start month through its end month.
- **Net burn** = operating outflows − operating inflows (interest, other income). Financing inflows (equity, grants, partnership payments, tax credits) are shown separately and do not reduce burn.
- **Trailing runway** = cash at last close ÷ average net burn of the last 3 (or 6) closed months.
- **Forecast runway / zero-cash date** = first forecast month where ending cash < 0, counting committed cash-in only; a second value includes contingent cash-in. **Reserve-breach date** = first month where ending cash < minimum reserve.
- **Cash at milestone** = forecast ending cash in the milestone's target month; **cushion** = months between the milestone and the reserve-breach date.
- **Variance** = actual (or forecast) − plan of record, by month, category and program, with % of plan; lines over the threshold are flagged.
- **Currency:** one reporting currency per app; mixed-currency rows are excluded and flagged, never converted (v1 rule). Planning FX rates are a later, explicit feature.
- **Limits:** v1 read caps (800 rows per role) apply; incomplete reads are shown, never treated as zero.

### 8. Claude's role

- Import: map a spreadsheet or accounting export to plan lines, positions or actuals and propose records for review.
- Scenarios from plain language: translate "pause program B from Q3 and hire two chemists in January" into scenario adjustments, shown for confirmation.
- Variance commentary: explain the largest variances using the lines and notes, as a draft for the CFO.
- Board/investor text: draft the runway section for Investor Updates (06) and the Board (14) pack from an approved snapshot.
- Never: compute or overwrite results outside the app's rules, give accounting/tax advice, or treat contingent cash as committed.

### 9. Changes from v1 `cash-runway` 1.2.2

| v1 | v2 |
|---|---|
| One ledger table with entry kinds (opening, actual, budget, funding) | Separate plans, plan lines with drivers, positions, cash-in events, actuals and cash balances |
| Budget = one line per month | Drivers generate months (fixed, one-off, spread, schedule, per FTE, % of line) |
| Scenario = fixed parameters (clinical multiplier, people/contractor delta, funding delay, trial shift) | Scenario = cloned plan + any number of listed adjustments, compared side by side |
| No locked baseline | Plan of record (locked) vs forecast, with variance |
| No people model | Roster and planned hires with loaded cost and program allocation |
| No milestones | Runway to milestone, cash at milestone, cushion |
| Financial briefings | Monthly snapshots with review status, reused by Investor Updates and Board |
| Six screens (overview, expense tracker, budget planner, cash forecast, scenario builder, briefings) | Seven screens (overview, cash flow, plan, people, cash in, scenarios, close & variance) |

Kept: identity/access model, governed writes, layout settings, one reporting currency, opening-cash and cutoff rules, read caps, optional automations.

### 10. Open decisions

1. **Planning FX rates:** stay strictly single-currency in v2.0, or allow explicit planning rates per plan for USD-denominated CRO contracts? (Recommended: single currency in v2.0, FX in v2.1.)
2. **Milestones source:** require the Programs app (02), or let Runway hold a light milestone list of its own until Programs exists? (Recommended: own light list, linked to Programs when present.)
3. **Accounting import:** spreadsheet import via Claude only in v2.0, or one connector (e.g. Xero) at launch?
4. **Number of active scenarios:** four (matches the compare screen) or unlimited with four compared at a time?
5. **Data migration:** offer a Claude-assisted migration from saved v1 apps (ledger → plan lines/actuals), or keep v1 apps as they are?

### 11. Acceptance criteria (beyond the shared contract)

- From an empty workspace, a CFO reaches a first runway number within one session using only an imported budget spreadsheet and a bank balance.
- Locking a plan of record makes it read-only; cloning it yields an editable forecast with identical results.
- Closing a month moves it to actuals, rolls the forecast and shows variance vs plan of record for that month.
- A scenario with "shift program X by 3 months" changes only that program's lines, and the compare screen shows the new zero-cash date and cash at each milestone.
- Contingent cash never changes the base runway; toggling "including contingent cash" changes only the second value.
- Mixed-currency rows, missing opening cash or truncated reads are visibly flagged and never produce an exact runway claim.
- An approved snapshot never changes, even after later edits to the plan.

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
