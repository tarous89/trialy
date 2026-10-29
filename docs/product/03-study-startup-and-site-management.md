# C. Study startup and site management

**Status:** Candidate use cases only; detailed functional/technical specs TBD.  
[Catalog and universal guardrails](README.md) · [Active architecture](../../README.md)

**Lifecycle:** Feasibility, selection, document collection and activation. **Typical users:** Sponsor Clinical Operations/CTM or CRO startup/feasibility teams. **Applicability is not universal:** A small biotech using a full-service CRO may only need oversight summaries; a sponsor may directly run these processes only under some outsourcing models.

## START-01 — Site/PI identification and selection (P2)

- **User need:** Maintain an evidence-backed shortlist of candidate sites/investigators and compare feasibility/selection decisions.
- **Timing/users:** Feasibility Lead, ClinOps, CTM and/or delegated CRO; mainly before multicenter patient-study startup, but study/phase-dependent.
- **Candidate information:** Site organization, location, PI/person relationships, relevant *documented* trial experience, outreach status where requested, feasibility replies, resources/capabilities, constraints, scoring criteria and selection rationale.
- **Views and interactions:** Site/PI list, filterable comparison matrix, site feasibility form, review queue and geographic distribution *only where authorized locations are available*.
- **Possible triggers:** Questionnaire response -> exact reviewable update; preferred-site decision -> proposed startup task/checklist; unanswered request -> reminder draft.
- **Boundaries:** TrialAgents cannot infer investigator qualifications, site recruitment potential or site availability from an empty tracker. Preserve affiliations as dated/contextual relationships, not duplicate investigator profiles. No patient data.
- **Comparable offerings:** Veeva Study Startup feasibility, TrialHub site/country intelligence.

## START-02 — Site activation tracker (P2)

- **User need:** Track what remains between site selection and authorized activation, identifying blockers and dependencies.
- **Timing/users:** Sponsor CTM, CRO startup teams, regulatory/startup staff; after site selection and before enrollment can start.
- **Candidate information:** Country/site reference, required submissions/approvals, contract/essential-document checklist, assigned owners, targeted/actual dates, dependencies, issue flags, versioned evidence and operational activation status.
- **Views and interactions:** Site-by-milestone grid, Kanban/status view, activation timeline, blocker dashboard and document completion indicators.
- **Possible triggers:** Site selected -> **proposed** starter tasks/checklist; missing approval -> escalation draft; all defined readiness criteria met -> human review prompt, not assumed regulatory greenlight.
- **Boundaries:** This is sponsor/CRO coordination, not ethics/regulator submission, automatic trial-site authorization or validated regulatory decision logic. Local country requirements require separately validated content.
- **Comparable offerings:** Veeva Study Startup country/site checklists and activation milestone tracking.

## START-03 — Study document completeness (P1)

- **User need:** See expected versus actually received operational documents and identify missing, expired or pending review items.
- **Timing/users:** Sponsor/CRO CTM, clinical document coordinator, Regulatory/Quality; from startup through study closeout.
- **Candidate information:** Study/vendor/site links where applicable, expected-document type, required-by date, responsible person, version reference, received date, review state, expiry/renewal, missing-item reason and request history (only in approved scope).
- **Views and interactions:** Completeness matrix, missing-document work queue, document detail/linked original, due-date calendar and readiness summary. Show evidence and authorized source access.
- **Possible triggers:** Uploaded/linked document -> proposed checklist update; due/expiry -> reminder; reviewed version supersedes earlier reference with preserved historical version/approval trail.
- **Boundaries:** A document checklist alone is **not** a compliant eTMF, TMF reference-model implementation, archival repository, GxP-certified quality system or validated e-signature workflow. Original files are never overwritten by extracted metadata.
- **Comparable offerings:** Kivo clinical document tracking and Veeva eTMF completeness workflows.

## Later specification work

Clarify sponsor vs CRO ownership, stage/checklist assumptions, study phase, source of site/PI evidence, geography, access to investigator data, validated systems integration, document taxonomy, readiness rules, and how to prevent any accidental patient-data capture.
