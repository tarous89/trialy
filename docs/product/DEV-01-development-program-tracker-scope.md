# DEV-01 — Development Program Tracker: evidence-based candidate specification

**Status:** Proposed product scope for discussion, **not implementation approval**.  
**Research date:** 20 October 2026.  
**Related:** [Four-section catalog](README.md), [clinical development planning section](01-clinical-development-planning.md), [active platform scope](../../README.md), [write-authorization contract](../WRITE_AUTHORIZATION.md).

## 0. Evidence standard, positioning and limits

This document proposes an initial **ChatGPT-created, configurable development-program tracker** based on real software product interfaces, customer case studies, independent reviews and practitioner requests. A "default" below means a **suggested starter configuration only**. Do not add hardcoded clinical tables, mandatory program fields, fixed UI modules, regulated workflow rules or automatic database writes to TrialAgents's foundation. The current TrialAgents repository scope takes precedence.

**What is validated:**
- [S1] **Precision BioSciences / Smartsheet customer case study (2025, PDF)** — a lean (fewer than 100 employees) clinical-stage gene-editing sponsor uses cross-functional Research, Regulatory, Clinical and manufacturing-related planning; linked timelines, dependencies, milestones, resource management and dashboards. Their program manager describes replacing siloed function-by-function timeline grids, management visibility into IND readiness, and resource-overload alerts. https://pt.smartsheet.com/sites/default/files/2025-12/Precision%20BioSciences%20Case%20Study.pdf
- [S2] **Smartsheet / Philips clinical operations customer story** — project initiation/intake form, field standards, portfolio phase and traffic-light status, program dashboard and drill-down; **enterprise medtech organization, not representative of a biotech startup**. https://www.smartsheet.com/customers/philips
- [S3] **Kivo life-sciences project-management product** — projects with tasks, assigned users, start/end dates, checklists, dependencies, document links, Gantt/Kanban views, status reports; can complete a task when associated documents are approved. This is vendor-documented functionality, not evidence of use of every feature by a small sponsor. https://kivo.io/solutions/dms-project-management
- [S4] **Kivo verified G2 review** — Senior Manager of Regulatory Strategy at a pharmaceutical company of approximately 35 employees used Kivo daily for 15+ programs to coordinate documents, regulatory work, reviews and submissions; other small-business executives describe using Kivo to coordinate complex projects. **The specific reviewer did not say they use all of Kivo's newer PM features**, so do not attribute that to them. https://www.g2.com/products/kivo/reviews
- [S5] **Planisware pharmaceutical industry product + screenshots** — product/indication and phase-based R&D portfolio, clinical/regulatory/CMC roadmap lanes, decision milestones, approved versus current plan dates, project health, and resources. https://planisware.com/industries/pharma and https://planisware.com/planisware-pharmaceutical-and-medical-devices-organizations
- [S6] **Planisware Enterprise verified G2 reviews** — pharmaceutical mid-market review highlights progress visibility, PM status updates and SharePoint visualization exports; other customers value stage-gate approvals and Gantt, while criticizing complexity and training burden. Most reviews are from larger firms. https://www.g2.com/products/planisware-planisware-enterprise/reviews
- [S7] **Planview Advisor pharma product/screenshots** — development candidate portfolio roadmaps, phases and therapeutic areas; prioritization, investment scenarios, reviews, risk/cost/value model and historical changes. **Mostly large-company evidence**; its advanced valuation/simulation is not part of this tracker. https://www.planview.com/products-solutions/products/advisor/ and https://www.planview.com/resources/articles/pharmaceutical-portfolio-management-a-complete-primer/
- [S8] **Practitioner discussion (r/biotech)** — users report Smartsheet, Microsoft Project, monday.com, Jira, OnePager and PowerPoint, particularly executive timelines; anecdotal and not a representative survey. https://www.reddit.com/r/biotech/comments/1dhku8t/what_tools_do_you_use_for_project_management/
- [S9] **Small pharma startup practitioner discussion (r/projectmanagement)** — self-described seven-person pharma startup uses Smartsheet for basic project management and Office Timeline Pro for presentations; commenter values confidentiality and data protection. Anecdotal. https://www.reddit.com/r/projectmanagement/comments/ou41r4
- [S10] **Smartsheet life-sciences clinical PMO product screenshots** — hierarchical plans including project kickoff, discovery, preclinical, IND and later phases; owner, task, status, start, finish, health and executive dashboard with project/RAID sections. Marketplace solution screenshot, not a confirmed independent customer. https://www.smartsheet.com/marketplace/apps/clinsheets-clinical-pmo-built-smartsheet

