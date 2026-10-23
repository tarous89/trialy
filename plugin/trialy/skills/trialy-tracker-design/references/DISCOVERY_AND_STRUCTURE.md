# Universal tracker discovery, decisions and structure

Read for every *new tracker*, every major re-scope, and whenever users complain that the tracker has no clear story. Domain examples illustrate the process; never make them universal fields.

## Table of contents
1. The problem-first discovery sequence
2. Scoping and granularity rules
3. Deriving tabs from decisions
4. Evidence and prioritization
5. Fields and content granularity
6. Reusable example library
7. Anti-patterns

## 1. Problem-first discovery sequence

A template is a **doorway that makes a problem recognizable**. It is not a feature catalogue or preconfigured enterprise suite. Begin with an observable customer problem:

1. Identify the target operator (e.g., head of development, project coordinator, CMC scientist, finance lead, people lead, CEO).
2. Capture a plain-language request they might actually type, with a precise goal, constraints and deadline.
3. Identify the **work object** whose state changes (engagement, study, assay package, grant application, recruitment requisition, financing round, approval package, board meeting).
4. Identify the lifecycle from first entry to meaningful completion, optionally with branches. What is the first real action? What decision advances the case? What closes it?
5. Identify information gathered at each transition and who can vouch for it.
6. Identify the success / stop / block conditions, must-pass criteria, owners and necessary evidence.
7. Identify the lowest-friction information capture paths: direct editing, simple Add record form, linked document, external submission, approved update proposal.
8. Only then organize tabs and pick table/graph shapes.
9. Test the proposed story against a small-team workflow: Can 5–20 people understand it without an implementation consultant?

**Evidence hierarchy:** actual small-team user description/interview > named small-biotech customer case > authentic product support/feature documentation > generic vendor marketing > speculative example. A tool serving large pharma may provide useful workflow mechanics, but is not proof of fit or heavy adoption among small biotechs. Cite what claims are supported and label conjecture. Research when the domain is unfamiliar, dynamic, or heavily specialized. Do not fake statistics or quotations. Avoid delaying obvious prototyping with exhaustive research when user already supplied concrete workflows.

**Story prompt format:**
> “We are [small organization/context]. We must [objective] by [time]. We have [candidates/work/participants], need to collect [critical facts], choose [decision], and keep [evidence/next steps] visible.”

**One-line pitch:** “From [starting uncertainty] to [defensible completion] without losing [responsibilities/evidence/decisions].”

## 2. What deserves its own tracker?

- **Execution tracker:** a meaningful output with a lifecycle, accountable owner, planned/actual progress, internal steps and acceptance. “Complete formulation stability package,” “Select a CRO for first-in-human study,” “Close Series A fundraising,” “Hire Head of Regulatory.”
- **Operational register:** a list of durable reusable entities and states; may be a tab rather than a separate tracker. “Approved vendors,” “SOP inventory,” “investors,” “contracts,” “open issues.”
- **Overview/rollup:** computed/derived view across child work or related entities. “CMC readiness,” “asset overview,” “board update,” “all recruitments.” Never a copied, independently edited truth unless the user expressly manages a new distinct fact.

Split work into separately connected trackers when it has a distinct deliverable, independent accountability, own timeline or meaningful dependency/oversight need. Do **not** split every email, meeting, question, or checkbox into a new tracker. Conversely, do not flatten an enormous cross-functional program into a single undifferentiated row.

Internal optional hierarchy: company → asset/program → workstream → deliverable/work package tracker → steps & milestones. Corporate work can sit directly under company. A regulatory workstream may aggregate CMC + nonclinical + clinical evidence; an outsourced vendor can link to all of them. Not every customer tracks multiple assets. Do not force parent creation as a prerequisite to one tracker.

## 3. Turn the story into tabs

A tab is **a view centered on a distinct recurring action/decision**, not necessarily a separate database table. Often three to six tabs suffice; fewer are fine. Five tabs were approved for the *Vendor Selection example*, not a mandatory count everywhere. Organize by the operator's workflow, or by genuinely distinct recurring information types if the work has no lifecycle. For each proposed tab specify:

