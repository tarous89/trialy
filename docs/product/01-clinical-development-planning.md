# A. Clinical development planning

**Status:** Candidate use cases only; detailed functional/technical specs TBD.  
[Catalog and universal guardrails](README.md) · [Active architecture](../../README.md)

**Lifecycle:** From program/company setup through planning a new study, potentially before selecting any CRO. **Typical users:** CMO, Head of Clinical Development, Clinical Director, Clinical Operations Director, Regulatory Lead, COO and program managers. Exact responsibilities depend on company size and outsourcing model.

## DEV-01 — Development program tracker (P1)

- **User need:** Maintain one accessible overview of assets, indications, planned/current studies, development objectives and decision gates.
- **Timing/users:** CMO, Head of Development, COO; as programs are created and expanded, including before first-in-human planning.
- **Candidate information:** Program/asset reference, indication, workstreams, study/project references, phase, key assumptions, expected milestones, owners, target/actual dates, latest decisions and linked evidence documents. All fields optional and task-defined.
- **Views and interactions:** Program portfolio table, cross-program roadmap/timeline, decision log, overdue milestones and management summary; manual/AI-proposed changes via reviewed data bindings.
- **Possible triggers:** New milestone or date change creates a *proposed* follow-up; upcoming development gate triggers a reminder or a draft update; meeting decisions may be proposed for linked project records.
- **Boundaries:** Not a scientific asset knowledge base by default, portfolio forecasting engine or regulatory authority system. Keep each project's factual scope distinct from shared person/organization records.
- **Comparable offerings to study:** Microsoft Project-style portfolio tracking; Kivo document/program workflows.

## DEV-02 — Trial planning tracker (P1)

- **User need:** Capture a planned study's operating assumptions before outsourcing and maintain study readiness as choices change.
- **Timing/users:** Clinical Director, Clinical Development Lead, CMO; planning new Phase I–III studies.
- **Candidate information:** Study purpose, protocol/status reference, phase, indication, target countries/population *at aggregate planning level only*, intended services, sponsor/CRO responsibility allocation, startup assumptions, milestones, dependencies, budget targets, owners, decisions and source documents.
- **Views and interactions:** Study readiness checklist, milestone timeline, scope/assumptions table, responsibility matrix, unresolved decisions and linked plan documents. Generated workflow is adaptable to a full-service CRO or functional outsourcing.
- **Possible triggers:** Scope revision proposes updates to RFP requirements, timetable and ownership records; upcoming gate prompts a readiness review; approval can establish a versioned planning baseline.
- **Boundaries:** Does not calculate proprietary trial costs, finalize protocol science or assume the sponsor manages sites directly. Do not treat planning assumptions as clinical facts.
- **Comparable offerings:** Oracle ClearTrial planning, enterprise project-management tools and sponsor study planners.

## DEV-03 — Regulatory submission readiness (P2)

- **User need:** Know which operational/regulatory preparation items and documents are complete, pending review or blocking an upcoming submission.
- **Timing/users:** Regulatory Lead, Medical/Clinical Director, external regulatory consultant; pre-IND/CTA and during subsequent amendments.
- **Candidate information:** Submission/milestone references, jurisdiction, expected artifacts, responsible author/reviewer, requested/received dates, version links, review status, open questions, handoff/approval notes and dependencies.
- **Views and interactions:** Submission readiness matrix, country/region checklist, missing-item queue, versioned evidence links and deadline calendar.
- **Possible triggers:** Document received -> propose checklist status change; nearing deadline -> reminder; blocked review -> escalation draft; approval captured in the tracker with history.
- **Boundaries:** **Readiness coordination only**. No automatic official submissions, regulatory content validation, eCTD publishing, CTIS agency connectivity or legally compliant e-signature claim.
- **Comparable offerings:** Kivo regulatory document workflows; Veeva-regulatory preparation tools.

## DEV-04 — Study feasibility assessment (P2)

- **User need:** Compare candidate countries or operational approaches and record why an evidence-based decision was made before locking the plan.
- **Timing/users:** Head of Clinical Operations, clinical strategy/feasibility leads and sometimes CRO feasibility staff; planning patient-based studies, often Phase II–III but context-specific.
- **Candidate information:** Countries, study assumptions, external trial-landscape sources, competing-trial observations, expected operational constraints, data gaps, scoring criteria, decision rationale and source/date.
- **Views and interactions:** Country comparison grid, editable weighted scorecard, evidence links, assumptions log and selected/not-selected review.
- **Possible triggers:** Newly authorized evidence leads to an *update proposal*; approved country shortlist can be linked to trial plans or draft RFP scopes.
- **Boundaries:** Trialy does not include proprietary epidemiology, patient counts, live country/site performance benchmarks or recruitment predictions simply by providing a scorecard. Use reviewed external sources/integrations where authorized; protect source licensing.
- **Comparable offerings:** TrialHub and Citeline Trialtrove for underlying intelligence, alongside configurable sponsor decision matrices.

## Later specification work

Resolve per-feature data bindings, source-of-truth rules, exact user prompts, permissioned edits, UX, evidence of customer adoption, phase applicability, any external data licensing, and acceptance tests using the [catalog specification template](README.md#exact-specification-template-to-fill-later--per-feature). No fixed product module or schema is authorized by this document.