**Strongest sponsor-specific evidence:** S1. **Small pharma direct evidence:** S4 and S9. **Enterprise benchmark, not a small-biotech purchasing proxy:** S2, S5–S7.

### Product screenshots inspected (design references, not assets to copy)

- Planisware pharma program roadmap: https://planisware.com/sites/default/files/2025-08/IMG%2027.png — multi-program bars by phase with diamond decision milestones.
- Planisware multi-level planning: https://planisware.com/sites/default/files/2023-06/Multi-level%20Planning.jpg — program, regulatory and CMC workstreams on a synchronized time axis.
- Kivo Gantt/Kanban interface: https://kivo.io/hs-fs/hubfs/Optimized%20Images%202024/Blog/newsletter_may2024_step42.webp — tasks grouped by workflow stage, dependencies and schedule.
- Smartsheet clinical PMO plan: https://www.smartsheet.com/sites/default/files/2023-11/bespoke_clinical_trial_project_schedule.png — work-breakdown plan with owner/status/start/finish/health.
- Smartsheet clinical PMO dashboard: https://www.smartsheet.com/sites/default/files/2023-11/accurate_automated_status_reports.png — project identity, plan, team, tasks and risk/issue/action metrics.
- Planview pharma timeline: https://media.planview.com/wp-content/uploads/2023/05/screenshot_product-advisor-2-1200px-1024x576.png — candidate rows grouped by therapeutic area with dated stage information.

## 1. Job to be done and target users

**User intent:** "I manage one or more drug-development programs and want a reliable place to see what each program is trying to achieve, where it is in development, who is responsible, what decisions and milestones come next, what has changed, and which documents substantiate the status — without reconstructing separate spreadsheets and slides."

| Person | Why they need it | Evidence and caveat |
| --- | --- | --- |
| Program / Project Manager | Own connected plans, follow up dependencies, consolidate functional updates, present executive status | **Direct S1**, S6, S8 |
| Clinical Operations Director / clinical team lead | See upcoming studies and decisions, follow program dependencies, maintain realistic cross-functional commitments | Target sponsor user; supported by **clinical-workstream use S1** and clinical operations usage S2, **not yet directly verified as a startup buyer of a dedicated program tracker** |
| CMO / Head of Clinical Development | Review program phase, key gates, objectives, blockers and cross-program roadmap | Decision/executive workflow supported by S1, S5, S7; purchasing and frequency at tiny biotechs **to validate** |
| Regulatory lead / CMC lead / functional contributors | Update their own milestones, dependencies and linked documents; report readiness into shared program view | S1, S3, S4, S5 |
| CEO / COO / portfolio reviewer | Read a concise cross-program dashboard and evidence-backed decisions without editing functional schedules | S1, S2, S5–S7; user role at specific small-biotech customers **not individually confirmed** |

**When:** May start with a single preclinical asset or intended development project; persists into clinical phases and across multiple assets/projects. A small sponsor with just one asset still benefits from workstream and upcoming-milestone visibility. Do not create clinical studies, CROs or sites unless the actual task calls for those records.

**Granularity boundary:** Do not assume asset = indication = program = study. For some organizations, one asset may have several indication-specific programs or multiple studies. On setup, let the user choose "What does one program represent in your organization?" and adapt relationships. TrialAgents's platform **project** remains the stable organizing concept; only user-authorized task-specific fields/relationships are proposed. No forced duplicate "Project" entity.

