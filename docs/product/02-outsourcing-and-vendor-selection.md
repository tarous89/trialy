# B. Outsourcing and CRO/vendor selection

**Status:** Candidate use cases only; detailed functional/technical specs TBD.  
[Catalog and universal guardrails](README.md) · [Active architecture](../../README.md)

**Lifecycle:** From defining an outsourcing strategy to selecting CROs or functional vendors and recording the contracted baseline. **Typical users:** CMO, Head/Director Clinical Operations, procurement, Finance, Legal and project managers. Do not assume one full-service CRO; workflows may involve multiple specialist providers.

## OUT-01 — CRO/vendor qualification (P1)

- **User need:** Find and assess eligible external suppliers and preserve a reusable, permissioned vendor history.
- **Timing/users:** Head of Clinical Operations, CMO, procurement; before clinical studies and whenever a specific service is outsourced.
- **Candidate information:** Organization/person identities, service lines, countries, relevant experience *with evidence*, contacts, qualification documents, evaluation criteria, responses, engagement history when included in approved scope, shortlist reason/status and prior projects.
- **Views and interactions:** Vendor directory, service/country filter, questionnaire form, qualification grid, shortlist and decision notes.
- **Possible triggers:** A reviewed questionnaire reply proposes vendor-field updates; missing qualification items generate task/reminder proposals; shortlisted vendors can be referenced from an RFP.
- **Boundaries:** Supplier discovery is not inherently a proprietary verified CRO directory. Reuse known organizations without auto-merging unrelated records or accepting unsupported trial-experience claims.
- **Comparable offerings:** Science Exchange sourcing/qualification; sponsor procurement/CTMS vendor registers.

## OUT-02 — RFP management (P1)

- **User need:** Coordinate creation, distribution, response and clarification for vendor bids without losing history in email and spreadsheets.
- **Timing/users:** Clinical Operations Director, sourcing/procurement and program lead; before award of a CRO, central lab or other service provider.
- **Candidate information:** RFP version/scope, invited vendors, services, requirements/questionnaires, release and response deadlines, contacts, response status, documents, clarifications, outstanding questions, decisions and authorizations.
- **Views and interactions:** RFP pipeline/status board, vendor-response matrix, deadline calendar, document links, clarification log and internal review list.
- **Possible triggers:** Invitation approved -> draft or send only through separately authorized provider action; response received -> proposed extraction/attachment/status change; deadline approaching -> reminder.
- **Boundaries:** Drafting/saving is not sending. External provider adapter, recipient approval, delivery outcomes and retries are separate concerns; no blanket outgoing-email authority.
- **Comparable offerings:** Oracle ClearTrial Plan and Source vendor RFP and bid workflows.

## OUT-03 — Proposal comparison and evaluation (P1)

- **User need:** Compare otherwise inconsistent vendor proposals and record a reproducible, reviewable selection rationale.
- **Timing/users:** CMO, Director ClinOps, Finance, committee members; after RFP responses and before vendor selection.
- **Candidate information:** Proposal/version links, service scope, activities, exclusions, assumptions, milestones, currency/amounts, optional rate breakdown, reviewer scores, weighting rules, comments, approvals and award decision.
- **Views and interactions:** Side-by-side comparison matrix, cost/scope breakdown, weighted scoring and scenario views; manual corrections and AI-generated extraction proposals with original-source citations.
- **Possible triggers:** New proposal version -> propose recalculation/review tasks; approved shortlist/selection -> reference chosen vendor and agreed commitments in contract/study work.
- **Boundaries:** Extraction does not establish correct commercial comparability. Missing data is not zero, quoted cost is not predicted actual spend, scoring is configurable and decisions require responsible human review.
- **Comparable offerings:** Oracle ClearTrial bid grids/comparisons; procurement bid-scoring workflows.

## OUT-04 — Contract and statement-of-work (SOW) tracker (P1)

- **User need:** Know which supplier agreements, deliverables and obligations were approved and whether contracts/amendments are current.
- **Timing/users:** ClinOps Lead, Finance and Legal; contract negotiation, execution and ongoing amendments.
- **Candidate information:** Vendor, contract/SOW references and versions, project scope, obligations, milestones, effective/expiry dates, owners, financial terms/commitments, approval state, linked agreements and change orders.
- **Views and interactions:** Contract register, obligation/deadline list, vendor-to-study link, committed-versus-delivered matrix and amendment history.
- **Possible triggers:** Renewal/deadline -> notification; amendment uploaded -> proposed obligations changes; final review -> explicit approval state update.
- **Boundaries:** Does not imply contract legal review, enforceable digital signature, contract-authoring engine or automatic extraction accuracy. External signing depends on approved provider integration.
- **Comparable offerings:** Veeva commercial/clinical contract management; sponsor-side contract registers.

## OUT-05 — Budget and change-order tracker (P1)

- **User need:** See baseline versus contracted, forecast and actual vendor spend, with traceable change orders and approvals.
- **Timing/users:** Finance/COO, Director ClinOps, vendor manager; from initial outsourcing plan through study execution.
- **Candidate information:** Baseline version, vendor/service/cost category, currency, planned/contracted/invoiced/paid amounts, dates, assumptions, invoice links, change-request rationale, decision state and authorization evidence.
- **Views and interactions:** Budget-line table, variance calculations, vendor totals, change-order pipeline, time-phased views and linked contract/proposal records.
- **Possible triggers:** Proposed change exceeding a user-defined threshold -> reviewer assignment; approved change -> **proposed** budget baseline update; overdue invoice review -> task.
- **Boundaries:** No proprietary industry cost benchmark/forecasting engine, payment processing, general ledger, revenue recognition or assertion that the tracker replaces regulated finance/accounting systems. Money-handling actions require explicit separate controls.
- **Comparable offerings:** Oracle ClearTrial costing/proposals; clinical finance modules and general finance trackers.

## Later specification work

Define proposal extraction limits, account/provider integrations, forms, review/selection decision authority, approval and budget thresholds, calculations, currencies, provenance, human/AI field permissions, exact events, idempotency and acceptance tests. Do not implement fixed procurement modules merely because these examples are recorded.
