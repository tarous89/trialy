# Trialy — Demo templates and clinical-operations research catalog

**Status:** Product discovery / candidate use cases, **not approved functional specifications or implemented modules**.  
**Recorded:** 20 October 2026.  
**Basis:** October 2026 research/discussion of sponsor-side clinical operations, established products and configurable trackers. Priorities below are hypotheses for product planning, not verified market-share or willingness-to-pay measurements.

## Relationship to Trialy's active scope

This catalog organizes **examples of applications users could ask ChatGPT to create** using Trialy's shared data, saved code, isolated execution, tool gateway and permissions. **It does not authorize hardcoded clinical modules, default product navigation, mandatory templates, a fixed clinical schema, predefined approval chains, or a separate component engine.** The current architecture and decisions in [README](../../README.md), [development roadmap](../../DEVELOPMENT.md), [frontend contract](../FRONTEND_CODE.md) and [write authorization](../WRITE_AUTHORIZATION.md) take precedence.

A feature here is a **customer-facing use case** assembled from customer-defined data types, records, relationships, authorized documents, generated code, views and actions. Records can be shared across projects subject to permissions. Use the generic platform `project` concept; a clinical study is one possible project, not a mandatory platform entity.

## Current demo template plan — eleven functional starting points

**The agreed showcase is one editable demonstration per function**, each with a short name: Translational Research, CMC, Nonclinical, Regulatory, Clinical, Medical Affairs, Vendors & CROs, Quality & Compliance, Finance, Business Development, and Board & Funding.

See **[11-function demo template showcase](TEMPLATE_SHOWCASE_PLAN.md)** for the names, internal deliverable/workstream/asset rollup model, the four components (trackers, forms, visualizations and automations), the single committed-data source of truth, and the current implementation/gap assessment. This is a product demonstration plan only; do not hardcode eleven modules or assume those demos are already built.

The four sections and eighteen detailed use cases **below are retained as underlying research/reference**, not the proposed template navigation and not eighteen separate build targets.

## Previous research sections — 18 candidate use cases

| Section | ID | Candidate feature | Priority |
| --- | --- | --- | --- |
| [A. Clinical development planning](01-clinical-development-planning.md) | DEV-01 | [Development program tracker — detailed researched scope](DEV-01-development-program-tracker-scope.md) | P1 |
| | DEV-02 | Trial planning tracker | P1 |
| | DEV-03 | Regulatory submission readiness | P2 |
| | DEV-04 | Study feasibility assessment | P2 |
| [B. Outsourcing and vendor selection](02-outsourcing-and-vendor-selection.md) | OUT-01 | CRO/vendor qualification | P1 |
| | OUT-02 | RFP management | P1 |
| | OUT-03 | Proposal comparison and evaluation | P1 |
| | OUT-04 | Contract and statement-of-work (SOW) tracker | P1 |
| | OUT-05 | Budget and change-order tracker | P1 |
| [C. Study startup and site management](03-study-startup-and-site-management.md) | START-01 | Site/PI identification and selection | P2 |
| | START-02 | Site activation tracker | P2 |
| | START-03 | Study document completeness | P1 |
| [D. Ongoing study and company operations](04-ongoing-study-and-operations.md) | OPS-01 | CRO performance and deliverables oversight | P1 |
| | OPS-02 | Risks, issues, actions and decisions | P1 |
| | OPS-03 | Meetings and action follow-up | P1 |
| | OPS-04 | Document review and approvals | P1 |
| | OPS-05 | SOP and training tracker | P2 |
| | OPS-06 | Executive study reporting | P1 |

**Priority meaning:** P1 = proposed initial customer-facing workflows; P2 = potential next expansion. Neither means that implementation is complete. Use-case applicability depends on sponsor size, phase, study design and outsourced responsibilities; do not assume that every biotech handles site selection or other CRO-led work internally.

## Shared capabilities that can compose all use cases

The following are **desired functional ingredients**, not a requirement to build a fixed library of visual components. ChatGPT should generate the appropriate saved application/code from authorized structures and available tools.

| ID | Capability | Candidate behaviors |
| --- | --- | --- |
| CAP-01 | Customer-defined connected records | Add/reuse types, optional typed fields, tables, stable identities, relationships, project links, source observations and provenance; avoid duplicated CRO/site/person records across workflows. |
| CAP-02 | Editable views and forms | Inline edits, detail inspection, validation, manual and proposed batch edits, filtering, search and reusable saved views; retain explicit shared-data versus view-configuration save targets. |
| CAP-03 | Visualizations | Tables, forms, Kanban-like status views, calendars, timelines, comparison grids, scorecards, charts and dashboards authored as saved frontend code where supported. |
| CAP-04 | Documents and communication references | Named file assets, document metadata, links to external sources, version references, reviewer state, document requests and proportionate evidence links; no default saving of all email histories. |
| CAP-05 | Calculations and evaluations | Totals, due/overdue values, budget variance, weighted vendor evaluations, completeness metrics and derived aggregates; preserve inputs and formulas; do not silently overwrite derived results. |
| CAP-06 | Questionnaires and collections | Configurable request/response forms, validation, permitted sharing and staged external responses that are reviewed before database acceptance. |
| CAP-07 | Tasks and dependencies | Assignees, due dates, milestone status, dependencies, reminders, checklists, escalations and recurring review cycles. |
| CAP-08 | Event and scheduled workflows | A status/date/submission/authorized event can propose or perform an explicitly permitted follow-up; track attempts, failures, retries and duplicate prevention. |
| CAP-09 | AI-assisted work | Extract relevant facts from provided/authorized documents, prepare comparisons and summaries, suggest schema/data changes, reconcile possible matches and display exact proposals. ChatGPT does not automatically observe all conversations or sources. |
| CAP-10 | External integrations | User-authorized email, calendar, Drive/SharePoint or clinical systems through separately provisioned providers/adapters; reading one source does not grant permission to write or send to another. |
| CAP-11 | Sharing, collaboration and approvals | Assign work, scoped internal/external access, comments/decisions, review cycles, approved data changes and outward actions with bounded grants. |
| CAP-12 | Audit, history, security and recovery | Human/AI rights separated; per-field before/after, actor, source, authorization/grant evidence; source/document/component versions, access checks, inspected reversals and durable recovery. |

