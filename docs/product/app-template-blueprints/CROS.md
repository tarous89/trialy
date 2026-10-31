# CRO applications — detailed candidate screen scope

**Current platform contract (1 November 2026):** follow the [shared build contract](DESIGN_AND_BUILD_CONTRACT.md#6-app-access-chatgpt-and-scheduling-contract) for optional section access, unified Automations, shared ChatGPT research setup, TrialAgents email, failure isolation and template documentation. References to a Task in these candidate recipes describe optional ongoing work, not a separate host task per app. None of these candidates is marked implemented by this update.

**Status: planning only.** Six applications for CRO business development, study delivery, feasibility and project reporting. Distinguish CRO **bid response** from sponsor-side RFPs; client-specific data remains confidential while common organization/PI records can be reused under access rules. See [shared Vivid design and data/AI contract](DESIGN_AND_BUILD_CONTRACT.md). No mandatory external business app integration or patient data.

## CR-01 — RFP Management (6 screens)

**Primary users:** CRO business development, bid manager, medical writing/proposals, finance and executive approvers. **User job:** Receive sponsor RFPs, coordinate responses, reuse approved material and submit a consistent bid manually.

**Benchmark:** Loopio — RFP response assignments, reusable content, completion management and proposal review.

**MVP boundary:** CRO **bid response** workflow, not sponsor vendor selection. No automatic RFP inbox parsing, email send, electronic proposal submission, corporate document sync or e-signature.

**Suggested UI identity:** Plum accent (#795094), deep-indigo (#332B41) bid-deadline hero with document/check icon, light response tables and progress bars.

**Proposed persistent records / fields:** Sponsor Organization/Contact; RFP Intake (sponsor, study scope, date received, due, decision); Requirement (section, question, priority, owner); Answer (text, source/approved-version, updated time); Content Library (topic, approved reusable text, owner, effective version); Cost Assumption (amount, unit, finance reviewer); Internal Review (reviewer, decision); Bid (stage, expected value, delivery status).

**Core measures and derivations:** Question completion = accepted answers / applicable RFP questions; proposal readiness requires mandatory answers and approvals complete; win rate only from decided bid records over stated window.

### Screen 1 — Bid Overview (Dashboard)

**Composition:** Dark nearest-deadline card plus activity and bid value summaries.

**Chart / icon treatment:** Horizontal pipeline by stage; response-completion bars by RFP with explicit due dates.

1. List active RFPs by priority, due date, sponsor, stage and accountable owner.
2. Show proposal completion, internal reviewer backlog and any overdue requirements.
3. Separate estimated deal value from booked revenue or contracted awards.
4. Open the urgent bid/requirement directly from a KPI or deadline.

### Screen 2 — RFP Intake (Form + tracker)

**Composition:** Four-section form at top and compact searchable intake list below.

**Chart / icon treatment:** Minimal document icon on dark summary tile; no chart for intake.

1. Capture sponsor professional contact, project scope, requested services, country coverage and due date.
2. Link sponsor organization and a possible study/project to existing authorized records.
3. Log bid/no-bid decision, rationale, approver and decision date.
4. Attach or reference RFP document text for authorized ChatGPT extraction but save only reviewed structured fields.

### Screen 3 — Requirements Matrix (Tracker)

**Composition:** Vivid question/section table with assignee, source and editable response status.

**Chart / icon treatment:** By-section readiness bars, not ungrounded “quality scores.”

1. Create a one-row-per-question register including topic, mandatory flag, source section and owner.
2. Assign subject matter experts and internal due dates for answers.
3. Track Not started → Drafted → Reviewed → Approved, with return-for-revision rationale.
4. Filter unanswered mandatory questions and carry them into a realistic task queue.

### Screen 4 — Response Library (Document/record library)

**Composition:** Searchable approved-answer table and Details showing original text, version and context.

**Chart / icon treatment:** Category count bar only when library has enough entries.

1. Store reusable text snippets linked to service, therapeutic area and approved author/version.
2. Search and compare candidate content before applying it to a new RFP.
3. Copy an approved snippet into an RFP draft as a new draft answer, never silently modify canonical library text.
4. Record approval/expiry/review date and stale-content warnings.

### Screen 5 — Proposal Review (Tracker / approvals)

**Composition:** Section review checklist with reviewers and evidence; one approval strip.

**Chart / icon treatment:** Reviewer completion horizontal bars and deadline rail.

1. Capture scientific, operations, QA, legal and finance review gates as configurable requirements.
2. Assign review owners, due dates, comments, rework status and final approval.
3. Track commercial assumptions as explicit versioned inputs.
4. Prevent marking a bid Ready until mandatory reviews are recorded as accepted.

### Screen 6 — Proposal Preparation (ChatGPT drafting + report)

**Composition:** Draft sections/revision history panel with clearly identified ChatGPT handoff.

**Chart / icon treatment:** Dark report-cover preview and readiness checklist, no fake file editor.

1. Prepare a ChatGPT request using permitted RFP questions and approved response library content.
2. Queue returned narrative sections with source-answer references for human verification.
3. Save reviewed bid narrative and final handoff checklist with version and accountable owner.
4. Record submission date and outcome manually; never automatically send the proposal.

**ChatGPT research / synthesis recipe:** ChatGPT reads uploaded RFP text, clusters questions, drafts nonbinding answers from approved content, flags gaps and prepares a bid summary. No autonomous external sending.

**Illustrative end-to-end user journey:** BD logs sponsor RFP → assigns question owners → writers reuse approved answer text → reviews close → ChatGPT drafts final response → team records submission.

**Acceptance cases:** Sponsor-side bid/response not confused with supplier sourcing; unapproved library text excluded from final draft; response status count reconciles with question data; no unreviewed outward disclosure.

**Future four-frame preview storyboard:** Bid deadline hero → requirements matrix → reviewer approval/checklist → final proposal-readiness report.

---

## CR-02 — Resource Planning (6 screens)

**Primary users:** CRO operations director, resource manager, study delivery leads, PMO. **User job:** Allocate CRAs, project managers, clinical data staff and other roles across active sponsor projects.

**Benchmark:** Certinia Professional Services Cloud — services-oriented resource scheduling, capacity demand and utilization forecasting.

**MVP boundary:** Resource coordination and high-level effort/cost assumptions; no HRIS, timesheet payroll sync, individual patient information or workforce evaluation scoring.

**Suggested UI identity:** Ocean accent (#175B94), dark navy (#203643) delivery-capacity card and clock/person icon; restrained allocation Gantt and bar charts.

**Proposed persistent records / fields:** Professional Staff Member (role, FTE/capacity, skills, region, availability); CRO Project (sponsor, service scope, dates); Role Demand (role, hours, project, period); Allocation (staff/placeholder, demand, hours, start/end); Work Record (period, project, approved effort); Capacity Scenario (hiring/freelance assumption, cutoff).

**Core measures and derivations:** Utilization = scheduled hours / recorded available hours for period; demand gap = required – allocated; planned vs actual work only on matching units, projects and windows.

### Screen 1 — Resource Overview (Dashboard)

**Composition:** Dark overall utilization/overbooking card, short role-gap list.

**Chart / icon treatment:** Group demand/supply bars by role and month with amber oversubscription labels.

1. Show team availability, allocated hours and unassigned project demand by reporting month.
2. Filter by team, role, geography, therapeutic specialty and sponsor project.
3. Surface upcoming project starts and critical capacity shortages.
4. Trace each shortage to unfilled project demand rather than generic estimates.

### Screen 2 — Resource Directory (Tracker)

**Composition:** Vivid professional roster table and searchable role/skills/details.

**Chart / icon treatment:** Role distribution chart as sorted horizontal bars when relevant.

1. Maintain staff role, skill set, region, availability, full-time equivalent and contract type.
2. Link each individual to multiple project allocations through separate records.
3. Filter competency and upcoming availability without showing private HR information.
4. Edit authorized capacity/role changes with expected date and retained original value.

### Screen 3 — Project Demand (Tracker)

**Composition:** Role-by-study demand table with current forecast and separate requested/approved state.

**Chart / icon treatment:** Demand by study stacked bars with legend and units.

1. Define each study phase's role requirements and hours/FTE by month.
2. Track request owner, start/end window, criticality and approval state.
3. Compare forecast demand with assigned capacity to find unfilled roles.
4. Keep sponsor-specific sensitive study details within the project permissions.

### Screen 4 — Allocation Planner (Timeline + interactive editor)

**Composition:** Month/week Gantt-like staff lanes and project filter, accessible list alternative.

**Chart / icon treatment:** Allocation blocks in 2–3 stable colors; overbooking warnings text-first.

1. Assign staff to study demand in dated, effort-bounded allocations.
2. Show total allocations against staff availability on the same date range.
3. Change proposed allocations only via reviewed edits with impact shown.
4. Group by person, role or project, and expose conflicts for reassignment.

### Screen 5 — Time & Workload (Form + tracker)

**Composition:** Per-person period entry with clear effort units and linked assignment.

**Chart / icon treatment:** Planned-vs-entered effort bars; no payroll/timesheet legal claims.

1. Capture approved hours/work units per study and reporting period.
2. Link activity to a known staff member, study and role allocation.
3. Compare recorded effort to scheduled hours while highlighting unsubmitted periods.
4. Allow corrections with old/new history and manager approval where configured.

### Screen 6 — Capacity Forecast (Visualization + scenario)

**Composition:** Role-by-month graph with scenario controls and exportable summary.

**Chart / icon treatment:** Actual/planned split, supply/demand grouped bars, shortage table with accessible labels.

1. Project capacity 3–12 months from known staffing and assignment dates.
2. Compare baseline and one alternative staffing/contractor scenario.
3. Identify date-specific gaps and the cost impact from user-entered rate assumptions.
4. Prepare an optional ChatGPT staffing brief grounded in the saved demand and available roles.

**ChatGPT research / synthesis recipe:** ChatGPT can synthesize capacity decisions, suggest staffing scenarios and produce management reports from internal records; must not auto-hire or retrieve personnel data from another system.

**Illustrative end-to-end user journey:** CRO registers project demand → allocates CRAs → sees competing requests → records effort → adjusts staffing scenario.

**Acceptance cases:** Overbooking calculated with explicit availability; canceled allocations don't consume future capacity; same person linked across studies; no payroll/health data collected.

**Future four-frame preview storyboard:** Utilization dashboard → allocation lanes → effort entry → shortage forecast.

---

## CR-03 — PI Network Management (6 screens)

**Primary users:** CRO feasibility lead, investigator relations, BD/medical liaison, site network managers. **User job:** Maintain a reusable CRO investigator/institution network and compare public qualifications for upcoming studies.

**Benchmark:** Citeline Sitetrove+ — professional PI/site records, trial history, research criteria and shortlist intelligence.

**MVP boundary:** Professional PI and institution data; no access to Citeline proprietary databases by default, no patient lists or patient-level data, no unsolicited email automation.

**Suggested UI identity:** Forest with dark teal (#243B40) PI network summary, subtle link/people icon and science-friendly white investigator tables.

**Proposed persistent records / fields:** Person (professional investigator, specialty, public ID if verified, source); Organization (institution, location/country); Affiliation (person, organization, dated); Trial Experience (public trial ID, non-patient role/country/indication); Engagement (date, outcome, study/project context); Relationship Rating (criteria, human justification, review date); Match Request (study-specific constraints); Finding (source, publication/registry date).

**Core measures and derivations:** Unique PIs = distinct verified professional identities; studies participated based on sourced trial roles; candidate matching score only if user-defined explicit criteria and assessment completeness.

### Screen 1 — Network Overview (Dashboard)

**Composition:** Dark network KPI with key regional/therapy counts and contact queue.

**Chart / icon treatment:** Specialty and country bars; avoid misleading cartographic dot accuracy.

1. Show distinct known investigators, institutions, recent engagements and profiles requiring verification.
2. Filter by public therapeutic specialty, country, past trial phase and engagement owner.
3. Surface follow-up/refresh actions for stale profiles.
4. Drill to person, institution or dated affiliation source records.

### Screen 2 — PI Directory (Tracker)

**Composition:** Vivid professional person table, clean contact/source columns and Details.

**Chart / icon treatment:** Role/category chips remain neutral; dark overview only, no tinted every row.

1. Record name, specialty, institution relationship, verification date and professional contact channel.
2. Maintain multiple dated affiliations, avoiding duplicate PI identities.
3. Filter by expertise, country and public study experience.
4. Preserve provenance and leave unknown availability unassessed rather than guessed.

### Screen 3 — Site Network (Tracker / relationships)

**Composition:** Institution table with linked PI list and site capability badges.

**Chart / icon treatment:** Sparse PI→site network diagram optional with list alternative and source labels.

1. Store organization, country, infrastructure descriptors and key contacts.
2. Relate several PIs to one site and several sites to one PI as needed.
3. Show past collaboration/feasibility engagement in project-specific linked records.
4. Filter by site capability and collaboration status without merging confidential sponsor evaluations.

### Screen 4 — Trial Experience (Tracker / evidence viewer)

**Composition:** Trial-experience rows grouped by investigator and registry source; evidence side drawer.

**Chart / icon treatment:** Public study counts by indication/phase bars, never recruitment patient metrics.

1. Record public trial identifier, study phase, indication, role, dates and source.
2. Distinguish public investigator role from CRO's own historic collaboration.
3. Deduplicate registry IDs and annotate uncertainties about person-name matching.
4. Link trial evidence to appropriate institution affiliation and latest verification.

### Screen 5 — Engagement History (Form + tracker)

**Composition:** Chronological activity and follow-up queue with professional contact fields.

**Chart / icon treatment:** Meeting/phone outline icons and small month activity sparkline.

1. Log feasibility invitations, discussions and collaboration outcomes.
2. Link activity to PI, study and institution in context.
3. Assign follow-ups and record non-contact preference/declined status.
4. Review new notes/actions and keep history immutable.

### Screen 6 — Investigator Matching (ChatGPT research + comparison)

**Composition:** Criteria form, candidate shortlist table and explanation panel.

**Chart / icon treatment:** Weighted relevance bars with source and missing-category labels.

1. Define a study's PI selection criteria, priority countries and required capabilities.
2. Read permitted network records and ask ChatGPT to find additional public investigator evidence.
3. Compare candidates on specified criteria with an explicit rationale and citations.
4. Save reviewed shortlist and findings as study-specific records; do not auto-contact candidates.

**ChatGPT research / synthesis recipe:** ChatGPT performs public PI trial/publication research and concise fit assessment. If a scheduled task is supported, optional public-profile refresh; no proprietary investigator search entitlement assumed.

**Illustrative end-to-end user journey:** Feasibility manager searches PI network → adds public registry evidence → links institutions → logs engagement → generates candidate shortlist.

**Acceptance cases:** Professional identity/name collisions require review; sponsor-confidential responses stay in matching project; source date and trial ID required for claims; zero patient details.

**Future four-frame preview storyboard:** PI network dark card → public trial experience table → engagement form → explainable matching shortlist.

---

## CR-04 — Site Feasibility Management (6 screens)

**Primary users:** CRO feasibility/project managers, clinical trial startup team, sponsor-facing feasibility lead. **User job:** Reuse eligible institutional site profiles across multiple study requests while protecting each sponsor's confidential requirements and responses.

**Benchmark:** Syneos Health StudyEngage — site qualification, reusable profile/feasibility questionnaire workflow (conceptual reference).

**MVP boundary:** Institution-level capability and aggregate operational estimates; no patient enrollment lists, EHR integration, proprietary site portal or patient-level feasibility data.

**Suggested UI identity:** Ocean accent (#175B94), dark slate (#203643) cross-study coverage tile, restrained institution/clipboard icons and light white scoring matrix.

**Proposed persistent records / fields:** Sponsor Project (study criteria and permissions); Institution (shared public/site master); PI Professional (public); Study-Site Candidate (project, institution, owner, status); Requirement Criterion (applicable, weight); Questionnaire Response (answer, version, source, data date); Feasibility Assessment (assessor, justification); Selection Decision; Handoff Task (contract/startup due).

**Core measures and derivations:** Evaluated site count per study; reusable site count distinct across studies (authorized); fit score criterion-defined, missing answers explicit; aggregate potential capacity informational only.

### Screen 1 — Feasibility Portfolio (Dashboard)

**Composition:** Dark active studies/sites card and project backlog view.

**Chart / icon treatment:** Study-by-country candidate bar chart and upcoming response deadlines.

1. List currently open sponsor feasibility assignments and due dates.
2. Show status counts (identified, contacted, assessed, proposed) per study without mixing confidential client data.
3. Surface questionnaire overdue and shortlisting blockers.
4. Open a sponsor project to see its authorized site candidate records.

### Screen 2 — Study Requirements (Form + tracker)

**Composition:** Study brief form, criterion table and risk notes, no duplicate app setup.

**Chart / icon treatment:** Requirement weights and mandatory-criteria badge summary.

1. Capture non-patient study description, target countries, site type and timeline.
2. Define site capability and experience criteria with explicit mandatory/weighted status.
3. Save versioned requirement sets and reviewers for comparison reproducibility.
4. Restrict study-specific confidential constraints to sponsor project scope.

### Screen 3 — Reusable Site Profiles (Tracker)

**Composition:** Vivid site institution master and linked professional PI list.

**Chart / icon treatment:** Capability chips and country bars with documented source date.

1. Maintain institutional facilities, specialties, personnel capacity bands and past public study experience.
2. Link contacts and investigator affiliations with dated professional records.
3. Reuse one institution across many authorized studies without copying its master profile.
4. Separate study-specific estimates and sponsor responses from verified reusable institution facts.

### Screen 4 — Site Questionnaire (Form + tracker)

**Composition:** One project-specific response form per institution, version and approved response record.

**Chart / icon treatment:** Response completeness meter and missing/needs clarification state.

1. Collect aggregate staffing, equipment, competing obligations and setup timeline estimates.
2. Preserve source, answered-at date and respondent professional role.
3. Assign clarifications and track reply resolution.
4. Require review before promoting externally supplied answers into committed study-specific records.

### Screen 5 — Evaluation Matrix (Comparison visualization)

**Composition:** Criteria-by-site matrix with source-row expansion and side-by-side shortlist.

**Chart / icon treatment:** Sortable horizontal normalized score bars; no inferred patient eligibility.

1. Compare selected sites against identical project criterion set.
2. Show which assessments are missing, non-applicable or unsupported by evidence.
3. Combine reviewer assessments with visible weights, preventing incomplete sites from falsely ranking first.
4. Document feasibility concerns and shortlisting rationale in project-specific evaluation records.

### Screen 6 — Selection & Handoff (Pipeline + tasks)

**Composition:** Study-specific selected/declined pipeline and handoff checklist.

**Chart / icon treatment:** Activation milestone strip with owner and agreed target dates.

1. Record sponsor-reviewed site shortlist status and decision date.
2. Capture reason for selection/decline, risks and sponsor next actions.
3. Create startup owner tasks for documentation, contract and feasibility handoff.
4. Track handoff completion without copying hidden sponsor data into another customer's project.

**ChatGPT research / synthesis recipe:** ChatGPT can summarize feasibility responses and search public institution/PI capabilities; no automated site messaging and no inference of individual patient populations.

**Illustrative end-to-end user journey:** CRO receives study criteria → matches existing site master → gathers institution responses → builds explainable shortlist → hands off selected sites.

**Acceptance cases:** Site profiles reused without leaking study-specific feasibility; assessed scores exclude missing answers; no EHR/patient data; same site can have different study-level capacity answers.

**Future four-frame preview storyboard:** Cross-study coverage dashboard → reusable site master → questionnaire → feasibility ranking/handoff.

---

## CR-05 — Sponsor Updates (6 screens)

**Primary users:** CRO project manager, sponsor liaison, functional leads, operations director. **User job:** Turn approved project progress data into consistent sponsor-facing weekly or monthly reports.

**Benchmark:** Certinia Professional Services Cloud — project progress, deliverable, resource and client reporting patterns (CRO use case).

**MVP boundary:** Internal input gathering, report approval and manual distribution; no mandatory email/Office integration and no patient-level study progress. No automatic sponsor disclosure.

**Suggested UI identity:** Plum (#795094) reports accent and deep-indigo (#332B41) reporting-period cover with document icon; charts remain small, source-traceable.

**Proposed persistent records / fields:** Sponsor Organization; Project/Study (authorized sponsor relationship); Progress Update (period, area, contributor, narrative, status); Milestone (planned/current/actual); Deliverable (owner, due, accepted); Risk/Decision/Action (severity, due, status); Report Draft (period, source IDs, generation date, reviewer, approved version); Distribution Log (manual channel, date, recipient role).

**Core measures and derivations:** Milestones due/achieved by period, deliverable completion, unresolved escalations; report coverage = expected workstream updates received, with “not provided” clearly indicated.

### Screen 1 — Sponsor Overview (Dashboard)

**Composition:** Dark current-week summary card and one small study milestone chart.

**Chart / icon treatment:** Progress status grouped bars and overdue action list, separate sponsor filter.

1. Select sponsor and period, view active CRO studies and reporting cadence.
2. Show milestone progress, top open issues and next sponsor decisions.
3. Flag missing updates from expected functional teams.
4. Link status values to date-stamped progress records with access checks.

### Screen 2 — Study Progress (Tracker)

**Composition:** Vivid program workstream rows with month/week filter and review state.

**Chart / icon treatment:** Milestone planned vs achieved strip by week, no patient recruitment detail.

1. Capture non-patient execution status by workstream and responsible owner.
2. Record achieved and forecast dates for deliverables and milestones.
3. Collect commentary on changes from prior reporting period.
4. Keep completed baseline evidence so progress claims are traceable.

### Screen 3 — Deliverables (Tracker)

**Composition:** Searchable owned deliverable table and exact document location field.

**Chart / icon treatment:** Due-status bars by function with true overdue labels.

1. Record expected output, owner, deadline and sponsor acceptance/rework state.
2. Filter what changed during the selected reporting period.
3. Capture sponsor feedback and outstanding action deadline.
4. Prevent a “complete” summary when acceptance evidence is not recorded.

### Screen 4 — Risks & Decisions (Tracker + form)

**Composition:** Risk/action list and compact meeting decision capture.

**Chart / icon treatment:** Impact/severity matrix when actual scores supplied, else priority list.

1. Log operational risk, issue, owner, impact and mitigation action.
2. Record sponsor decisions and escalation status with responsible role.
3. Link unresolved risks to milestones and reporting period.
4. Track closed items so later reports can identify what changed.

### Screen 5 — Reporting Inputs (Form + tracker)

**Composition:** Functional team update form, contributor status panel and deadline.

**Chart / icon treatment:** Coverage meter (updates supplied/expected) with clear gray missing state.

1. Request structured period highlights, achieved deliverables, blockers and next steps.
2. Capture contributor, timestamp, project, cutoff and review state.
3. Consolidate period-specific updates without overwriting historical contributions.
4. Let project manager accept or request corrections with a log of edits.

### Screen 6 — Sponsor Report (ChatGPT report viewer)

**Composition:** Dark cover, approved report archive, source snapshot and output narrative.

**Chart / icon treatment:** Small trend blocks for milestone attainment and issue aging; report not an embedded LLM.

1. Ask ChatGPT to draft a concise sponsor update based solely on authorized selected period records.
2. Show facts, upcoming actions, risks, and key changes with source-record references.
3. Require project manager review before saving final report version or distributing it externally.
4. Log manual distribution date and audience; no background email or implied provider connection.

**ChatGPT research / synthesis recipe:** ChatGPT generates narrative sponsor reports, optionally on a weekly/monthly Task if permitted MCP access and actual execution have been verified. Reports should be drafts until human sign-off.

**Illustrative end-to-end user journey:** Functional leads enter updates → PM reviews → dashboard shows unresolved blockers → ChatGPT drafts sponsor report → PM approves/distributes manually.

**Acceptance cases:** Missing team updates visible; milestone numbers match source; private sponsor A data cannot appear in sponsor B report; publication does not imply automatic emailing.

**Future four-frame preview storyboard:** Report status hero → deliverables table → weekly input form → reviewed sponsor report.

---

## CR-06 — Client Signals & CRM (7 screens)

**Primary users:** Small CRO owner, VP business development, sales manager, account lead. **User job:** Find small biotech leads with likely trial outsourcing needs, track relationships and turn sourced news into relevant opportunities.

**Benchmark:** Attio — flexible organizations, contacts, deal pipelines and relationship-centric CRM; signal monitoring is a ChatGPT-enabled TrialAgents extension.

**MVP boundary:** Professional contact and publicly available company intelligence only; no bought lead database, email provider, social platform scraping or automated outbound messaging required.

**Suggested UI identity:** Forest with ocean signal highlights and charcoal teal (#243B40) new-signals KPI; subtle radar/search and chain icon; modern dense but readable CRM.

**Proposed persistent records / fields:** Organization (website, therapeutic area, pipeline phase, size estimate with source, owner); Person (professional role/contact, opt-out/preferences); Opportunity (company, service fit, probability as stated, stage, expected value, owner); Interaction (date/channel/outcome); Signal (type, title, source URL, published date, observed date, linked company, relevance, confidence/caveat); Follow-up (owner/due); Research Run (source window, status); Report (period, saved findings).

**Core measures and derivations:** Qualified leads = opportunities meeting explicit saved criteria; signal counts only deduplicated verified events; avoid assuming every financing or trial announcement implies available CRO budget.

### Screen 1 — Sales Overview (Dashboard)

**Composition:** Dark lead/opportunity metric with one recent-signal spotlight, 2 light pipeline cards.

**Chart / icon treatment:** Pipeline stage bars and weekly validated signal trend, separate units.

1. Show qualified leads, active pipeline, overdue outreach and newly reviewed company signals.
2. Filter by therapeutic specialty, geography, sales owner or development phase.
3. Rank follow-ups by user-set fit/priority and source freshness, with explainable criteria.
4. Open corresponding company/opportunity or source evidence from a card.

### Screen 2 — Company Directory (Tracker)

**Composition:** Vivid biotech organization master with linked contact and signal chips.

**Chart / icon treatment:** Non-decorative phase mix bars only if the population supports it.

1. Maintain biotech name, website, indication/modality, employee-size band and verified source.
2. Link multiple contacts, signals and sales opportunities to one organization identity.
3. Filter by lead criteria, pipeline stage, company size and last evidence date.
4. Show uncertainty and old-source warnings for public claims instead of overwriting them silently.

### Screen 3 — Contacts (Tracker)

**Composition:** Professional contacts linked to companies; right Details with activity.

**Chart / icon treatment:** Neutral email/LinkedIn channel labels and follow-up due status.

1. Store professional decision-maker names, roles, work contact channel and sourcing context.
2. Track contacted/responded/declined statuses and opt-out preferences.
3. Link each person to company and one or more legitimate opportunities.
4. Create follow-up reminders for a specific person without automatically sending messages.

### Screen 4 — Opportunity Pipeline (Kanban + list)

**Composition:** Stage cards for lead qualification to contract and compact mobile list.

**Chart / icon treatment:** Stage bars with count/value in separate charts; status labels always visible.

1. Manage Identified → Qualified → Meeting → RFP → Negotiation → Won/Lost stages.
2. Log deal owner, service need, potential study timing and disclosed budget estimate.
3. Move stage only with an activity/outcome note and reviewed save.
4. Highlight stalled or next-action-missing opportunities for follow-up.

### Screen 5 — Client Signals (Research tracker)

**Composition:** Saved source-backed signal cards plus search/filter list; context drawer.

**Chart / icon treatment:** Time-sorted signal feed, source icon and compact count-by-topic bars.

1. Store funding, study initiation, regulatory, hiring and partnership announcements with URL and publication date.
2. Map signal to existing biotech organization; deduplicate by source/event/time window.
3. Rate relevance to CRO services with fact-versus-interpretation fields and rationale.
4. Escalate high-fit findings into a candidate opportunity only after review or scoped write grant.

### Screen 6 — Signal Monitoring (ChatGPT automation setup)

**Composition:** Monitoring scope, company watchlist, query criteria and proposed cadence; explicit connection/status.

**Chart / icon treatment:** Dark radar card as visual header only, research history and selected topics pills.

1. Let user choose watchlist (named companies or sourced prospect criteria), geography and monitored event categories.
2. Present a ChatGPT recurring task recipe that reads current authorized company/Signal tables every run.
3. Offer scheduling in ChatGPT only when Tasks and plugin access can actually execute; otherwise show Run manually.
4. Request exact per-type update permissions and log last verified run results; never display a fake active scheduler.

### Screen 7 — Account Briefings (ChatGPT report + archive)

**Composition:** Company one-page briefing + period-based saved reports; source panel on the side.

**Chart / icon treatment:** Company signal timeline and 2-series trends with current source cutoff.

1. Ask ChatGPT to synthesize recent company signals, possible outsourcing need and matching CRO capabilities.
2. Separate objective announcements from speculative commercial opportunity assessments.
3. Save reviewed company briefings with URLs, dates, report cutoff and opportunity link.
4. Offer weekly pipeline intelligence summaries from verified saved records with no automatic email requirement.

**ChatGPT research / synthesis recipe:** ChatGPT is the exclusive engine for web research, signal relevance, company qualification and recurring report synthesis. Task triggers default to ChatGPT if the live connected plugin supports unattended authorized writes; otherwise manual launch.

**Illustrative end-to-end user journey:** BD defines prospect criteria → research finds new funding/trial signal → company is linked/deduplicated → approved opportunity added → follow-up logged → account briefing refreshed.

**Acceptance cases:** Duplicate announcement doesn't inflate signal counts; public evidence and interpretive conclusion separated; missing source means unverified; no unapproved outbound contacting; stale grants stop future automated updates.

**Future four-frame preview storyboard:** New client signal dark KPI → biotech company CRM → signal relevance research queue → source-cited account briefing.

---