## 2. Minimal onboarding experience

Suggested ChatGPT exchange:

1. **Prompt:** "What development program do you want to track?" Proposed record with a name is enough; everything else can start blank.
2. **Optional context:** "Which candidate/asset and indication(s) does it cover, and where is development currently?" If unclear, offer Unknown/unset rather than infer a clinical phase.
3. **Owners:** "Who coordinates the program, and which teams or vendors are supplying updates?"
4. **Milestones:** "What are the next one to three meaningful milestones or decisions, and their target dates?" Option to import an existing plan/spreadsheet/document **for extraction as a preview only**.
5. **Proposal:** Show proposed data types/relationships, exact suggested fields, sources, included entries and permissions. Save only after reviewed approval. Declining optional fields must not block creation.
6. **Open:** Show a simple program summary and task-appropriate views; users can modify views and fields conversationally.

## 3. Suggested default **program-level fields**

One row represents a user-defined development program; program data must be distinct from child milestones and source files. "Prompt" is user-facing fill-in language, not a forced onboarding interview.

| Key | Label | Fill-in prompt | Suggested value type / options | Suggested visibility | Evidence |
| --- | --- | --- | --- | --- | --- |
| P01 | Program name | "What should we call this development program?" | Required-to-identify **short text** (the only starter field that must have a value to create a named program) | Portfolio first column, title on program detail | S1,S5,S7 |
| P02 | Candidate / asset | "Which drug candidate or development asset does this program concern?" | **Link to existing asset record or text** if no asset catalog exists; may be blank | Portfolio and program header | S1,S5,S7 |
| P03 | Therapeutic area / indication | "Which disease area or indication(s) is this program targeting?" | **User-defined single/multi-choice or linked indication records**; avoid fixed disease taxonomy | Portfolio filter, grouped roadmap | S5,S7 |
| P04 | Development stage | "At what development stage is the program currently tracked?" | **Optional select** with editable examples: Discovery, Preclinical, Phase I, Phase II, Phase III, Filing/Registration, Other, Unknown. User can use more granular or parallel phases | Portfolio stage pill, pipeline grouping and roadmap | S1,S5,S7 |
| P05 | Program lifecycle status | "Is the program being planned, active, on hold, finished, or stopped?" | **Optional editable select**: Proposed / Active / On hold / Completed / Discontinued / Unknown; separate from development stage | Portfolio status column and filter | S5,S6,S10 |
| P06 | Program owner | "Who is responsible for coordinating updates and decisions for this program?" | **Person reference** (user/member or permitted contact), optionally free-text pending match | Owner avatar/name, assignee filter | S1,S3,S10 |
| P07 | Primary program objective | "What is the next development objective this program is working toward?" | **Short or long text**; no AI-generated scientific claims | Program summary; short excerpt in portfolio detail | S1,S7 |
| P08 | Program health | "How would the responsible team describe the program today?" | **Optional manual select**: On track / Needs attention / Delayed / Unknown; optional accompanying reason. Not automatically equated to clinical success | Compact health indicator with tooltip/explanation | S2,S5,S10 |
| P09 | Planned program start | "When was this program originally planned to begin, or when did it begin?" | **Date** with explicit planned/actual meaning chosen by user; can be unset | Program timeline start | S3,S5,S10 |
| P10 | Baseline end / major gate target | "What was the approved target for the program's next major stage gate or planning horizon?" | **Date reference/linked milestone**; do not duplicate a milestone date if one exists. A simple date is allowed for a first setup | Timeline baseline marker and detail | S5,S7,S10 |
| P11 | Current forecast for that gate | "Based on the current plan, when do you now expect that major gate?" | **Date or linked forecast milestone**; preserve P10 as baseline and history for date changes | Timeline forecast marker and delay delta | S5,S6,S7 |
| P12 | Workstreams / functions | "Which teams or workstreams contribute to this program?" | **Linked workstream records or editable multi-choice** (examples: Research, Nonclinical, Clinical, Regulatory, CMC/Manufacturing) | Program detail lanes, functional filter | S1,S3,S5 |
| P13 | Key program evidence | "Which current plan, presentation, protocol or other source document should people consult for this program?" | **Document/asset reference or external file URL + version/metadata**; permission filtered | Document/source section on detail | S3,S4,S9 |
| P14 | Status rationale / latest update | "What changed, what is currently blocking progress, and what should reviewers know?" | **Text plus observation date/source**; changes to factual status remain traceable | Detail summary and latest update preview | S1,S2,S6 |
| P15 | Last confirmed update | "When was this program last updated?" | **Derived system timestamp** from committed relevant records. **Not a fill-in input.** | Portfolio freshness label | S1,S2,S6 |

