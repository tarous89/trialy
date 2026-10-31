# Clinical Operations apps — detailed candidate screen scope

**Status: planning only.** Six user-selected sponsor-side applications, not live modules, validated regulatory tools or HTML designs. Distinguish **sponsor RFP intake/evaluation** from CRO bid response. Site/PI management is **institutional/professional only**. Trial Monitoring & Pharmacovigilance means **operational oversight only**. Follow [shared design and data/AI rules](DESIGN_AND_BUILD_CONTRACT.md) and exact TrialAgents permissions and audit controls.

## CO-01 — RFP Management (6 screens)

**Primary users:** Sponsor Clinical Operations director, outsourcing/procurement manager, clinical study lead. **User job:** Write and manage a sponsor-side CRO/service-provider RFP and compare bids without external sourcing software.

**Benchmark:** Workday Strategic Sourcing — bid collection, vendor response comparison and stakeholder evaluation patterns.

**MVP boundary:** RFP content, vendor invitation/contact status, internal evaluation and award rationale. No automatic vendor emailing, procurement ERP, e-signatures or legally binding bid portal.

**Suggested UI identity:** Forest with dark teal (#243B40) sourcing-deadline hero and minimal checklist icon; neutral criterion matrices and amber deadline callouts.

**Proposed persistent records / fields:** Sourcing Project (study, scope, owner, timeline, budget range); Provider Organization (shared company ID); RFP Section/Requirement (text, answer type, mandatory flag, weight, evidence expectation); Bid/Response (provider, question reference, answer, source, submitted date); Clarification (owner, due, status); Review (criterion, reviewer, rating, rationale); Award Decision (selected provider, decision date, caveat, author).

**Core measures and derivations:** Response completeness = requirements answered/requirements requested, with non-applicables explicit; reviewer completion = scored required criteria/eligible criteria. No weighted score when mandatory items are missing.

### Screen 1 — RFP Overview (Dashboard)

**Composition:** Dark critical-date card plus small participation KPIs and an urgent decisions strip.

**Chart / icon treatment:** RFP lifecycle stepper and response-completion horizontal bars, no fabricated suppliers.

1. Show active sponsor sourcing projects, issued/open/closed stage and next submission/review date.
2. Count invited, responded, incomplete and shortlisted vendors from committed participation records.
3. Surface overdue clarifications, missing mandatory replies and assigned evaluator tasks.
4. Filter by study/service scope and navigate to source RFP or response records.

### Screen 2 — RFP Projects (Tracker)

**Composition:** Vivid project register with one-line scope, dates and responsible team.

**Chart / icon treatment:** Compact deadline timeline above table; date marker not timeline wallpaper.

1. Record each RFP objective, type of work, geography, sponsor study and owner.
2. Track issue date, question deadline, response deadline and expected decision date.
3. Link participating vendor organizations and internal review team to project identity.
4. Filter Open, Evaluating, Awarded, Cancelled and expose versioned scope changes.

### Screen 3 — RFP Builder (Form + requirement tracker)

**Composition:** Grouped section editor with clear required fields; reusable requirement table below.

**Chart / icon treatment:** Section counts and weight-summary meter with neutral warning when values don't sum to target.

1. Compose clear service requirements by section (services, quality, regions, timelines, commercial).
2. Set required/optional, expected answer format, evaluator and scoring weight for each criterion.
3. Duplicate relevant approved question blocks within the project, keeping distinct requirement IDs.
4. Preview a structured, shareable RFP document summary for manual delivery; publishing doesn't send email.

### Screen 4 — Vendor Responses (Tracker + form)

**Composition:** Vendor selector, question list and form for manually entered response content.

**Chart / icon treatment:** Response-coverage bars with missing/declined/non-applicable distinct from zero.

1. Register bid receipt status, response date and associated provider.
2. Capture answers to current RFP requirements with optional file/source link and reviewer notes.
3. Manage clarifications, reply due dates and completeness for each provider.
4. Lock or version submitted answers for comparison while preserving the original supplied response.

### Screen 5 — Bid Evaluation (Comparison matrix)

**Composition:** Vendor columns and criterion rows, sticky titles, mobile one-vendor focus.

**Chart / icon treatment:** Sorted criterion bars, weights and reviewer disagreement visible; no automatic winner.

1. Score each eligible provider against identical weighted criteria on a documented scale.
2. Record missing mandatory responses and prevent premature overall-comparable ranking.
3. Show weighted scores, response completeness and separately labeled estimated cost/risk.
4. Support multiple evaluator scores and a documented consensus review without erasing individual assessments.

### Screen 6 — Award Decisions (Tracker + report)

**Composition:** Decision record and shortlist table with action list; dark decision-summary tile optional.

**Chart / icon treatment:** Simple decision matrix with reasons, costs and restrictions text, not decorative gauges.

1. Log shortlisted/selected/declined providers, decision rationale and accountable approver.
2. Record decision meeting, approval date, outstanding negotiations and sourcing conditions.
3. Link the selected CRO to downstream oversight project without copying restricted response notes.
4. Ask ChatGPT to draft a factual award summary based on authorized proposal/score evidence for manual review.

**ChatGPT research / synthesis recipe:** ChatGPT can help draft the RFP, analyze authorized received proposals and prepare internal evaluation narrative. It cannot email vendors, fabricate responses or authorize a source disclosure without separate approval.

**Illustrative end-to-end user journey:** Sponsor opens sourcing project → writes RFP sections → logs bids → evaluators score → decision record handoff.

**Acceptance cases:** Two vendor bids respond to the same requirement IDs; mandatory gaps visible; pricing comparisons carry currency; RFP versions immutable in history; sponsor-specific bid details never become public vendor attributes.

**Future four-frame preview storyboard:** Sourcing dashboard → requirements builder → vendor reply matrix → weighted evaluation/award summary.

---

## CO-02 — CRO Oversight (6 screens)

**Primary users:** Sponsor Clinical Operations director, trial manager, outsourced study lead, governance committee. **User job:** Track CRO service commitments, issues and KPI performance at study level with defensible evidence.

**Benchmark:** Veeva CTMS — sponsor performance/oversight and monitoring KPI rollups (select a small operational slice).

**MVP boundary:** Governance commitments and aggregate operational KPIs; no clinical subject/patient records or direct CTMS connection.

**Suggested UI identity:** Ocean primary (#175B94), dark-navy (#203643) performance card, small check/clock icons; amber alerts for real overdue actions.

**Proposed persistent records / fields:** Study/Project (sponsor, phase, geography); CRO Engagement (provider, contract period, service scope); Work Package (owner, SLA, expected date, actual date, status); KPI Definition (measure, target, unit, period, owner); KPI Observation (value, cutoff, source); Issue (severity, action, due, closed date); Governance Meeting (decisions/actions); Report (period, approved state).

**Core measures and derivations:** On-time deliverable rate = delivered on/before agreed due / delivered due-period items; KPI variance = actual–target with units and direction; open issue aging calculated from issue creation.

### Screen 1 — Oversight Dashboard (Dashboard)

**Composition:** Dark study-health hero with SLA KPIs and near-term risks; study selector top right.

**Chart / icon treatment:** Target-versus-actual bar and monthly issue count trend with source cutoff.

1. Display CRO engagement, next deliverable, overdue actions and KPI exceptions by chosen study.
2. Separate measured metrics from CRO self-reports and manually assessed status.
3. Show five due-soon governance decisions and actionable issues.
4. Drill each metric into its underlying work package, KPI observation or issue record.

### Screen 2 — Work Packages (Tracker)

**Composition:** Vivid work-package table grouped by contracted service stream and due date.

**Chart / icon treatment:** On-time fulfillment mini bars by month, zero baseline.

1. Capture contracted scope, deliverable, owner, expected date and evidence/location.
2. Record submitted, sponsor reviewed, accepted or rework status with time-stamped transitions.
3. Filter due/overdue, provider, function and owner; maintain review notes.
4. Compare original due date to any approved revised schedule without overwriting the baseline.

### Screen 3 — Performance Scorecard (Visualization + tracker)

**Composition:** Compact scorecard by function with editable target register.

**Chart / icon treatment:** Horizontal target/actual pairs and RAG semantics only after threshold definition.

1. Define each KPI with numerator, denominator, direction, source and reporting period.
2. Enter or import manually authorized periodic KPI observations with source and cutoff.
3. Compare delivery performance across periods and flag missing data separately.
4. Review threshold breaches and open linked follow-up tasks; never infer patient safety causality.

### Screen 4 — Issue Management (Tracker + form)

**Composition:** Severity-first issue list with right Details and an Add issue panel.

**Chart / icon treatment:** Age distribution (0–7, 8–30, >30 days) and clear overdue labels.

1. Log operational issue, service impact, owner, priority, first observed date and source.
2. Link action plan, due date, escalation route and expected verification evidence.
3. Record action completion and sponsor closure separately to avoid false resolution.
4. Filter persistent, reopened or overdue issues while retaining full status history.

### Screen 5 — Meeting Actions (Form + tracker)

**Composition:** Governance minutes capture above tabular action/decision queue.

**Chart / icon treatment:** Calendar strip for next reviews, slim icon for discussion/checklist.

1. Record meeting type/date, participants in professional roles, decisions and status.
2. Assign linked actions to internal sponsor or CRO owner with due date.
3. Close or reassign an action only with an auditable update.
4. Carry unresolved items into the next meeting agenda without creating duplicates.

### Screen 6 — Oversight Reports (ChatGPT report viewer)

**Composition:** Saved reporting periods, source metrics sidebar and narrative main pane.

**Chart / icon treatment:** Two source-linked trend cards (KPI and issues) followed by concise executive text.

1. Select reporting period and show an exact last-data cutoff.
2. Offer ChatGPT a structured performance and risk summary grounded in authorized records.
3. Review, save and version sponsor oversight narrative and outstanding escalations.
4. Compare reports period-on-period without presenting missing KPIs as improved.

**ChatGPT research / synthesis recipe:** ChatGPT may draft weekly/monthly sponsor oversight commentary from permitted KPI and action records; source data collection and corrections must be authorized. No external CRO report portal needed.

**Illustrative end-to-end user journey:** Sponsor sets engagement and KPI definitions → CRO deliverables logged → slippage creates issue → governance decides action → monthly report is approved.

**Acceptance cases:** SLA denominator defined; self-reported vs independently verified values distinguished; revised due dates preserve baseline; issue close requires separate sponsor verification.

**Future four-frame preview storyboard:** Performance cards → work package table → issue action panel → KPI scorecard/report.

---

## CO-03 — Site Feasibility Management (6 screens)

**Primary users:** Sponsor feasibility lead, ClinOps study manager, site-selection committee. **User job:** Identify, evaluate and shortlist institutions for a study using organizational capabilities and aggregate estimates.

**Benchmark:** Veeva Study Startup — site qualification questionnaire, feasibility assessment and selection readiness.

**MVP boundary:** Institution and professional investigator data only; never patient identifiers, individual screening records, recruitment lists, sensitive site patient data or real-time EHR connections.

**Suggested UI identity:** Forest primary and ocean secondary, dark teal (#243B40) region/coverage card with small institution/people icon; clean country-by-capability matrices.

**Proposed persistent records / fields:** Study/Project (country targets, indication non-patient, service needs); Institution (country, specialty, infrastructure, location); Professional Investigator (specialty, study experience); Study-Site Candidate (project, site, owner, status); Questionnaire (version, item, answer, source); Feasibility Estimate (aggregate capacity band, data vintage, confidence text); Evaluation (weights, assessor, rationale); Startup Item (contract, training, document metadata).

**Core measures and derivations:** Site readiness = complete required organization-level criteria / applicable criteria; aggregate capacity estimates are unverified planning figures, not a count of identified patients.

### Screen 1 — Feasibility Overview (Dashboard)

**Composition:** Dark coverage summary and country segmentation with site-selection progress strip.

**Chart / icon treatment:** Count by country and stage horizontal bar; do not turn unknown countries into map pins.

1. Show site candidates, questionnaires received, assessed sites and shortlisted institutions.
2. Filter by study, country and institution type.
3. Show overdue questionnaire responses and startup handoff tasks.
4. Open the selected-site list from every metric and mark data-date freshness.

### Screen 2 — Site Directory (Tracker)

**Composition:** Vivid site master table and linked professional PI field.

**Chart / icon treatment:** Facility/country mix bars only for justified comparisons.

1. Maintain institution profile, country, specialties, study history and contact channel.
2. Link professional investigators to institutions with dated affiliations.
3. Filter by therapy capability, region, research infrastructure and past response speed.
4. Keep sponsor-specific feasibility answers on separate participation records, not master site facts.

### Screen 3 — Feasibility Questionnaire (Form + tracker)

**Composition:** Sectioned fit questionnaire with progress/last updated; permission-scoped share link optional.

**Chart / icon treatment:** Completion bar with mandatory unanswered criterion count; neutral unless truly overdue.

1. Collect staffing, equipment, competing studies and high-level operational capacity information.
2. Store responses with question version, respondent role, source date and applicability.
3. Allow reviewers to request clarification and link replies to the same item.
4. Review accepted responses before merging into sponsor-controlled feasibility records.

### Screen 4 — Site Comparison (Comparison + visualization)

**Composition:** Criterion rows, selected-site columns, evidence expanders.

**Chart / icon treatment:** Weighted horizontal site scores with explicit missing values and evaluator disagreement.

1. Define mandatory, weighted institutional criteria per study.
2. Compare site resources, prior experience, timeline feasibility and aggregate capacity band.
3. Calculate ranking only for sufficiently assessed sites, with transparent rules.
4. Record reviewer notes and justify manual shortlist changes; no patient prediction algorithm.

### Screen 5 — Selection Pipeline (Pipeline / tracker)

**Composition:** Stage list and optional Kanban, with country and owner chips.

**Chart / icon treatment:** Stage distribution by country; color status semantics from Vivid.

1. Track Identified → Contacted → Questioned → Assessed → Selected/Declined transitions.
2. Assign feasibility owners and target decision dates.
3. Preserve reason for decline, next contact and study-specific conditions.
4. Open each candidate's linked institution, PI and assessment without duplicating entities.

### Screen 6 — Startup Readiness (Tracker / timeline)

**Composition:** Selected-site milestones grid and owner checklist with due-date strip.

**Chart / icon treatment:** Gantt lanes for contract, qualification and essential-document status only.

1. Create institution-level activation tasks after explicit selection.
2. Track contract state, institutional readiness, site-level training and document metadata.
3. Compare planned vs actual activation milestones and open blockers.
4. Hand selected-site outcomes to study execution tracking with project-specific access preserved.

**ChatGPT research / synthesis recipe:** ChatGPT may research public investigator/institution credentials and synthesize feasibility responses. It must not infer actual patient eligibility or access clinical records. Optional periodic site-publication updates are not necessary for core use.

**Illustrative end-to-end user journey:** Sponsor defines countries → searches known sites → sends/records questionnaire → compares evidence → selects shortlist → manages handoff.

**Acceptance cases:** Site appears once in master records across two studies; response versions preserved; missing aggregate estimate isn't zero; all stored data is institution-level.

**Future four-frame preview storyboard:** Country/site dashboard → institution directory → questionnaire → weighted site comparison.

---

## CO-04 — Investigator CRM (6 screens)

**Primary users:** Sponsor ClinOps, medical liaison, investigator engagement manager. **User job:** Maintain an authorized professional investigator relationship network across studies and institutions.

**Benchmark:** Veeva CTMS investigator and site relationship management — adapted to independent PI relationship tracking.

**MVP boundary:** Professional investigator/academic identity and public history only; no patients, case data or unapproved contact scraping.

**Suggested UI identity:** Plum (#795094) for relationship highlights, dark indigo (#332B41) network metric card with people/chain icon; white Vivid relationship table.

**Proposed persistent records / fields:** Person (name, public professional role, specialty, source, last confirmed); Institution (organization, country); Affiliation (person, organization, start/end dates); Study Experience (trial registry identifier, role, public source); Engagement (date, communication type, meeting notes, responsible owner); Collaboration (study/project, invitation status); Action (owner, due); Research Finding (publication/registry URL).

**Core measures and derivations:** Engaged PI count = distinct authorized people with recorded interactions in selected period; institution count = distinct organizations; never infer availability without recorded evidence.

### Screen 1 — Investigator Overview (Dashboard)

**Composition:** Dark investigator network card and specialty distribution; last-interaction summary.

**Chart / icon treatment:** Region/specialty bars and follow-up list; no geolocation tracking.

1. Show distinct active professional contacts, institutions, and upcoming investigator follow-ups.
2. Filter by indication/specialty, country, engagement owner or relationship status.
3. Surface missing affiliations and outdated public profiles as verification tasks.
4. Link contact counts to individual profile/affiliation records.

### Screen 2 — Investigator Directory (Tracker)

**Composition:** Vivid professional profiles with Details drawer and multiple affiliations.

**Chart / icon treatment:** Specialty count bars only for selected visible records.

1. Record professional PI identity, specialty, job title, organization and public source.
2. Keep source, last verification, contact history and opt-out/preference notes if voluntarily supplied.
3. Search specialty/country and filter active/inactive, collaboration interest or priority.
4. Edit profile fields under person/contact access; do not expose unrelated confidential relationship notes.

### Screen 3 — Institution Network (Relationship view)

**Composition:** Company-to-person linked list as primary; simple static graph only if clear and supported.

**Chart / icon treatment:** Sparse node/link diagram with accessible table alternative; thin chain icon.

1. Show dated affiliations linking people to research institutions.
2. Reveal professional contacts by institution and institutions by contact.
3. Link public trial experience to correct person and institution without collapsing identities.
4. Provide institution-level relationship counts and source provenance.

### Screen 4 — Engagement History (Tracker / activity feed)

**Composition:** Chronological records with compact channel icons and next-step summary.

**Chart / icon treatment:** Month activity sparkline; neutral channel icon colors.

1. Log professional meetings, calls and feasibility discussions with date and responsible owner.
2. Associate engagement with study/project and institution context.
3. Keep outcome, interest level, agreed next step and source/note.
4. Filter by PI and status while preserving old events and the source of each update.

### Screen 5 — Interaction Entry (Form)

**Composition:** Focused quick-entry drawer with person, action, date and next step.

**Chart / icon treatment:** Simple people/clock icon; no chart necessary for a form.

1. Select or create a permitted investigator profile and linked institution.
2. Capture interaction date, channel, participants, purpose and outcome.
3. Assign follow-up task and due date in the same reviewed batch.
4. Confirm that private correspondence is not automatically imported or externally sent.

### Screen 6 — Investigator Research (ChatGPT research + saved evidence)

**Composition:** Structured research scope box and triage list; dark search/people card.

**Chart / icon treatment:** Public registry/publications counts by theme, source freshness labels.

1. Request ChatGPT public search by specialty, region and non-patient study fit criteria.
2. Queue candidate PI profiles with source URLs, publication/registry evidence and review date.
3. Compare candidates using explicit professional criteria without hidden scoring.
4. Add or correct authorized profiles only after review, with deduplication by evidence not name alone.

**ChatGPT research / synthesis recipe:** ChatGPT searches public clinical trial registries and publication sources, compiles professional investigator briefs, and could offer an optional recurring professional-profile update. It cannot make contact without a separate external action.

**Illustrative end-to-end user journey:** Manager finds investigators → records institutions/affiliations → logs engagement → creates follow-up → researches a new candidate.

**Acceptance cases:** One PI may have two dated affiliations; professional identifiers cannot infer a patient relationship; candidate search disambiguates homonyms; restricted notes don't leak into open directories.

**Future four-frame preview storyboard:** Dark PI network KPIs → investigator list → engagement entry → professional research evidence and network map.

---

## CO-05 — Trial Regulatory Submission (6 screens)

**Primary users:** Sponsor regulatory affairs lead, submission project manager, ClinOps program lead. **User job:** Coordinate trial authorization submission preparation, document completeness and authority questions without publishing to a regulatory portal.

**Benchmark:** Veeva Submissions — content plan, document readiness, submission timelines and authority correspondence tracking.

**MVP boundary:** Operational CTA/IND/CTIS planning and document metadata only. No real CTIS portal integration, eCTD publishing, electronic signing, clinical patient information or claims of validated compliance.

**Suggested UI identity:** Ocean (#175B94) with dark blue-gray (#203643) submission-readiness card and document/checklist icons; timelines and matrix kept light.

**Proposed persistent records / fields:** Regulatory Submission (study, authority, country, pathway, planned date, status); Required Item (document class, applicable jurisdiction, owner, deadline, readiness); Document Entry (document title, internal version, source link, review date); Review Decision (reviewer, feedback, approved state); Authority Question (date, response owner, reply due, status); Country Milestone (baseline/current/actual dates); Readiness Snapshot (cutoff, outstanding).

**Core measures and derivations:** Readiness % = approved applicable required items / all applicable required items, with unknown applicability separately shown; deadline breaches based on chosen jurisdictional date, never regulatory time limits inferred automatically.

### Screen 1 — Submission Overview (Dashboard)

**Composition:** Dark nearest-authorization milestone card with three readiness counts; country selector.

**Chart / icon treatment:** Readiness by country horizontal bars and pending authority question count.

1. Show each planned submission, status, authority/country and next action date.
2. Summarize ready, incomplete, under-review and not-applicable document items without false completeness.
3. Highlight RFI/authority-question deadlines and missing owner assignments.
4. Navigate to required items and document evidence for each reported gap.

### Screen 2 — Submission Tracker (Tracker)

**Composition:** Vivid jurisdiction-by-submission register and filterable study/project links.

**Chart / icon treatment:** Cross-country milestone strip with explicit dates and active cutoff.

1. Maintain each submission package, authority, regulatory pathway, country, owner and submission type.
2. Track drafted, internal-review, ready, submitted and authority-follow-up phases as human-entered states.
3. Compare planned/submitted/decision dates while retaining timeline revisions.
4. Filter by study, authority, country, responsible team and overdue status.

### Screen 3 — Submission Checklist (Tracker / task list)

**Composition:** Structured essential-item tree organized by package section; no excessive nested cards.

**Chart / icon treatment:** Completion bar only for applicable required documents; missing items clearly named.

1. Define required document categories and jurisdiction-specific applicability manually.
2. Assign document owner, version expectation and review/due dates.
3. Link actual document register records to checklist items without duplicating documents.
4. Mark ready only when responsible reviewer approves the exact current document version.

### Screen 4 — Document Register (Tracker)

**Composition:** Vivid document metadata list, one row per version with Details.

**Chart / icon treatment:** Neutral version chips and review stage counts; not a document editing suite.

1. Track title, authoring role, internal version, reviewer, document state and reference link.
2. Link documents to submissions and checklist items with explicit version references.
3. Record approved/rework/outdated status and reviewer notes, preserving previous versions.
4. Do not claim that stored external links imply actual CTIS/eTMF access or authoritative submission.

### Screen 5 — Authority Questions (Tracker + form)

**Composition:** Question register with due-date side panel and response-owner assignment.

**Chart / icon treatment:** Due timeline with amber/blocked markers, restrained authority/document icon.

1. Record question identifier, authority, jurisdiction, date received and required reply date.
2. Track issue theme, response owner, drafting progress and cited answer evidence.
3. Log submitted response/closure status manually with supporting source.
4. Escalate overdue answers and prevent confusing open requests with resolved questions.

### Screen 6 — Submission Readiness (ChatGPT report + matrix)

**Composition:** Readiness checklist grouped by country with report approval pane.

**Chart / icon treatment:** Gap matrix with complete/incomplete/unknown text labels and source cutoff.

1. Calculate status from current reviewed checklist and document metadata.
2. Identify country-specific missing items, unresolved dependencies and approaching deadlines.
3. Offer ChatGPT a submission briefing based on authorized records and attached relevant documents.
4. Save a dated human-reviewed readiness report; do not auto-submit or represent legal compliance certification.

**ChatGPT research / synthesis recipe:** ChatGPT summarizes applicable public guidance only with sources and jurisdiction/date labels, and drafts internal checklists/authority-response summaries for regulatory review. No regulatory filing through ChatGPT Tasks in MVP.

**Illustrative end-to-end user journey:** RA lead opens planned submission → defines applicable documents → documents reviewed → authority asks question → readiness briefing revised.

**Acceptance cases:** A superseded document version cannot count as approved current; unknown applicability visible; no field requires patient-level data; no actual portal submission action displayed.

**Future four-frame preview storyboard:** Submission readiness card → country tracker → document checklist → gap analysis report.

---

## CO-06 — Trial Monitoring & Pharmacovigilance (7 screens)

**Primary users:** Sponsor ClinOps oversight manager, QA/PV operations coordinator, CRO governance lead. **User job:** Track monitoring operations and partner PV reporting obligations in one oversight workspace, without processing patient cases.

**Benchmark:** Veeva CTMS (visit and monitoring operational actions) + Veeva SafetyDocs (PV documents, agreements and obligations).

**MVP boundary:** **Strictly non-patient operational oversight.** No adverse-event/SAE cases, ICSR, subject narratives, AE line listings, individual safety follow-up, MedDRA coding, case signal detection or pharmacovigilance database functions.

**Suggested UI identity:** Forest plus ocean for separate Monitoring/PV sections; dark slate (#243B40) obligation-due card, fine shield/checklist icons; red only for genuinely overdue obligations.

**Proposed persistent records / fields:** Study/Project; Site (institution only); Monitoring Visit (type, planned/actual date, report metadata, monitor name, state); Operational Finding (finding category, severity, site, action, owner, due date, verified close); PV Agreement (partner, scope, renewal, responsibilities); PV Obligation (report type, jurisdiction, owner, due date, status); Document Metadata (title, version, approved); Governance Meeting/Action; Reporting Snapshot (cutoff, source).

**Core measures and derivations:** Monitoring completion = visits completed / visits scheduled to date (with cancelled separately); overdue action aging from due; PV obligation on-time % from obligation milestones, not subject events.

### Screen 1 — Oversight Dashboard (Dashboard)

**Composition:** Dark combined operational KPI card with two immediately visible Monitoring and PV sections.

**Chart / icon treatment:** Separate operational visit progress and obligation deadline bars; never juxtapose safety case incidence statistics.

1. Show planned/completed monitoring visits, open operational findings and PV obligations due soon.
2. Filter by study, vendor, site institution and oversight month.
3. Highlight overdue obligations and monitoring follow-ups with named owners.
4. Navigate every count to its record list, maintaining Monitoring versus PV distinction.

### Screen 2 — Monitoring Visits (Tracker / calendar)

**Composition:** Month/list toggle with table as canonical view and simple schedule header.

**Chart / icon treatment:** Visit timeline by site with scheduled/complete/reported markers, not patient visit timelines.

1. Record site monitoring visit type, planned/actual date, monitor, location and provider.
2. Track visit confirmation, completion and report-finalized metadata with source/date.
3. Filter missed visits or late monitoring report status by study and site.
4. Preserve reschedule reason and original date as history.

### Screen 3 — Monitoring Findings (Tracker + action form)

**Composition:** Severity-filtered operational finding list with reviewable closure evidence.

**Chart / icon treatment:** Age/priority bars by operational issue category; explicit scope notice excluding patient findings.

1. Log site/process/documentation oversight findings that contain **no** patient content.
2. Assign remediation owner, action, due date and status.
3. Keep closure proposed and verification accepted as separate dated states.
4. Trend open findings by category and deadline, with manual source provenance.

### Screen 4 — PV Agreements (Tracker)

**Composition:** Partner agreement metadata table and review/renewal dates; no agreement signing.

**Chart / icon treatment:** Agreement renewal strip with contract/shield outline icon.

1. Track PV agreement counterparty, covered products/studies, effective/review/end dates.
2. Record responsibility matrix references and approved document metadata.
3. Filter upcoming renewal/expiry, owner and completeness of agreed obligations.
4. Link obligations and actions to a specific agreement version without exposing patient safety information.

### Screen 5 — Reporting Calendar (Timeline)

**Composition:** Calendar/list of scheduled **periodic obligations**, not individual case timelines.

**Chart / icon treatment:** Monthly milestone lanes by authority/partner with today marker and text due labels.

1. Maintain periodic safety-report and operational oversight due dates, jurisdiction and reporting type.
2. Track preparer, reviewer, planned handoff and actual completion date.
3. Expose late or unowned tasks by severity and owner.
4. Reschedule only through reviewed change with rationale and historic due date.

### Screen 6 — Obligation Management (Tracker + form)

**Composition:** One consolidated obligation list with source and escalation fields.

**Chart / icon treatment:** By-owner due counts and neutral trend; semantic amber/red only for lateness.

1. Define each partner/jurisdiction obligation and responsible owner; do not infer required legal rule.
2. Record evidence pointer, review status, due date and closure approval.
3. Escalate blocked or missed obligations with owner/date and audit history.
4. Track recurring obligation setup as explicit future dated records; never create case-level content.

### Screen 7 — Oversight Summary (ChatGPT report + archive)

**Composition:** Two-column monitoring/PV operational briefing with saved period selector.

**Chart / icon treatment:** Operational findings line and obligation completion bars sourced from stored records.

1. Prepare monitoring operations and PV **obligations** status with clear period/data cutoff.
2. Ask ChatGPT for a prose summary of authorized aggregate operational issues and deadlines.
3. Separate missed obligation risks from any clinical interpretation or unverified safety conclusion.
4. Save reviewed report versions and sources; forbid suggesting it substitutes for statutory PV reporting.

**ChatGPT research / synthesis recipe:** ChatGPT can synthesize operational status, review public safety reporting calendars, highlight due dates and draft management briefings. It must NOT analyze or receive patient-level AE/case narratives in this app. Any periodic reminders depend on verified Task support or internal deterministic schedules.

**Illustrative end-to-end user journey:** Oversight lead sets monitoring schedule and agreement obligations → logs visit and operational finding → tracks corrective action → reviews upcoming periodic obligations → creates status summary.

**Acceptance cases:** No patient/SAE/ICSR fields; no AE case-count dashboards; obligation dates have provenance, jurisdiction and owner; monitoring visit is not a patient visit; missing period values not shown as compliant.

**Future four-frame preview storyboard:** Two-lane dark oversight summary → monitoring visit schedule → agreement obligation form → periodic obligations report.

---
