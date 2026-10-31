# Research-team applications — detailed candidate scope

**Current platform contract (1 November 2026):** follow the [shared build contract](DESIGN_AND_BUILD_CONTRACT.md#6-app-access-chatgpt-and-scheduling-contract) for optional section access, unified Automations, shared ChatGPT research setup, TrialAgents email, failure isolation and template documentation. References to a Task in these candidate recipes describe optional ongoing work, not a separate host task per app. None of these candidates is marked implemented by this update.

**Status: planning only.** Five user-shortlisted applications, including the final names **Literature Radar** and **Grant Pipeline**. No separate Protocol Library template; an internal method reference screen is part of Experiment Notebook. All apps exclude patient data and mandatory third-party integration. ChatGPT performs online research, monitoring and interpretation only when authorized; TrialAgents owns UI/database/approval. Follow the [shared Vivid design and build contract](DESIGN_AND_BUILD_CONTRACT.md).

## RS-01 — Experiment Notebook (6 screens)

**Primary users:** Nonclinical scientists, lab managers and academic PIs. **User job:** Capture bench experiments, assay evidence and reproducible internal research history without a separate ELN.

**Benchmark:** eLabFTW — experiment records, procedures, attachments and searchable laboratory work.

**MVP boundary:** Nonclinical experiments only; no patient/clinical records, identifiable human specimens, signed GxP records or validated-ELN claim.

**Suggested UI identity:** Forest Vivid, dark teal #243B40 research-status card with fine flask/molecule icon, white editable notebook surfaces.

**Proposed persistent records / fields:** Research Project (name, objective, lead); Experiment (objective, hypothesis, status, planned/actual date, scientist); Protocol Reference (name, version, source, author — inside this app, NOT a separate Protocol Library app); Nonhuman Batch (reagent/batch ID and source); Measurement (analyte, value, unit, replicate, condition, control); Observation (date, text, source); Interpretation (conclusion, limitations, owner); File (authorized reference and checksum where available).

**Core measures and derivations:** Experiment completion based on explicitly completed records; assay means/uncertainty only with recorded replicate n, units and valid calculation. No inferred significance tests.

### Screen 1 — Research Overview (Dashboard)

**Composition:** Dark active experiments metric; two white counts and urgent actions.

**Chart / icon treatment:** Experiment stage bars and weekly completions with honest data cutoff.

1. Display started/completed experiments, open procedures and missing observation reminders.
2. Filter by project, scientist, method and reporting week.
3. Highlight incomplete experimental entries and due reviews as named next steps.
4. Open source experiment IDs and associated protocol/revision from every summary.

### Screen 2 — Experiment Directory (Tracker)

**Composition:** Standard Vivid experiment table and pinned Details column.

**Chart / icon treatment:** Sparse progress bar only if meaningful; otherwise information-dense records.

1. List experiment ID, name, owner, objective, protocol version, start/end and status.
2. Search by project, method, scientist, result or date.
3. Link nonhuman material batches and source files to the exact experiment.
4. Review any revised method/date/interpretation as field diffs, keeping history.

### Screen 3 — Experiment Entry (Form / notebook)

**Composition:** Method/conditions, observations and measurements in clearly separated sections.

**Chart / icon treatment:** Scientific inputs with measurement units and thin flask icon; no decorative scientific plots.

1. Record objective, hypothesis, procedure reference, conditions and experiment owner.
2. Enter measurement rows with analyte, value, unit, replicate, condition and control.
3. Attach/reference permitted raw output and annotate dated observations.
4. Save via reviewed entry with original values and correction history, not a fake electronic signature.

### Screen 4 — Protocol References (Reference tracker)

**Composition:** Small version table embedded **inside Experiment Notebook**, not another template.

**Chart / icon treatment:** Version-history strip and simple document icon.

1. Record permitted experimental method name, version, author and effective date.
2. Link the exact method version to every experimental run.
3. Allow users to find obsolete versions and open original evidence.
4. Prevent retroactive rewrite of procedures used by past experiments.

### Screen 5 — Results & Findings (Scientific visualization + tracker)

**Composition:** Measurement selector, clean chart and traceable supporting rows.

**Chart / icon treatment:** Scatter/line with explicit units, replicates, control line, measured error bars only if supplied.

1. Plot recorded assay measurements by condition, time and batch selection.
2. Show sample count, missing data, controls and actual variability.
3. Capture separate scientist conclusions and stated methodological limitations.
4. Click a plotted result to open its source measurement/experiment, never invent values.

### Screen 6 — Research Summary (ChatGPT report archive)

**Composition:** Selected experiment evidence panel beside approved research memo; optional dark cover.

**Chart / icon treatment:** One cited assay chart plus plain report sections.

1. Select projects, experiments and cutoff before synthesis.
2. Ask ChatGPT to compare recorded nonclinical hypotheses, methods and outcomes.
3. Save a human-reviewed project memo with source experiment IDs and limitations.
4. Compare report periods and keep previous memo versions accessible.

**ChatGPT research / synthesis recipe:** ChatGPT compares uploaded experiment summaries and drafts science briefings; deterministic numeric plotting belongs in TrialAgents, no LLM-generated raw assay results.

**Illustrative end-to-end user journey:** Scientist opens experiment → selects protocol version → records nonclinical results → inspects labeled plot → approves weekly memo.

**Acceptance cases:** Unknown units never guessed; no human biospecimens; replications and control groups preserved; method references immutable by version.

**Future four-frame preview storyboard:** Dark experiments overview → experiment list → experiment entry form → source-linked scatter and memo.

---

## RS-02 — Inventory Management (6 screens)

**Primary users:** Lab operations, bench scientists and supply managers. **User job:** Know nonhuman laboratory stocks, storage, consumption and replenishment status without a supplier ERP.

**Benchmark:** Quartzy — research consumables inventory, requests and replenishment workflows.

**MVP boundary:** Reagents/supplies/instruments only; not patient specimens, human sample LIMS, chain-of-custody certification or online purchasing.

**Suggested UI identity:** Ocean accents #175B94, deep navy #203643 stock warning tile with slim package/flask glyph, white Vivid lists.

**Proposed persistent records / fields:** Inventory Item (category, unit, catalog number, supplier text, reorder point); Nonhuman Lot (expiry, owner, received quantity); Storage Location (room/cabinet/shelf); Stock Movement (item, lot, source/destination, type, quantity, date, actor, rationale); Request (needed-by, cost estimate, approval state); Receipt (lot, date, quantity, link).

**Core measures and derivations:** Stock = reviewed receipts + transfers-in − usage − transfers-out − disposal ± correction, by lot/unit/location; expired stock not usable; reorder threshold set by user.

### Screen 1 — Inventory Overview (Dashboard)

**Composition:** Dark low-stock KPI and two white expiry/request metric cards.

**Chart / icon treatment:** Stock-risk count bars and consumption trend, source date visible.

1. Show low-stock, expiring lots and pending purchase request counts.
2. Filter by inventory category, lab location and responsible owner.
3. List priority replenishments with on-hand and minimum thresholds.
4. Click through to stock item, lot and request evidence.

### Screen 2 — Inventory Directory (Tracker)

**Composition:** Vivid item master with unit, current computed stock, threshold and Details.

**Chart / icon treatment:** Small neutral category pills, red/amber only for real low/expired status.

1. Maintain consumable identity, item number, unit, supplier name and location.
2. Track several nonhuman lots for an item without duplicating the master item.
3. Search/filter category, below-threshold, expiry and location.
4. Keep every stock adjustment under reviewed write and source history.

### Screen 3 — Stock Movements (Form + tracker)

**Composition:** Clearly labeled receipt/use/transfer/disposal/adjustment form and dated activity table.

**Chart / icon treatment:** Thin arrow and clock icons, no complex chart.

1. Record type, exact quantity/unit, item/lot, source and destination.
2. Validate compatible units, valid destination and nonnegative movement amounts.
3. Display resulting stock before committing the adjustment.
4. Record corrections as new dated entries with reason; do not silently delete movement history.

### Screen 4 — Storage Locations (Tracker / explorer)

**Composition:** Two-level room/freezer/cabinet navigation and location item table.

**Chart / icon treatment:** Minimal location glyph with count and expiry bar.

1. Create storage area and access note, with shelf hierarchy if needed.
2. Find all current lots and quantities at the chosen location.
3. Perform a transfer only through an auditable movement record.
4. Keep restricted lab locations within their own access settings.

### Screen 5 — Purchase Requests (Form + approval tracker)

**Composition:** Request intake and compact approval/status list.

**Chart / icon treatment:** Due-date strip and neutral status chips.

1. Create item+quantity request, purpose, needed-by date, estimated cost and owner.
2. Move through Requested → Reviewed → Approved → Ordered → Received/Declined.
3. Associate supplier receipt with lot and actual quantity only after review.
4. Track pending needs and overdue arrivals without requiring supplier API.

### Screen 6 — Inventory Forecast (Visualization)

**Composition:** Trailing usage chart with reorder recommendations in a simple table.

**Chart / icon treatment:** Line trend plus stock threshold and a labeled assumption-only forecast.

1. Calculate consumption by month from approved movement records.
2. Estimate days of cover only for positive use and consistent units.
3. Suggest reorder quantities under a user-set threshold and lead-time assumption.
4. Offer ChatGPT a concise lab stock-risk briefing without changing primary stock math.

**ChatGPT research / synthesis recipe:** ChatGPT may draft inventory risk summaries and research public suppliers, but purchase execution and stock arithmetic stay manual/deterministic.

**Illustrative end-to-end user journey:** Manager enters stock item → logs receipt/usage → sees threshold breach → records and approves request.

**Acceptance cases:** Transfers conserve total stock; expired lots excluded from usable; missing conversion rate cannot be assumed; no human specimen fields.

**Future four-frame preview storyboard:** Dark low-stock count → reagent inventory list → stock transaction form → consumption chart.

---

## RS-03 — Literature Radar (6 screens)

**Primary users:** Academic scientists, discovery researchers, translational research leads. **User job:** Monitor public research publications, screen relevance and develop a durable evidence collection.

**Benchmark:** ResearchRabbit — paper discovery, thematic collections and connected reading workflows.

**MVP boundary:** Public publication metadata/authorized notes only; no publisher crawling, proprietary citation graph, mandatory paid scholarly API or patient-data processing.

**Suggested UI identity:** Plum #795094 with ocean chart complement, rich indigo #332B41 new-publications card and simple search/book glyph.

**Proposed persistent records / fields:** Research Topic (question, keywords, excluded terms, scope, owner, cadence preference); Publication (DOI/PMID, title, journal, authors, date, URL, verified-at); Topic Match (relevance, reason); Screening (decision, reviewer, date); Reading Queue (owner, due, status); Evidence Finding (claim, source, limitations); Synthesis (report, date cutoff, citations); Task Configuration (suggested cadence only unless verified).

**Core measures and derivations:** New = distinct DOI/PMID first observed during period; screened yield = included / actually screened; time trends use dated source or publication date explicitly.

### Screen 1 — Research Overview (Dashboard)

**Composition:** Dark new-papers KPI and top monitored topics with urgent review tasks.

**Chart / icon treatment:** Month-by-month source-backed publication bar, reporting cutoff labeled.

1. Show monitored topics, newly collected papers and screening backlog.
2. Switch topic/reviewer/window and use only saved publications in counts.
3. Surface stale searches and publications lacking trusted identifiers.
4. Open the exact publication or research scope from each metric.

### Screen 2 — Research Topics (Tracker + criteria form)

**Composition:** Vivid topic table, concise keyword/exclusion chips and topic editor.

**Chart / icon treatment:** New-items-by-topic bars only when records exist.

1. Define scientific themes, research questions, keywords and exclusions.
2. Save preferred years, public sources, owner and relevance rubric.
3. Version changes to search scopes so old screening judgments remain meaningful.
4. Generate a ChatGPT discovery prompt that includes authorized existing paper IDs.

### Screen 3 — Publication Feed (Research tracker)

**Composition:** Readable title, journal, year, DOI, topic and review status; evidence drawer.

**Chart / icon treatment:** Small dark featured-source card; neutral subject badges.

1. Store publication title, author, date, DOI/PMID and official source URL.
2. Deduplicate DOI/PMID and flag uncertain matches from title variants.
3. Filter by topic, recency, relevance and screen state.
4. Keep generated interpretations in separate reviewed notes, not as publisher facts.

### Screen 4 — Reading Queue (Kanban / tracker)

**Composition:** Columns New, Reading, Reviewed, Included/Excluded with accessible list.

**Chart / icon treatment:** Tiny stage bars and label-first status.

1. Assign papers to reviewers with due dates and reading priorities.
2. Capture include/exclude/uncertain decision and evidence-based rationale.
3. Store comments on methodology, relevance and research gaps.
4. Maintain previous screening versions when revisiting a decision.

### Screen 5 — Literature Synthesis (ChatGPT report archive)

**Composition:** Selected included papers at left, human-reviewed evidence narrative at right.

**Chart / icon treatment:** Paper-topic timeline and citations, one primary accent chart max.

1. Select included papers and a publication cutoff.
2. Ask ChatGPT to compare results, methodology and uncertainty from permitted sources.
3. Show citations for substantive statements and flag inaccessible full text.
4. Save approved synthesis, source DOI links and historical revisions.

### Screen 6 — Monitoring Setup (ChatGPT scheduling guidance)

**Composition:** Source scope, proposed cadence and Run in ChatGPT action, with honest task status.

**Chart / icon treatment:** Dark radar cover and last confirmed research-run summary, not phantom spinner.

1. Configure topics, public search criteria and daily/weekly preference.
2. Build a Task request that first reads latest TrialAgents stored paper IDs.
3. Offer live ChatGPT task scheduling only when unattended plugin read/write support verified.
4. Provide manual run fallback and show only actual verified saved research outcomes.

**ChatGPT research / synthesis recipe:** ChatGPT performs public web/literature research and synthesis, optionally scheduled through Tasks after actual MCP verification; TrialAgents saves publication sources, screening records, and reports.

**Illustrative end-to-end user journey:** PI defines literature topic → ChatGPT finds candidate papers → queue screening → saves citation-backed synthesis.

**Acceptance cases:** DOI IDs dedupe, no unlicensed full text rehost, analysis vs publisher metadata separated, no fake active task.

**Future four-frame preview storyboard:** Dark paper radar → literature feed → screening kanban → cited summary.

---

## RS-04 — Grant Pipeline (7 screens)

**Primary users:** Principal investigators, research-development coordinators, small biotech grant leads. **User job:** Find suitable calls, assess eligibility and coordinate deadlines, proposal tasks, funding outcomes.

**Benchmark:** Instrumentl — grant search, opportunity qualification, application pipeline and reporting.

**MVP boundary:** No grant portal submissions, disbursement processing, accounting system or mandatory funder integration; eligibility always human-reviewed.

**Suggested UI identity:** Forest with plum accents, dark-teal #243B40 funding KPI with document/calendar icon, white process screens.

**Proposed persistent records / fields:** Funder (name, country, public URL); Grant Call (identifier, topic, eligibility, deadline/version, funding cap and currency); Research Project; Eligibility Evaluation (criterion, state, evidence, assessor); Application (call, project, lead, requested amount, stage, submitted date); Milestone (task, owner, due, status); Award (amount, date, verified source); Reporting Obligation (due, owner); Discovery Evidence (URL, observed-at).

**Core measures and derivations:** Funding pipeline values by currency/stage not accepted cash; awards counted only after recorded official outcome; deadline version preserved; on-time submission uses due-date and actual submitted date.

### Screen 1 — Funding Overview (Dashboard)

**Composition:** Dark upcoming funding-deadline tile and light application KPI summary.

**Chart / icon treatment:** Amount by pipeline stage bars, source currency per series, and 90-day milestone list.

1. Show open calls, approaching deadlines, applications submitted and awards as separate metrics.
2. Filter by investigator, research program, funding source and horizon.
3. Surface unassessed eligibility and missing collaborator approvals.
4. Navigate to funder call, active application and linked deadlines.

### Screen 2 — Grant Opportunities (Tracker)

**Composition:** Vivid grant-call list with official source link and opportunity Details.

**Chart / icon treatment:** Deadline heat strip/calendar and labeled currency column.

1. Record official funder, call ID, focus area, budget cap, currency, source and deadline.
2. Link calls to relevant research projects and assigned owner.
3. Filter region, eligibility band, deadline and open/closed state.
4. Record verified revisions of official call changes without overwriting earlier deadline.

### Screen 3 — Eligibility Assessment (Form + matrix)

**Composition:** Criteria per call in rows with Yes/No/Unknown and evidence; human reviewer.

**Chart / icon treatment:** Neutral completion bar and explicit unknown/failed blockers.

1. Record scientific fit, organizational type, country, budget and collaboration requirements.
2. Attach official source/rationale to each assessment.
3. Require all mandatory criteria to be resolved before “eligible” decision.
4. Store assessment date, reviewer and revision with visible override reason.

### Screen 4 — Application Pipeline (Kanban / tracker)

**Composition:** Stage cards linking funding call and project; list on mobile.

**Chart / icon treatment:** Horizontal stage counts and distinct currency summaries.

1. Move Found → Screening → Drafting → Submitted → Awarded/Declined stages.
2. Record application lead, proposed amount, target submission date and internal reviewer.
3. Show upcoming next action and missing required material.
4. Save stage/date changes with audit trail; no silent submission.

### Screen 5 — Tasks & Deadlines (Tracker + calendar)

**Composition:** Milestones table and small time axis; owner filter.

**Chart / icon treatment:** Week/month dates with planned/actual ticks and amber overdue labels.

1. Create writing, consortium, budget review and institutional signoff tasks.
2. Assign due dates, owners, blockers and acceptance evidence.
3. Flag overdue and dependent work before submission.
4. Keep historical planned dates and completion decisions.

### Screen 6 — Grant Discovery (ChatGPT research + task setup)

**Composition:** Research criteria card, source-backed candidates and manual run control.

**Chart / icon treatment:** Dark search icon cover, recent calls by topic bars.

1. Ask ChatGPT for new funding calls that match topic, institution and geographic criteria.
2. Deduplicate by funder/call ID and review source dates.
3. Flag uncertain official criteria rather than auto-certify eligibility.
4. Offer recurring ChatGPT Tasks if supported, otherwise clear manual refresh.

### Screen 7 — Funding Reports (ChatGPT report archive)

**Composition:** Saved grant pipeline memo versions and status source table.

**Chart / icon treatment:** Requested/submitted/awarded bars with explicit currency and cohort.

1. Generate funder/project period performance from approved call and application records.
2. Ask ChatGPT for a leadership summary with cited grant identifiers and deadlines.
3. Review and save the reporting period, sources and outstanding deliverables.
4. Track post-award reporting responsibilities without assuming funder API or submission.

**ChatGPT research / synthesis recipe:** ChatGPT is responsible for web grant discovery, official source review and report prose. User or institution confirms eligibility and submits applications outside the app.

**Illustrative end-to-end user journey:** Define research interest → discover call → human eligibility review → application stage/deadline tracking → funding report.

**Acceptance cases:** No automatic eligibility guarantee; deadline source date required; different currencies not collapsed; task status never invented.

**Future four-frame preview storyboard:** Funding cutoff dashboard → opportunity list → eligibility matrix → grant pipeline/report.

---

## RS-05 — Publication Management (7 screens)

**Primary users:** Academic PI, science communications officer, publication project coordinator, manuscript lead. **User job:** Coordinate authorship, review rounds, target journal/congress and submission state without journal-platform integration.

**Benchmark:** Envision Pharma iEnvision Datavision — publication plans, manuscript stage, author review and reporting.

**MVP boundary:** Metadata/planning and human-approved contributions only; no remote journal submission, journal correspondence sending, plagiarism system or validated authorship signatures.

**Suggested UI identity:** Plum #795094, dark-indigo #332B41 publication milestone card with slim document icon and editorial white timeline.

**Proposed persistent records / fields:** Research Project; Publication Plan (type, target, owner); Manuscript (title, status, current version, source location); Author Role (person, affiliation, contribution, version-specific approval); Review Round (reviewer, feedback, due, approved date); Journal/Congress Target (name, requirements URL, due, verification date); Submission Event (actual date, method, confirmation, decision); Publication Output (DOI, published date, source); Reporting Period (cutoff, reviewed report).

**Core measures and derivations:** Manuscripts by status, completed review rounds / assigned applicable rounds, on-time date vs documented target; no fabricated journal impact or citation statistics.

### Screen 1 — Publication Overview (Dashboard)

**Composition:** Dark editorial-progress card, next submissions and author review backlog.

**Chart / icon treatment:** Stage bars and upcoming deadline strip.

1. Show planned, drafting, in-review, submitted and published manuscripts.
2. Filter project, lead author, outlet and period.
3. Highlight overdue reviews, missing author acceptance and imminent submission.
4. Open exact manuscript and source/approval history from each summary.

### Screen 2 — Manuscript Pipeline (Kanban + tracker)

**Composition:** Concept, Drafting, Review, Submitted, Revision, Published/Withdrawn columns; mobile list.

**Chart / icon treatment:** Document outline icons and subtle stage chips, no garish card themes.

1. Track current state, assigned lead, target date and next action for each manuscript.
2. Link to one nonclinical project/publication plan with stable ID.
3. Record version and journal decision history during stage changes.
4. Filter by target, owner, delay and revision status.

### Screen 3 — Authors & Contributors (Tracker)

**Composition:** Vivid author role list with professional affiliation links and version controls.

**Chart / icon treatment:** Neutral person/chain icons, no picture-based scorecards.

1. Manage professional authors, affiliations and contribution roles per manuscript.
2. Record invite accepted, declaration supplied and review/approval status per draft version.
3. Preserve all earlier author assignments after a changed order/affiliation.
4. Restrict confidential author comments to proper project permissions.

### Screen 4 — Review Management (Form + tracker)

**Composition:** Review rounds by draft version with action/decision feed.

**Chart / icon treatment:** Review completion bars and late review date badges.

1. Assign each current draft review to identified professional reviewer.
2. Collect feedback type, summary, due date and required correction action.
3. Distinguish comments resolved, reviewed and author-approved states.
4. Advance only through approved stage change; keep previous draft review records.

### Screen 5 — Journal & Congress Targets (Tracker)

**Composition:** Outlet names, official rules links, document type and target deadline.

**Chart / icon treatment:** Tiny timeline with original/updated target dates.

1. Record target outlets, scope fit, source URL, abstract/manuscript category and deadlines.
2. Compare journal or congress target requirements without paid ranking data.
3. Maintain verified source date for submission instructions.
4. Document target selection and alternative target for re-submission.

### Screen 6 — Submission Timeline (Timeline + log)

**Composition:** Month Gantt-style milestones, submission event entries and source dates.

**Chart / icon treatment:** Baseline and actual ticks, published DOI marker.

1. Set drafting, coauthor reviews, proofing, submission and revision deadlines.
2. Record actual journal submission and editor decision manually with evidence.
3. Show delay, responsible owner and required next action.
4. Retain original targets and historical resubmissions after schedule changes.

### Screen 7 — Publication Reports (ChatGPT report archive)

**Composition:** Saved editorial progress snapshots with authorized source list.

**Chart / icon treatment:** Quarterly output counts and manuscript-stage trends, no impact factor invented.

1. Aggregate approved status by research project and reporting period.
2. Ask ChatGPT for a referenced publication progress report.
3. Review/save a concise versioned narrative and its DOI/source links.
4. Compare current versus last reporting period and flag missing manuscript updates.

**ChatGPT research / synthesis recipe:** ChatGPT drafts publication status reports and may research public journal requirements, but publisher systems and consent/signoff remain out of scope.

**Illustrative end-to-end user journey:** Create manuscript plan → assign authors → gather review responses → log submission → leadership publication report.

**Acceptance cases:** Author approval version-specific; no automatic submission; DOI output linked to actual public evidence; status not upgraded without review.

**Future four-frame preview storyboard:** Editorial dashboard → manuscript stages → author-review form → submission timeline/report.

---