**Defaults versus optional expansion:** P01 is the only necessary starter input; P02–P14 are proposed based on task/context and may be omitted. P15 is derived. Do not require the user to complete an entire 14-field form before using the tracker.

**Special note on dates:** A program's phase and dates can vary by indication/study. If they do, move phase/gates into linked workstream or study records instead of falsely treating a program-level value as universally true. Forecast dates never silently overwrite approved baselines.

## 4. Linked child records — small but essential

A **program row alone** cannot reproduce the multi-function timeline and milestone evidence in S1, S3 and S5. Offer these related trackers when the task requires more than an executive list, without adding a rigid domain model.

### 4A. Milestones / decisions (suggested initial child tracker)

| Key | Label | Fill-in prompt | Value type | Visual |
| --- | --- | --- | --- | --- |
| M01 | Milestone / decision title | "What needs to happen or be decided?" | Short text | Milestone list, roadmap label |
| M02 | Program | "Which program does this belong to?" | Link to platform project/program context | Grouping/filter |
| M03 | Workstream | "Which team or workstream owns it?" | Optional workstream link/select | Timeline lane |
| M04 | Category | "What kind of milestone is it?" | Editable choice, e.g. operational / regulatory / clinical / CMC / decision gate / other | Roadmap marker shape/label |
| M05 | Owner | "Who is accountable for updating or completing it?" | Person/member reference | Avatar/assignee |
| M06 | Target date (baseline) | "What was the agreed target date?" | Date | Hollow/outlined baseline marker |
| M07 | Forecast date | "When is it currently expected?" | Date | Current marker; forecast-vs-baseline delta |
| M08 | Actual completion | "On what date was this actually completed?" | Optional date | Completion marker and history |
| M09 | Status | "Has it started, is it progressing, blocked, under review, or completed?" | Editable single choice | Status in grid and optional Kanban |
| M10 | Dependencies | "Which earlier milestones or work items must finish first?" | Links to other visible records; reviewed dependency changes | Gantt connector / dependency list |
| M11 | Supporting evidence | "Which document, source, approval or note supports this update?" | Document/version link + optional note | Detail panel |
| M12 | Change explanation | "Why has the target, forecast or status changed?" | Optional text/source | Change log/detail |

**Derived read-only values:** variance in days = forecast date minus baseline where both exist; overdue = current date later than planned/forecast and milestone incomplete (label which date rule is chosen); upcoming milestones = filtered dated rows. Missing dates never count as overdue. No automatic slide of dependent dates until approved user action.

### 4B. Workstreams (optional; not fixed tabs)

| Key | Prompt | Value |
| --- | --- | --- |
| W01 | "What is this function/workstream called?" | Short text, linked to current program |
| W02 | "Who coordinates this workstream?" | Optional person link |
| W03 | "What are this workstream's near-term deliverables or milestones?" | Links to child M-records, not duplicate text |
| W04 | "What is the latest status/constraint for this team?" | Optional status plus dated note |
| W05 | "Which source or work plan supports these updates?" | Permissioned file/reference |