## Universal constraints and review rules

1. **No assumed fixed workflow:** Customer/project/task context controls the generated data and UI. Suggested fields in the section files are *examples*, not universal required schema. The user can change a workflow without rewriting Trialy's shared foundation.
2. **Explicit approval before database writes:** New records, edits, imports, reconciliations and workflow-generated writes must show an exact diff and receive authorization by default. Only a specific revocable, expiring **data-type** permission can allow future writes in its declared scope. Approved setup does not grant blanket future updates.
3. **Manual edits are also controlled:** Typing in an editable view is not a database commit. Review the actual destination and impact; enforce versions and permissions server-side. Generated code cannot approve its own write.
4. **Keep observed, inferred and planned states distinct:** A drafted RFP is not sent; a short-listed CRO is not selected; a site under assessment is not active. Sources and uncertainty survive corrections.
5. **Data minimization and provenance:** Collect only facts relevant to the authorized tracker inclusion criteria. Preserve accepted original documents, link support where available and protect restricted source content.
6. **Separate authority for actions:** A database update does not automatically authorize sending email, sharing documents, signing, submitting to regulators or triggering unrelated tools. Each action follows its own scope, grant and review.
7. **Trace and recover changes:** Keep changed-field histories, component/file versions, who approved or granted authority, failure outcomes and safe reviewed reversal paths.
8. **Never assume CRO and sponsor responsibilities:** Support fully outsourced, functional outsourcing and sponsor-managed configurations. Phase and regional applicability are use-case-specific, not hardcoded.
9. **Non-patient data only:** No patient records, EDC, patient recruitment identifiable information, adverse-event processing or clinical safety case management in this catalog.
10. **No compliance equivalence claim:** A tracker for documents/training/site startup is not automatically a validated eTMF, eQMS, regulatory publishing system, Part 11 electronic signature system, or CTIS submission tool. Link/integrate specialized systems when needed.
11. **Current runtime limits remain:** Saved generated frontend uses the bounded `frontend-js` render/event runtime, not unrestricted DOM/React/npm. Externally connected email/calendar providers, real-host acceptance and production recovery have outstanding gates (see [DEVELOPMENT.md](../../DEVELOPMENT.md)).
12. **Cross-workflow continuity:** Where explicitly modeled and authorized, proposal/vendor records may be referenced in subsequent contract, budget and oversight work without automatic broad merging or scope expansion.

## Candidate walkthroughs (not system promises)

- **Plan to CRO award:** user scopes a study -> records approved study assumptions -> compares candidate vendors -> reviews RFP responses -> approves selection -> reuses vendor/commitment references in oversight.
- **Proposal intake:** a user supplies or authorizes a proposal document -> AI suggests structured scope/budget/exclusion fields -> exact review/approval -> comparison refresh -> optional separately authorized follow-up.
- **Site selection to activation:** user records a site selection decision -> proposed activation checklist and assignments -> review/approval -> milestone tracking. This does not claim responsibility for a CRO-owned process.
- **Overdue deliverable:** a due date is passed -> status/summary reflects it -> optional prepared reminder/escalation -> outgoing action only under applicable authorization.

## Market comparables to investigate further

Clinical development/planning: TrialHub, Citeline Trialtrove, Kivo, Oracle ClearTrial. Outsourcing: Oracle ClearTrial, Science Exchange, commercial CTMS/vendor systems. Study startup: Veeva Study Startup and eTMF, TrialHub. Ongoing oversight and documents: Medidata Rave CTMS, Qualio, Kivo, Veeva eTMF, plus spreadsheets and Microsoft 365 tools. **Named competitors are research reference points, not assertions that Trialy implements, matches or replaces their specialist capabilities.** Collect source-specific customer/review evidence and direct sponsor interviews during detailed specification.

## Exact specification template to fill later — per feature

Each feature file below intentionally stops at an **implementation-neutral candidate scope**. A later dedicated specification should explicitly define:

- Target persona, lifecycle trigger, sponsor/CRO division of responsibility and actual validated customer problem.
- Entry prompt and user journeys, including edge cases, manual alternatives and expected results.
- Optional suggested data types/fields/relationships, inclusion rules, provenance, imports and preservation of existing identities.
- ChatGPT-generated interface behaviors, views, editable surfaces and trusted save/review boundaries.
- Calculations, scoring, date logic, state transitions and source of truth.
- Trigger/actions graph: conditions, recipient selection, proposed change versus external side effect, permissions, retries, idempotency and cancellations.
- Connections, providers and external/regulated systems that remain the system of record.
- Role-specific human and AI access, sensitive fields, restricted files, sharing and approved grants.
- Audit/history/version/recovery acceptance scenarios, error states and explicit non-goals.
- Technical fit against [execution](../EXECUTION.md), [frontend](../FRONTEND_CODE.md), [shared data](../SHARED_DATA.md), [write authorization](../WRITE_AUTHORIZATION.md) and [interface rules](../INTERFACE_RULES.md).
- Market evidence, willingness-to-pay tests, final priority, measurable success criteria, acceptance tests and implementation decision.

**Unresolved by design:** Exact schema, UI, step sequence, workflow logic, default configuration, external integrations, regulatory validation, migration and implementation/acceptance are **TBD**, not silently agreed.