| Question | How to use it |
| --- | --- |
| Why does this tab exist? | Express a user question, not a technology label |
| Which records does it show? | Reuse stable canonical objects where possible |
| What is the next user action? | Add, update, request, compare, decide, close, follow up |
| Which 4–6 fields matter at a glance? | Select visible columns; everything else in details/hidden columns |
| What evidence is required? | Source link/text, timestamp, responsible person, document version |
| What should not go here? | Duplication, speculative metrics, unrelated features |

**Overview is not an extra database table by default.** It should compute key counts and dates from contributing tabs and show a concise, filtered list of records requiring updates, decisions, follow-ups, resolution or attention. Exclude records with no actionable updates. If no action is required, give an honest all-clear empty state. Where truly useful, 2–4 dark metric cards with small existing icon style, reflecting verifiable current records; no phantom graphs.

For a multi-entity list, support filtering, sort and (where ranking is part of the decision) **manual ranking**. Avoid giving implicit automated merit rankings. Preserve material decision rationale, mandatory eligibility and disqualification as distinct from qualitative preferences.

## 4. Select essentials and extensions

- **Essential:** needed to perform this particular real task even in a small team; show as visible columns or direct details. E.g., person, deadline, status, next action, source; budget for a quote comparison, candidate identity for hiring, training version for SOP acknowledgment.
- **Specialized:** essential only for applicable technical, jurisdictional, service or regulatory contexts; show after confirming relevance. E.g., modality-specific assay, controlled-substance import, country ethics evidence, manufacturing GMP/GLP audit, clinical trial population planning at non-patient level.
- **Nice to have:** predictive analytics, heavyweight scoring, complex reporting, deep integrations, multi-stage approvals or ROI modeling not necessary for the first story. Keep out of initial demo unless explicitly requested.

At each field ask:
- **Need:** Which decision depends on it?
- **Origin:** Who collects it, from what source, and is it observed, planned, derived or inferred?
- **Identity:** Is this a shared entity fact, relation-specific value, or presentation-only value?
- **Cardinality:** One value, a list, or a linked record? Keep contact multiple if appropriate.
- **Visibility:** Always visible, hidden until detail, or only in settings?
- **State:** Can it be blank or unknown? Do not replace unknown with negative/zero.
- **Edit rule:** Who can edit, and does the field need approval or a source revision?
- **Lifecycle:** Does it change, expire, require refresh, or retain history?

Keep initially shown table columns few and meaningful; **do not drop hidden fields** from layout or details. A “CRO” name in a qualification view should normally come from the linked vendor rather than both a copied name and vendorID disguised as another visible CRO.

## 5. Components and visuals decision tree

| Need | Use | Avoid |
| --- | --- | --- |
| Compare records | Table; optionally side-by-side detail view | Pie charts for comparisons |
| Record small additions | Add record form / editable cell | Large wizard for 3 values |
| Collect external answers | Narrow form with pending review | Automatic unreviewed database save |
| Monitor deadlines | Filtered action table or simple timeline | Gantt with invented dependencies |
| Assess coverage | Calculated completion / missing evidence | Arbitrary “AI score” |
| Show spending | Line-item table, actual vs committed, only when data supports it | Invented budget allocations |
| Summarize multiple trackers | Derived Overview, optionally key milestones chart | Copied overview status manually updated |
| Recurring housekeeping | Scheduled function / authorized task proposal | Unscoped automated email/write |

Every visualization must have clear source, filters, calculation, currency/unit and as-of date. Never chart fictional business categories as if discovered from an uploaded SOW.

## Demonstration catalog: eleven optional functional doors

The agreed Trialy discovery gallery has **one example per recognizable function**, not eleven fixed backend modules: **Translational Research; CMC; Nonclinical; Regulatory; Clinical; Medical Affairs; Vendors & CROs; Quality & Compliance; Finance; Business Development; Board & Funding.** These titles should be short and relatable. The gallery demonstrates what users *can* create, not what all users *must* create. An individual team may have one main asset, parallel functional work, outsourced providers and company-level finance/funding. Build one clean demo per function when asked; do not pre-build elaborate sub-workflows or enforce the same tabs in all eleven.

