# D. Ongoing study and company operations

**Status:** Candidate use cases only; detailed functional/technical specs TBD.  
[Catalog and universal guardrails](README.md) · [Active architecture](../../README.md)

**Lifecycle:** After planning and vendor selection, through execution, oversight and internal company coordination; some features begin earlier or serve non-study projects. **Typical users:** Sponsor CTM, Clinical Director, Head of Clinical Operations, CMO, Regulatory/Quality, Finance and management.

## OPS-01 — CRO performance and deliverables oversight (P1)

- **User need:** Evaluate whether outsourced providers fulfill agreed milestones, deliverables, scope and operational commitments.
- **Timing/users:** Sponsor CTM/Clinical Director, vendor manager, program leader; from contract award onward.
- **Candidate information:** Vendor/study/contract/SOW references, commitment baseline, deliverable owner, due date, received/accepted date, progress update, KPIs, blocked items, evidence links and performance review decisions.
- **Views and interactions:** Vendor-by-deliverable matrix, overdue list, milestone timeline, issue linkage, budget/contract exposure and sponsor executive status report.
- **Possible triggers:** Missed milestone -> flag and propose escalation; approved change order -> propose a linked commitment revision; periodic reporting creates summaries from authorized records.
- **Boundaries:** Sponsor-side oversight does not automatically replace the CRO's CTMS or independently verify every CRO update. Actual versus claimed completion and contractual acceptance should remain distinguishable.
- **Comparable offerings:** Medidata Rave CTMS, sponsor oversight trackers and general project systems.

## OPS-02 — Risks, issues, actions and decisions (P1)

- **User need:** Provide an accountable, cross-functional record of blockers, risks, mitigation work and material decisions.
- **Timing/users:** ClinOps, CMO, project and quality leads; throughout development and outsourced delivery.
- **Candidate information:** Type (risk/issue/action/decision), project/vendor link, description, severity/impact, likelihood when used, owner, target date, state, mitigation plan, escalation notes, decision authority, source and closure evidence.
- **Views and interactions:** RAID-style register, owner queue, risk matrix, escalation dashboard and linked study/contract views.
- **Possible triggers:** Severity/overdue threshold -> approved notification/escalation; closed issue -> record resolution evidence; decision -> reviewable downstream task proposal.
- **Boundaries:** No automatic medical, safety or quality determination. Adverse-event/case processing and patient safety signal management are outside initial scope.
- **Comparable offerings:** CTMS issue logs and clinical operations trackers.

## OPS-03 — Meetings and action follow-up (P1)

- **User need:** Turn sponsor/CRO governance discussions into owned, traceable actions and decisions, minimizing missed follow-ups.
- **Timing/users:** CTM, Clinical Operations Director, program/operations teams; regular internal and vendor meetings.
- **Candidate information:** Meeting/reference, date, participants, agenda/document links, decisions, action items, named owner, due date, linked risk/vendor/study and follow-up status.
- **Views and interactions:** Meeting list, action-by-owner board, due-date calendar, decision log and cross-reference to project records.
- **Possible triggers:** Authorized meeting notes -> AI suggests actions/decisions -> exact review; new approved action -> task/reminder; overdue item -> draft follow-up.
- **Boundaries:** Do not capture or retain full communications automatically. Meeting transcription/recording and external invites require source-specific consent, integration and permissions; note extraction is not proof a decision was approved.
- **Comparable offerings:** Microsoft Lists/Project/Teams-driven operations and study CTMS task tracking.

## OPS-04 — Document review and approvals (P1)

- **User need:** Coordinate internal/cross-party document drafting, review, revision and decisions without confusing an informal signoff with a regulated e-signature.
- **Timing/users:** Regulatory, Clinical, Quality and document owners; across program and study lifecycles.
- **Candidate information:** Document identity, approved/linked original version, owner, reviewer list, draft/review state, due dates, reviewer comments/decisions, superseded reference and approval evidence.
- **Views and interactions:** Review queue, version comparison references, reviewer status, overdue dashboard, missing-approval checklist and linked document detail.
- **Possible triggers:** New controlled version -> review tasks; all permitted reviews complete -> final human decision request; review rejection -> return-to-author tasks.
- **Boundaries:** Stored approval evidence is not automatically Part 11 e-signature compliance, validated document management, regulatory publishing or legal signoff. Respect separately enforced file/human/AI access rules.
- **Comparable offerings:** Kivo, Qualio and Veeva document workflows.

## OPS-05 — SOP and training tracker (P2)

- **User need:** Know which company procedures and training assignments exist, are due or have been acknowledged.
- **Timing/users:** Quality Lead, operations owner, functional managers; can begin before the first clinical study and expand as the team grows.
- **Candidate information:** SOP/document version link, owner, revision/review date, role-specific training assignments, training due date, acknowledgement evidence, expiry/retraining condition and exceptions.
- **Views and interactions:** SOP inventory, training matrix, personnel-by-required-training status, overdue items and revision history.
- **Possible triggers:** New SOP version -> suggested retraining assignments; overdue acknowledgement -> reminder; approval/change requires explicit authorization.
- **Boundaries:** A tracking matrix is not a validated eQMS/LMS or proof of GxP-compliant training. Training acknowledgments do not become compliant electronic signatures without separately validated procedures/tools.
- **Comparable offerings:** Qualio and other established eQMS/training products.

## OPS-06 — Executive study reporting (P1)

- **User need:** Produce an intelligible, up-to-date sponsor-side picture of study and portfolio progress for management and governance meetings.
- **Timing/users:** CMO, Head of Clinical Operations, COO, finance and project leads; from planning through delivery.
- **Candidate information:** Authorized linked study/program records, milestones, vendor commitments, budget variances, open decisions and issues, document readiness and snapshot date; derivations must disclose assumptions.
- **Views and interactions:** Cross-project dashboards, charts, milestone timelines, status cards, executive summaries, filtered views, and versioned report components generated from current authorized records.
- **Possible triggers:** Scheduled summary of changed records, board/committee preparation, overdue-threshold notification or a new approved management snapshot.
- **Boundaries:** Charts are only as reliable as their source data, permissions and update cadence; no access to restricted fields, no invented live clinical metrics or clinical outcomes. Snapshot versus current live view must be labeled.
- **Comparable offerings:** Medidata/other CTMS dashboards and Microsoft BI/project dashboards.

## Later specification work

Decide each workflow's source of truth, contract/KPI semantics, dates/thresholds, risk severity definitions, evidence requirements, approval grants, reporting freshness, meeting-source rules, controlled-document boundaries and verification cases. No claim of full CTMS, eQMS or regulated records management.