Do not require Clinical, CMC, Regulatory or Research lanes for every program; suggest them only when the plan/evidence includes such workstreams (S1,S5).

### 4C. Decision history (optional if a milestone with supporting notes suffices)

For an organization using formal stage gates, store a linked, append-only decision *record* with: **question**, **reviewer/decision owner**, **due date**, **actual decision**, **decision date**, **rationale/evidence** and **follow-up**. These should be filled by responsible users or proposed from authorized source documents. A preliminary hypothesis is not an approved go/no-go decision. Supported by Planisware/Planview decision-gate capabilities (S5–S7); whether the small-biotech user needs a separate decision table remains **unvalidated**.

### 4D. Resource commitments (deferred/optional)

S1 confirms tracked staff hours, workloads and allocations, with >100% utilization alerts. Offer a lightweight optional **person/workstream/program/week, planned effort, actual effort, capacity** linkage when requested. **Do not** show invented FTE forecasts from merely adding a program and do not include enterprise resource-optimization algorithms in DEV-01.

## 5. Visualizations: initial suggested surfaces

| View | Default? | Layout / interaction | Source evidence |
| --- | --- | --- | --- |
| **Program portfolio table** | Yes | Name, asset, indication, stage, lifecycle status, owner, next milestone/date, health, freshness; filters by status/phase/owner and inline reviewable edits | S1,S2,S5,S6 |
| **Program detail (one-page overview)** | Yes | Objective, current stage/status/owner, next 3 dated milestones, workstream status, document links, latest rationale; drill into records without a giant expanding sheet | S1,S3,S4,S5 |
| **Program roadmap / timeline** | Yes, once >= 2 dated milestones | Programs as rows; phase/date intervals where available; milestone points; expanded child lanes by function. Show baseline vs forecast differences and current date. No invented dates/phase boundaries | S1,S5,S7,S10 |
| **Milestone table and status board** | Yes, once milestones exist | Editable list with owner, target/forecast, status, dependencies, supporting documents; optional Kanban for human-defined statuses | S3,S10 |
| **Executive portfolio dashboard** | Optional by default (particularly if multiple programs) | Active/held programs, nearest gates, upcoming 30/90-day decisions, delays by stated rule, program-health distribution, last updates; clickable drill-down | S1,S2,S5,S7 |
| **Workstream/Gantt** | Optional when tasks/dependencies exist | Functional lanes, due dates, dependencies, drill-down; no automatic critical path promise without supporting scheduling logic | S1,S3,S5 |
| **Resource availability** | Opt-in only | Estimated effort/capacity by team over time, backed by explicit entered hours or integration | S1 |

**Default design behavior:** Users can choose/update fields, filters, grouping, status labels and visualizations; no fixed 14-column mandatory screen. Short rows, clear dates, simple edit paths, accessible detail screens; show source links, status freshness and missing data. Align with [interface rules](../INTERFACE_RULES.md).

## 6. Candidate workflows with safeguards

| Trigger / user prompt | Result | Authorization / failure condition | Evidence |
| --- | --- | --- | --- |
| "Start tracking program X" | Propose program setup, allowed fields, optional first milestones and links | Exact setup preview; explicit approval before first saved record | S1,S2,S3 |
| "Update program status from this slide/email" | ChatGPT extracts candidate changes, checks record identity, displays sources and before/after diff | No silent write; respect owner/AI rights and record versions; require approval except explicit data-type grant | S1,S4,S6 plus TrialAgents authorization |
| Milestone forecast approaches or passes | Compute upcoming/late status; prepare reminder or escalation suggestion | User-configured thresholds; scheduling/job availability; outgoing provider action requires separate grant | S1,S2,S3 |
| One milestone date changes | Show affected visible dependency chain and **proposed** downstream date changes | Do not rewrite agreed baselines or downstream dates silently; review before commit | S1,S3,S5 |
| Linked document review becomes approved | Propose corresponding task/milestone completion, with version evidence | Actual approved document state must be trusted, not inferred from filename; data change approved/granted | S3 |
| Regular executive review requested | Show changes since last snapshot; report risks, phase, gates and owners with sources | Permission-limited; snapshot marked current-as-of date; no fabricated updates | S1,S2,S5,S6 |
| Resource time/capacity is added | Derive utilization alerts from actual numbers | Optional data collection; no guessed FTE/time; respect sensitive employment data permissions | S1 |