The Vendors & CROs example established **two distinct workflows with connected data but not interchangeable tab content**: a project/service-specific selection decision (Overview / Vendors / RFP / Qualification / Contracting), and relationship management for a selected provider (Overview / Contracts / Deliverables / Budget / Invoices). Those are *illustrative reusable patterns* of sourcing/award versus ongoing contracted work, not mandatory tabs for finance, research, HR or other domains. The selected provider and agreed contractual baseline should be referenced via shared records, not retyped into a second dataset.

## 6. Cross-domain examples — illustrative only

### Vendor selection (the origin example, not universal structure)
- Story: identify qualified providers for **one service inside one project**; shortlist, request bids, compare documented requirements, qualify and contract.
- Tabs: Overview, Vendors, RFP, Qualification, Contracting.
- Essential facts: provider identity/region/contact; project-specific suitability; sending evidence and date/time; proposal receipt and follow-ups; requested service and exclusions; quoted budget; technical criteria defined by the service; choice and quality gate; scoped signing actions.
- Do not score automatically by default; rank manually if required; use one canonical provider identity.

### Preclinical/nonclinical deliverable
- Story: run one study/package across sponsor, test facility and supporting lab to final accepted report.
- Candidate views (adapt to user): Overview, Study Plan, Materials, Deliverables, Issues.
- Content: study objective, plan/protocol reference, ownership, dates and milestones, material readiness and vendor deliverables, report review/acceptance. GLP/assay-specific fields only where warranted.

### Finance
- Story: track approved spend for one initiative and explain committed, invoiced and paid amounts.
- Candidate views: Overview, Budget, Commitments, Invoices, Actions.
- Content: versioned planned vs committed, amount/currency, invoice link, due and paid dates, cost owner, source. Avoid claim to be a general ledger or payment processor.

### Fundraising
- Story: move a financing round from prospective investors to a completed financing decision.
- Candidate views: Overview, Investors, Outreach, Diligence, Closing.
- Content: investor identity reused, contact/owner, consented outreach status, meetings, next action, requested materials, NDA/diligence, confirmed commitments (not speculative cash). Restrict financial materials.

### HR onboarding
- Story: onboard a new employee to readiness with owned tasks and required acknowledgments.
- Candidate views: Overview, People, Tasks, Documents, Training.
- Content: employment-specific work owner, due dates, checklist status, scoped documents, completion evidence. Pay/personal details may need tighter field access; do not expose sensitive records to an unreviewed AI or whole-team overview.

### Corporate board
- Story: prepare a meeting, collect authorized materials, decisions and follow-ups.
- Candidate views: Overview, Agenda, Materials, Decisions, Actions.
- Content: date, owner, review status, approval source, decision authority, action due. A draft agenda is not a board-approved resolution.

Examples demonstrate the **method**; do not treat proposed tabs as standard domain schemas. Different users may require fewer tabs or very different groupings.

## 7. Avoid these failure modes

- Designing a feature table before discovering the user's story.
- Assuming small biotech teams run multi-asset portfolios; neglecting parallel functional work around a single lead asset.
- Making CMC, regulatory and clinical a rigid hierarchy when activities overlap.
- Blending exploratory RFP comparison, formal qualification and contracting into one vague “vendor status.”
- Creating a scoreboard without evidence, or comparing headline costs when scope/exclusions differ.
- Treating a vendor's project-specific suitability as a global vendor fact.
- Showing excessive card panels, snapshots and other unrelated content on every tab.
- Assuming every tab or form needs a separate table, or every tracker needs its own copied people/organization records.
- Turning every element into a date picker/status icon; keep date/dropdown controls visually quiet.
- Treating generated content, unsent email, pending approval and unverified source as accomplished facts.
