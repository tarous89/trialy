# Biotech company apps — detailed candidate screen scope

**Status: planning only.** Six user-selected proposed apps; no HTML or running templates created. Use the universal [design and build contract](DESIGN_AND_BUILD_CONTRACT.md): Vivid/Inter typography, neutral tables, selectively dark KPI cards, clear chart units, authorization and source history. Benchmarks illustrate established workflows, **not their code, screenshots or proprietary data**. No mandatory external integration or patient data.

## BT-01 — Investor CRM (6 screens)

**Primary users:** Founder/CEO, CFO, fundraising lead and approved advisors. **User job:** Run a disciplined investor outreach and financing pipeline without an external CRM.

**Benchmark:** Foundersuite — investor CRM, pipeline, interactions and financing progress (workflow reference only).

**MVP boundary:** Private and institutional investor contacts and company funding activity; no investor email sending, data broker or legally binding subscription documents.

**Suggested UI identity:** Forest with a dark-teal (#243B40) financing headline card, thin coin/people icon, emerald selected state; light Vivid forms and tables.

**Proposed persistent records / fields:** Organization (fund, type, geography, investment stage, ticket preference); Person (professional affiliation, role, preferred contact channel); Fundraise Round (target, currency, expected close); Investor Opportunity (fund, round, stage, amount indication, probability if manually estimated, owner, next step); Interaction (date, channel, outcome, follow-up); Task (owner, due, status); Research Finding (source, observed date, relevance). Reuse Organization/Person records across other apps, with private round relationships.

**Core measures and derivations:** Pipeline totals by stage = count of active opportunities; verbally separate non-binding indicative interest from signed commitments; fundraising progress = confirmed commitments / chosen target (empty if target absent).

### Screen 1 — Fundraising Overview (Dashboard)

**Composition:** Top three KPI cards and a compact conversion area; dark teal first card with people/target outline.

**Chart / icon treatment:** Stage bar chart with exact counts; a separate monthly commitment line only if dated amounts exist.

1. Display active round, target amount, confirmed commitments and next financing milestone with currency and last-update date.
2. Show investor opportunities by stage, with one-click filters to the directory rather than isolated numbers.
3. Surface overdue follow-ups and meetings in a five-item priority list with owner and due date.
4. Allow switching active rounds and opening a funding snapshot without changing any source values.

### Screen 2 — Investor Directory (Tracker)

**Composition:** Standard Vivid table, search/filters and pinned Details drawer; one company/person relationship per relevant contact.

**Chart / icon treatment:** No unnecessary chart; compact stage/status pills; optional number of funds per region by bar chart above table.

1. List funds/angels by name, sector interest, geography, estimated ticket range and assigned owner.
2. Link multiple professional contacts to a fund without duplicating its organization record.
3. Filter by investment stage, thematic fit, region, engagement status and source freshness.
4. Open Details to edit authorized contact fields, rationale and sources with exact Save/Ignore review.

### Screen 3 — Investment Pipeline (Pipeline)

**Composition:** Horizontal 5-stage Kanban on wide screens with an equivalent sortable list on mobile.

**Chart / icon treatment:** Use dark surface only for pipeline summary, semantic pills for decision stages; no decorative funnel.

1. Move an investor opportunity through Identified → Qualified → Contacted → Due diligence → Committed/Declined; retain dates and stage history.
2. Show proposed amount, decision owner, next action and expected close in each item; never present estimates as cash.
3. Allow creating opportunities from an existing fund and active round rather than cloning the fund.
4. Track blocked or stalled opportunities and filter by owner, priority or last-contact date.

### Screen 4 — Interaction Log (Form + tracker)

**Composition:** Single-column capture panel followed by reverse-chronological activity rows.

**Chart / icon treatment:** Small neutral channel icons (meeting/call/email); dates, not colored speech-bubble art.

1. Record contact, date, channel, summary, sentiment/response and source of the interaction.
2. Link each interaction to investor opportunity and optionally a professional contact.
3. Create a dated next action and responsible owner while preserving its link to the conversation.
4. Review the new activity record and related next-step change together before committing.

### Screen 5 — Follow-ups (Tracker + calendar)

**Composition:** One compact segmented view: Due now / Upcoming / Completed, with list as canonical representation.

**Chart / icon treatment:** Time-to-due bar (overdue, 7 days, later) with meaningful red/amber semantics.

1. Prioritize open actions by due date, owner, related opportunity and last interaction.
2. Record completion, outcome and next date; retain previous action history instead of overwriting it.
3. Support task creation from a pipeline card or interaction with a preselected investor link.
4. Show the next seven-day workload and an overdue view without any calendar integration.

### Screen 6 — Investor Research (ChatGPT research handoff + saved findings)

**Composition:** Source-backed research queue and a clear Prepare with ChatGPT action; dark-blue research summary card.

**Chart / icon treatment:** Mini bar of findings by topic; source and verification badges are neutral facts, not arbitrary confidence colors.

1. Define target investor criteria (sector, geography, fund stage, potential ticket, exclusions) using a saved form.
2. Present a reviewed ChatGPT research recipe that reads approved investor records and searches public sources.
3. Show collected, deduplicated findings with publication date, URL, relevance rationale and candidate match.
4. Offer explicit Approve additions/updates into Investor Directory; no unapproved scheduled scraping or outreach.

**ChatGPT research / synthesis recipe:** ChatGPT can discover investors, analyze public fund focus and draft internal call briefs; offer an optional recurring investor-signal review. Default manual launch, no outreach emails. Use existing investor IDs and source URLs; only enrich records within approved fields.

**Illustrative end-to-end user journey:** Founder defines a fundraise → adds fund records → logs a meeting → promotes an opportunity → sees revised pipeline/overdue actions → requests a research-backed investor brief.

**Acceptance cases:** A fund with three contacts appears once in fund counts; estimated verbal interest does not increase confirmed commitments; all pipeline stage changes carry actor/date; missing round target produces no spurious percentage.

**Future four-frame preview storyboard:** Financing KPI overview → investor directory with linked people → interaction/next-action form → stage funnel and approved research finding.

---

## BT-02 — Partnership Tracker (6 screens)

**Primary users:** Biotech CEO, BD director, licensing lead, alliance manager. **User job:** Identify and manage scientific/commercial partnering prospects and opportunities from first fit assessment to agreement handoff.

**Benchmark:** Inpart Deal / Inova Partnering — life-sciences partnership pipeline, evaluation and collaboration history.

**MVP boundary:** Partner fit, introductions, non-binding opportunities and agreement metadata. No mandatory external CRM, file-signing, deal-room or protected data share.

**Suggested UI identity:** Ocean accent (#175B94) with navy (#182C35) partner-opportunity hero and fine chain/network icon; all editable fields remain Vivid neutral.

**Proposed persistent records / fields:** Organization (therapeutic interests, deal history URL, region); Person (BD/contact); Asset/Program (modality, phase, nonconfidential indication); Opportunity (program, partner, fit score components, owner, stage, next step); Evaluation (science, strategic, geography, commercial, evidence, assessor); Meeting; Agreement Milestone (CDA, term sheet status, owner, date); Signal (source, date).

**Core measures and derivations:** Opportunities per stage and late-stage milestones; fit score = weighted user-entered criteria with visible weights, never generated silently as objective evidence.

### Screen 1 — Partnering Overview (Dashboard)

**Composition:** A dark partner-network hero card, two smaller pipeline stats and prioritized next decisions.

**Chart / icon treatment:** Horizontal stage count bars plus 12-month partnering activity sparkline.

1. Show total active opportunities, evaluation backlog, negotiation-stage deals and upcoming agreement milestones.
2. Display a stage funnel with counts and human-entered indicative values kept separate.
3. List top next actions by opportunity owner and the next seven-day meeting horizon.
4. Filter summary by development program, region and therapeutic area with click-through to source records.

### Screen 2 — Partner Directory (Tracker)

**Composition:** Company-oriented Vivid table with optional linked contact rows and resizable Details panel.

**Chart / icon treatment:** Compact coverage-by-indication bar; no fabricated market-map precision.

1. Store each organization once with disclosed therapeutic focus, geography, source and last verification.
2. Link a company's multiple contacts and multiple program-specific opportunities to one shared identity.
3. Filter by company type, therapeutic area, BD priority and past partnership outcome.
4. Update fit rationale/contacts using reviewed edits, retaining old facts and source observations.

### Screen 3 — Deal Pipeline (Kanban + tracker)

**Composition:** Card stages plus list alternative; stage history and next date visible on each card.

**Chart / icon treatment:** Accent-colored stage header only, not every card; subdued agreement icon.

1. Manage Identified → Qualified → Evaluating → Discussing → Negotiating → Closed/Inactive transitions.
2. Associate each deal with a partner, one program, primary owner, value estimate if available and next meeting.
3. Create stage-change notes and capture date/decision source rather than silently rewriting stages.
4. Identify opportunities without activity for 30 days and route to follow-up filters.

### Screen 4 — Opportunity Evaluation (Form + comparison)

**Composition:** Structured 4-dimension assessment panel, evidence links and side-by-side result table.

**Chart / icon treatment:** Four criterion bars (science, strategic, commercial, execution) and labeled missing-state cells.

1. Score scientific/technology match, portfolio fit, deal appetite and execution feasibility using explicit 1–5 criteria.
2. Record the reviewer, review date, rationale and supporting public or authorized sources per score.
3. Compare up to five partner opportunities using normalized, visible weights; distinguish not-assessed from zero.
4. Save a reviewed evaluation revision without changing another team's original company facts.

### Screen 5 — Meetings & Agreements (Tracker + timeline)

**Composition:** Two subsections on one screen: chronological meetings and agreement milestones.

**Chart / icon treatment:** Thin contract/clock icons and milestone ticks; red only for genuine overdue actions.

1. Record partner meeting summary, participants, agreed actions and due dates.
2. Track CDA/term-sheet/contract process as metadata/status, not as an e-signature or legal contract executor.
3. Link each milestone to opportunity, responsible party and target/actual date.
4. Filter follow-ups and unresolved blockers per partner while preserving historical events.

### Screen 6 — Partner Discovery (ChatGPT research + tracker)

**Composition:** Research scope form above a saved, source-linked candidate queue.

**Chart / icon treatment:** Dark research highlight card with restrained search icon; topic-by-topic count bar.

1. Specify program-specific partner fit, excluded organizations and geography before research.
2. Offer ChatGPT a current authorized partner list to avoid rediscovering existing companies.
3. Queue public partnering/funding/licensing developments with URLs, dates and rationale.
4. Review candidate company/opportunity additions, optionally offer an authorized ChatGPT recurring scan after end-to-end task capability check.

**ChatGPT research / synthesis recipe:** ChatGPT researches prospective licensees and competitor partnership announcements; offers written due-diligence briefs and optional recurring partner signals. Do not automatically disclose private asset dossiers to an external site.

**Illustrative end-to-end user journey:** BD defines program partnering objectives → discovers candidates → evaluates fit → records a discussion → tracks a CDA milestone → compares opportunities.

**Acceptance cases:** The same pharma partner can appear in several programs without duplicate organizations; evaluation score weights are visible; stage and agreement changes are audited; an unavailable public source is not presented as confirmed.

**Future four-frame preview storyboard:** Dark partner funnel → partner directory → four-axis evaluation form → score comparison and meeting timeline.

---

## BT-03 — Cash Runway (6 screens)

**Primary users:** CEO, CFO, biotech controller, project finance lead. **User job:** Forecast cash runway and test development/hiring/spend scenarios using manually maintained budgets and actuals.

**Benchmark:** Jirav — driver-based financial plans, forecast assumptions and scenarios.

**MVP boundary:** Management planning only, not general ledger, tax, payroll, purchasing or bank integration; all currency/units specified.

**Suggested UI identity:** Plum accent (#795094) for scenario selection; deep graphite-indigo (#2B3546) cash-balance card with outline trend icon; neutral white spreadsheet and chart sheets.

**Proposed persistent records / fields:** Cash Opening Balance (date, currency, source); Monthly Actual (period, department/program, category, amount, actual/forecast tag); Budget Line (period, category, planned amount); Expected Funding (date, amount, probability as explicit assumption, status); Scenario (name, baseline date, variable assumptions, version); Expense Driver (contractor cost, headcount run-rate, study spend); Report (period, cutoff, saved output).

**Core measures and derivations:** Net cash month t = opening cash + actual/forecast inflows minus outflows through month t. Runway = first projected month below a user-configured reserve threshold, with clear handling of no crossing. Scenario comparison always computes on identical cutoff/currency.

### Screen 1 — Financial Overview (Dashboard)

**Composition:** Deep-indigo cash card and two neutral financial metric cards; no hidden scroll.

**Chart / icon treatment:** Cash balance trend by month with actual solid / forecast dashed regions separated by a vertical cutoff.

1. Show opening cash, current calculated cash, recent monthly net burn and forecasted runway under selected baseline.
2. Flag data freshness (last actual month, forecast cutoff, missing expense categories) before displaying precise runway.
3. Switch reporting currency only when conversion assumptions are user-provided; otherwise retain source currency.
4. Jump from each metric to underlying actuals, budget or scenario assumptions.

### Screen 2 — Expense Tracker (Tracker)

**Composition:** Editable Vivid period-by-category table with search, amount formatting and receipt/reference fields.

**Chart / icon treatment:** Month-by-month spending bars grouped by program, with tooltips for category totals.

1. Record categorized manual expenses, period, cost center, program, amount, vendor and source.
2. Filter actual vs planned, program, month, recurring/nonrecurring and owner.
3. Provide import-ready structured entry forms, but never require accounting software.
4. Review edits and preserve old/new amount and source references in the field history.

### Screen 3 — Budget Planner (Tracker / grid)

**Composition:** Month columns for a selected 12-month window, readable horizontal scroller; details for assumptions.

**Chart / icon treatment:** Budget vs actual grouped bars, true zero baseline and currency axis.

1. Set budget envelopes by program/function, month and category.
2. Distinguish committed expenses, discretionary assumptions and contingent funding with explicit statuses.
3. Roll up authorized line items into monthly totals, leaving missing budget values unresolved rather than zeroed.
4. Surface overbudget months and trace differences to specific approved lines.

### Screen 4 — Scenario Builder (Interactive form + chart)

**Composition:** Left assumption controls, right comparison summary; labeled scenarios and save revision action.

**Chart / icon treatment:** Three clearly labeled projected cash lines (baseline, slower burn, accelerated trial), with common axes.

1. Clone a named baseline into a scenario without replacing committed actuals.
2. Edit 3–6 drivers such as hiring pace, CRO start delay, capital event, contractor spend or trial-cost timing.
3. Recalculate month-by-month cash and runway deterministically, displaying assumptions and formulas.
4. Save scenario revisions with owner and explanatory note; compare exactly up to three selected plans.

### Screen 5 — Cash Forecast (Visualization)

**Composition:** Full-width line chart with an 18–36 month selectable horizon and below-chart forecast table.

**Chart / icon treatment:** Solid actual / dashed forecast, subtle reserve threshold and red label for negative projected cash.

1. Plot cash at month end by scenario, with a clearly labeled actual/forecast boundary.
2. Mark planned funding dates and major assumed development investments as annotations.
3. Expose forecast shortfall month and reserve threshold in accessible text plus source-linked details.
4. Export/share the authorized summary view when supported; never imply real-time bank reconciliation.

### Screen 6 — Financial Briefing (ChatGPT report viewer)

**Composition:** Two-panel source metrics and saved narrative briefing; clear period and report status.

**Chart / icon treatment:** One miniature forecast chart beside a dark report cover and source links.

1. List historical monthly briefing versions, cutoff date, authorship and approval state.
2. Offer ChatGPT a structured request to analyze authorized forecast variances and assumptions.
3. Store a user-reviewed finance narrative with cited TrialAgents figures and identified financial risks.
4. Compare two reporting periods and highlight input/assumption changes, not invented market intelligence.

**ChatGPT research / synthesis recipe:** ChatGPT drafts variance commentary and scenario interpretation from authorized numbers, possibly monthly via a verified Task. Deterministic forecasting belongs in app calculations; never have an LLM invent financial amounts.

**Illustrative end-to-end user journey:** Controller enters opening cash and actuals → adds line-item budgets → adjusts hiring driver → compares cash forecasts → prepares board briefing.

**Acceptance cases:** A baseline scenario reproduces the same cash series after refresh; time windows and currency explicit; negative balances visible; months without inputs flagged; report figures match source forecast IDs.

**Future four-frame preview storyboard:** Dark runway metric → expense register → scenario input sliders/fields → forecast line and monthly briefing.

---

## BT-04 — Hiring & Resource Management (7 screens)

**Primary users:** Biotech COO, operations lead, functional heads and hiring manager. **User job:** Understand who is available, allocate effort across development programs and plan hiring without an ATS or HRIS.

**Benchmark:** Runn — resource schedules, utilization, placeholders and forecasting; simplified hiring tracker is a TrialAgents extension.

**MVP boundary:** High-level professional staff/candidate information and resource demand; no payroll, medical/leave data, protected candidate attributes or applicant tracking integrations.

**Suggested UI identity:** Ocean accent (#175B94) on planner/timeline; charcoal navy (#203643) team-capacity KPI with thin people/clock icons; white Vivid staffing tables.

**Proposed persistent records / fields:** Team Member (name, role, FTE, skills, availability, employment type, owner); Project (program, lead, status); Allocation (person/placeholder, project, time range, fractional FTE or hours); Role Request (role, justification, target start, budget band, approval); Candidate (contact/stage only, privacy controls); Hiring Decision; Capacity Scenario (assumptions, cutoff).

**Core measures and derivations:** Capacity = available hours/FTE for period; demand = assigned hours; utilization = allocated/available only when available >0; open roles = approved requests without accepted hires. Flag >100% allocations clearly.

### Screen 1 — Team Overview (Dashboard)

**Composition:** Dark capacity card, functional staffing split, upcoming hiring actions.

**Chart / icon treatment:** Supply-vs-demand grouped bars by function with above-capacity badges and zero baseline.

1. Display current FTE, committed allocation, unfilled role demand and over-capacity teams.
2. Filter by program, function, month and employee/contractor category.
3. Show five upcoming staffing decisions and recruitment deadlines.
4. Drill from a metric into people, allocations or role requests while respecting member permissions.

### Screen 2 — Team Directory (Tracker)

**Composition:** Editable Vivid table with role and availability fields; professional-card drawer.

**Chart / icon treatment:** Functional distribution horizontal bars above the list only when data is sufficient.

1. Maintain name, function, skill tags, contractual FTE and approved availability dates.
2. Link individuals to multiple projects without copying identity records.
3. Search skill and capacity needs; filter by location, employment type and function.
4. Keep candidate and employee restricted notes out of broad project dashboards.

### Screen 3 — Resource Planner (Timeline / allocation editor)

**Composition:** Week/month lanes by person and project; light timeline sheet with dark header summary.

**Chart / icon treatment:** Allocation blocks for projects using a stable 2–3 color key, amber for real conflicts.

1. Assign team members or anonymous future-role placeholders to projects with dates and hours/FTE.
2. Compare allocation totals to each individual's stated availability on the same timeframe.
3. Adjust allocation in reviewed edits with start/end and owner, preserving past revisions.
4. Switch person-centric and project-centric views and list fallback on mobile.

### Screen 4 — Capacity Forecast (Visualization)

**Composition:** Two panels: demand-vs-supply by month and role availability table.

**Chart / icon treatment:** Grouped bars by role and month, highlight shortage with text label; no ambiguous percent-only heatmap.

1. Project capacity and demand over 3/6/12 months from the saved allocation plan.
2. Identify roles with consecutive shortage periods, not merely one high-utilization day.
3. Trace each shortage to contributing projects and unfilled role placeholders.
4. Show scenario assumptions and avoid forecasting into months without recorded availability.

### Screen 5 — Hiring Requests (Form / approvals)

**Composition:** Simple justification form with explicit cost center and reviewer; no HR-system assumptions.

**Chart / icon treatment:** Status chips Pending/Approved/Deferred/Cancelled with approved semantic tones.

1. Request role, FTE, skills, rationale, target start date, salary/budget range and requester.
2. Link demand to programs and candidate allocation gaps.
3. Track internal review decision and decision comments with a logged actor and date.
4. Create a future capacity placeholder only after an explicitly approved role request.

### Screen 6 — Hiring Pipeline (Kanban / tracker)

**Composition:** Compact 5-stage candidate columns and secure details; counts by job request.

**Chart / icon treatment:** No photo/personality scoring graphics; neutral cards and stages.

1. Track open role requests and professional candidates in Sourced → Contacted → Interview → Offer → Closed stages.
2. Store candidate consent/source, recruiter owner, next step and limited interview outcome notes.
3. Filter stage/role/urgency without showing private candidate data to unauthorized viewers.
4. Capture stage actions with reviewed edits; never auto-send application emails.

### Screen 7 — Workforce Scenarios (Interactive visualization)

**Composition:** Scenario settings on left and capacity/cost chart on right; comparison table below.

**Chart / icon treatment:** Dotted forecast trend and labeled scenario series; no fake precision.

1. Create a baseline and up to two alternative hire-date/FTE scenarios.
2. Compare projected shortage months and high-level salary budget assumptions.
3. Save scenario revisions and distinct accountable assumptions without modifying actual staffing.
4. Offer ChatGPT an optional summarized staffing recommendation based on the saved scenarios.

**ChatGPT research / synthesis recipe:** ChatGPT can summarize cross-project resource risks and draft job descriptions; it may research public market salary benchmarks when asked. It must not screen applicants using protected attributes.

**Illustrative end-to-end user journey:** COO loads team → assigns project demand → sees an oversubscribed role → requests new headcount → compares hire-date scenarios.

**Acceptance cases:** Utilization denominator and leave/missing availability handled transparently; >100% conflicts visible; changing allocation doesn't edit the employee record; sensitive candidate fields remain scoped.

**Future four-frame preview storyboard:** Dark staffing KPIs → resource lane planner → role-request form → supply/demand chart.

---

## BT-05 — CRO Selection (6 screens)

**Primary users:** Biotech outsourcing lead, ClinOps director, finance controller and scientific evaluators. **User job:** Run sponsor-side CRO longlisting, RFP evaluation and a traceable shortlist or selection decision.

**Benchmark:** Bonfire — procurement/RFP evaluation criteria, comparable supplier responses and consensus scorecards.

**MVP boundary:** Decision support and evidence; no procurement ERP, signature, vendor payment or regulated supplier qualification attestation.

**Suggested UI identity:** Forest accent with dark-teal (#243B40) decision overview and fine checklist/contract icons; side-by-side scoring in bright white matrix.

**Proposed persistent records / fields:** Vendor Organization (region, therapy/service capability, reference source); Selection Project (study/program, procurement stage, key dates); RFP Requirement (mandatory flag, weight, priority); Proposal (vendor, price, timeline, assumptions, submitted date); Evaluation (criterion, reviewer, rating, evidence, rationale); Decision (shortlist, outcome, approvals); Clarification (owner, due).

**Core measures and derivations:** Weighted score = sum(weight × normalized rating)/sum(applicable weights), with missing assessments excluded and flagged. Cost vs capability compared separately; final award always explicit decision.

### Screen 1 — Selection Overview (Dashboard)

**Composition:** Dark selection progress card, checklist completion and supplier status count.

**Chart / icon treatment:** Milestone bar across intake/RFP/evaluation/award; vendor count by stage.

1. Show selected sourcing project, response deadlines, shortlisted CROs and evaluation completion.
2. Surface overdue clarifications, outstanding mandatory requirements and evaluator assignments.
3. Summarize cost ranges separately from qualitative scores using clearly labeled currency.
4. Jump to corresponding RFP, proposal or decision source record without duplicated stats.

### Screen 2 — CRO Directory (Tracker)

**Composition:** Vivid vendor master table and linked service tags; pinned Details and Source.

**Chart / icon treatment:** Competency-by-geography compact horizontal bar if relevant.

1. Store each CRO organization once with services, regions, therapy capability and contact roles.
2. Link CROs to selection projects through participation records rather than copying vendor fields.
3. Filter by study fit, geographic coverage, service line and evidence freshness.
4. Maintain confidential evaluations only on selection-project records, not public vendor master.

### Screen 3 — RFP Requirements (Form + tracker)

**Composition:** Sectioned RFP criteria builder followed by requirement table.

**Chart / icon treatment:** Requirements grouped by scope section with percentage weights in visible labels.

1. Create study brief and mandatory RFP criteria grouped by clinical, operations, quality, finance and technology.
2. Define reviewer, response format, mandatory status and score weight for each criterion.
3. Validate criteria weighting and log changes after an RFP has been published internally.
4. Track questions and clarifications with due date and responsible CRO contact.

### Screen 4 — Proposal Comparison (Comparison table)

**Composition:** Sticky CRO columns; responsive one-vendor-at-a-time alternative on mobile.

**Chart / icon treatment:** Side-by-side cost, timeline and capability cells, gray = not submitted; no judgmental color for price.

1. Register each bidder's proposed cost, service scope, start timeline and key assumptions.
2. Compare declared responses against identical RFP criteria and show missing answers.
3. Link to authorized proposal documents/notes rather than inventing document extraction.
4. Record clarification requests and resolve them with date and evidence.

### Screen 5 — Evaluation Scorecard (Interactive comparison)

**Composition:** Reviewer-specific score entry with aggregate result view; dark top-score chip optional.

**Chart / icon treatment:** Sorted horizontal normalized score bars with transparent formula/weight overlay.

1. Collect 1–5 reviewer scores with rationale per criterion and vendor.
2. Enforce mandatory/weighted criteria and flag incomplete reviews before ranking.
3. Show reviewer disagreement and the unweighted versus weighted result on request.
4. Publish a reviewed consensus shortlist without treating top numerical score as automatic award.

### Screen 6 — Selection Decision (Tracker + report viewer)

**Composition:** Compact decision record and signed-off-by metadata, followed by audit trail.

**Chart / icon treatment:** Simple two-column shortlist and next-step matrix, no extra decorative graph.

1. Document shortlist rationale, cost-quality tradeoffs and final vendor selection owner.
2. Record approval state, dates, criteria versions and decision meeting notes.
3. Track negotiation, follow-up, contract review and selected-vendor handoff tasks.
4. Prepare a ChatGPT narrative decision brief from saved scores and evidence, subject to approval.

**ChatGPT research / synthesis recipe:** ChatGPT can research CRO capabilities from public sources, summarize uploaded vendor proposals and draft a decision brief; it must distinguish public claims from verified bid responses. No automatic bidder outreach.

**Illustrative end-to-end user journey:** Outsourcing lead prepares selection → adds four CROs → receives manually entered proposals → reviewers score → leadership approves shortlist and decision.

**Acceptance cases:** Missing bidder responses do not receive zero score without explicit policy; criteria weights normalize correctly; score source/reviewer visible; private proposal data never appears in shared CRO directory.

**Future four-frame preview storyboard:** Dark RFP status dashboard → CRO comparison matrix → reviewer scoring form → ranked score bars and award rationale.

---

## BT-06 — Project Oversight (6 screens)

**Primary users:** Biotech CEO, PMO/project lead, cross-functional department heads. **User job:** Coordinate company development projects, deliverables, decisions and risk across teams without adopting enterprise PPM software.

**Benchmark:** Smartsheet — executive project dashboards, milestone views, dependencies and risk/action reporting.

**MVP boundary:** High-level program execution and accountable management reports, not a portfolio simulation suite or validated GxP task system.

**Suggested UI identity:** Plum/ocean contrast with dark graphite (#2B3546) project-health hero and small molecule/milestone glyph; muted phase timelines.

**Proposed persistent records / fields:** Project (objective, phase, sponsor, owner, RAG status); Workstream (function, project, lead); Milestone (baseline/current/actual date, dependency, status); Deliverable (owner, due, completion evidence); Risk/Issue (impact, probability, mitigation, owner); Decision (date, rationale, approver); Status Update (period, source, narrative).

**Core measures and derivations:** On-time rate uses milestones due in period; slippage = current due − baseline; health is an explicit accountable judgment, not an AI-generated clinical risk classification.

### Screen 1 — Portfolio Overview (Dashboard)

**Composition:** Dark health summary and two white portfolio charts; five-item priority action list.

**Chart / icon treatment:** Project status bars by phase; red/amber/green only for explicitly assigned health.

1. Show active development projects, overdue milestones, high-priority risks and near-term decisions.
2. Display roll-up by program, therapeutic area or department without leaking restricted project details.
3. Allow changing status cutoff and opening the underlying project/milestone.
4. Highlight missing status submissions, not falsely mark them green.

### Screen 2 — Project Directory (Tracker)

**Composition:** Vivid master table with open Details; project title and one-line objective.

**Chart / icon treatment:** Optional phase mix horizontal bars above table with neutral tones.

1. Store programs and cross-functional initiatives with owner, phase, dates, baseline budget and status.
2. Filter projects by lead, department, RAG health, phase and progress.
3. Link milestones, workstreams, vendors and risks to stable project IDs.
4. Edit current status and rationale through an approved update without losing baseline history.

### Screen 3 — Milestone Timeline (Timeline)

**Composition:** Gantt-like lanes by project/workstream, month zoom and today marker.

**Chart / icon treatment:** Baseline faint line, updated date colored point, slip annotation on each milestone.

1. Show baseline/current/actual dates per milestone in one legible timeline.
2. Display accountable owner, dependency, blocked status and critical upcoming handoffs.
3. Update projected dates with review while retaining reason and original baseline.
4. Drill to milestone details or related deliverables and support list/mobile fallback.

### Screen 4 — Deliverables (Tracker)

**Composition:** Vivid table with grouped project/workstream filters and concise edit drawer.

**Chart / icon treatment:** Task progress by workstream in small bars; no chart at all if only a few tasks.

1. Record output, responsible owner, target/actual completion, evidence link and status.
2. Filter by overdue, due soon, blocked, owner and function.
3. Create linked subtasks/checklist only when genuinely needed for an important deliverable.
4. Surface change history and actual evidence before marking completed.

### Screen 5 — Risks & Decisions (Tracker + form)

**Composition:** One screen with two segmented lists (risks/issues and decisions), not two extra apps.

**Chart / icon treatment:** Impact × likelihood matrix only when scores are explicitly supplied, otherwise sorted status list.

1. Log risk/issue, probability, severity, owner, mitigation and next review.
2. Capture decisions with option summary, approved outcome, date and decision owner.
3. Escalate overdue mitigation or open decision using an explicit priority/status field.
4. Preserve closure evidence and access-limited sensitive internal notes.

### Screen 6 — Management Reports (ChatGPT report + archive)

**Composition:** Period switcher, source metrics summary and saved report cards; dark briefing cover.

**Chart / icon treatment:** Milestone changes and open risk count by period, followed by narrative with source links.

1. Collect approved status updates from project owners into one reporting cutoff.
2. Provide ChatGPT a permitted snapshot for concise weekly/monthly leadership synthesis.
3. Review and save the narrative with report date, contributor and cited project records.
4. Compare report periods to show resolved/slipped deliverables and net change in risk, with manual fallback.

**ChatGPT research / synthesis recipe:** ChatGPT can analyze cross-functional issues, draft management reports and optionally summarize authorized weekly updates via Tasks once plugin execution is verified. No external project-sync requirement.

**Illustrative end-to-end user journey:** PM creates program/workstreams → team updates deliverables → milestone slips → risk is logged → management report identifies next actions.

**Acceptance cases:** A milestone changing its current date never deletes its baseline; restricted projects don't contribute identifiable details to unauthorized dashboards; no phantom trend from missing update periods.

**Future four-frame preview storyboard:** Dark portfolio health summary → milestone timeline → risk decision entry → approved management report.

---