No provider-side actions, background monitoring of all conversations, automatic emails, notification delivery or broad AI data maintenance are promised here: live integrations and host acceptance remain outstanding [per the development roadmap](../../DEVELOPMENT.md).

## 7. User flows and examples for later acceptance

1. **Seven-person startup, first program:** owner creates one named program and a few dated milestones; no setup tax for missing finance data or unknown phase. Program appears in a portfolio grid and shows next milestones.
2. **Clinical-stage, fewer than 100 employees, cross-functional program:** program manager links clinical, regulatory and manufacturing workstream updates; reviewer sees dependencies and reasons for missed gates without opening separate files (S1).
3. **CMO with several programs:** reader filters by near-term decision dates, clicks a flagged program to inspect owner, dates, rationale and source, and requests a current-as-of management summary (S1,S2,S5).
4. **Document-driven progress:** reviewer accepts an approved-document event and sees a proposed milestone-status change, with both document version and separate write authorization (S3).
5. **Stale/uncertain plan:** different sources claim different dates; TrialAgents preserves originals and competing observations, shows provisional/uncertain values, and asks before selecting a preferred forecast.
6. **Approval/permission failure:** generated UI may stage but cannot commit a change; unauthorized reader cannot see hidden source text or call external send operations; stale record versions fail safely.

These are **acceptance scenarios to design**, not claims the current plugin already passes them.

## 8. Explicit non-goals and overlaps

- **DEV-01 is portfolio-level coordination**, not the detailed study readiness / protocol planning scope (DEV-02), which can be linked later.
- No built-in drug pipeline intelligence, safety/efficacy assessment, PTRS probabilities, Monte Carlo, NPV/enterprise resource optimization, or program scientific recommendation engine (S5,S7 illustrate these **other** products, not this proposed tracker).
- No patient information, recruitment, safety cases or EDC.
- No formal regulatory filing, regulator submissions, validated eTMF/eQMS/Part 11 sign-off claims.
- No mandatory drug asset ontology, hardcoded therapeutic-area vocabulary, fixed clinical workflow, automatic cross-customer data union, or independent background source monitoring.
- No fixed contract or procurement functionality in this first scope; related OUT and OPS use cases can link to a program when users actually request them.
- Do not duplicate an existing TrialAgents project entity merely to satisfy a template; inspect/reuse authorized records and preserve shared IDs.

## 9. Unresolved decisions before implementation

- Is **one program** defined by asset, indication, planned study or an explicit internal portfolio grouping for the first test customer?
- Which **3–5 columns** should show before horizontal scroll and what counts as a meaningful program health summary?
- Does the starter need both baseline/forecast program-level dates, or only milestone-level dates with computed summaries?
- Which source systems (SharePoint/Drive, spreadsheets, email, existing PM software) are actually authorized and technically integrated?
- Should stage-gate decisions and staffing commitments start in the tracker or be created only on demand?
- Which early-stage sponsor persona will test the first end-to-end workflow, and what measures distinguish it from Smartsheet?
- How should reporting and field views behave within current bounded \`frontend-js\` capabilities and separate trusted approvals?
- Confirm data-access/retention and regulated-use policy before customer reliance.

**Research conclusion:** The first useful program tracker is **not** a CRM-like 20-field intake form. Evidence most strongly supports (a) program + phase/owner/status, (b) related milestones and cross-functional dependency tracking, (c) integrated supporting documents, and (d) simple roadmap and management views. Offer resource and financial depth only with validated inputs and user demand.
