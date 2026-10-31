# TrialAgents — 23 candidate biotech application blueprints

**Status:** Detailed product/design scope only. Nothing in this directory is an installed template, implemented app, production workflow, certification or permission grant. **Recorded:** 31 October 2026. **Source:** User-approved shortlist and screen proposals, adapted to the current TrialAgents/Vivid runtime; benchmark products are design/workflow references, never code/assets to copy.

## Contents and audience

| Audience | Application specifications | Number |
| --- | --- | ---: |
| Biotech founders, executives, BD, finance, PMO | [Biotech](BIOTECH.md): Investor CRM; Partnership Tracker; Cash Runway; Hiring & Resource Management; CRO Selection; Project Oversight | 6 |
| Sponsor clinical operations and study management | [Clinical operations](CLINICAL_OPERATIONS.md): RFP Management; CRO Oversight; Site Feasibility Management; Investigator CRM; Trial Regulatory Submission; Trial Monitoring & Pharmacovigilance | 6 |
| CRO sales, bids, delivery, feasibility and resourcing | [CROs](CROS.md): RFP Management; Resource Planning; PI Network Management; Site Feasibility Management; Sponsor Updates; Client Signals & CRM | 6 |
| Nonclinical laboratories, academic science and research management | [Research teams](RESEARCH_TEAMS.md): Experiment Notebook; Inventory Management; **Literature Radar**; **Grant Pipeline**; Publication Management | 5 |
| Universal visual, data, AI and acceptance requirements | **[Shared design and build contract](DESIGN_AND_BUILD_CONTRACT.md)** | All 23 |

**Naming decisions:** “Grant Management” → **Grant Pipeline**; “Publication Radar” → **Literature Radar**. **Protocol Library is not a standalone shortlisted application** (protocol references may appear *within* Experiment Notebook). The total stays 23.

## Why these exist

These are scoped **4–8-screen starting applications** for small biotech, CRO, clinical operations and nonclinical research teams, not full SaaS replacements. Each specification defines users and job-to-be-done, an existing market benchmark, business records, screens with exactly four primary capabilities apiece, deliberate graphic and icon direction, workflow, ChatGPT responsibilities, safe automation, scope limits and testable completion criteria. Apps retain independent identity and can share authorized organization, person and project records.

The original, separate [11-function showcase plan](../TEMPLATE_SHOWCASE_PLAN.md) remains a historical general discovery document. These 23 user-selected candidate product demos provide more specific functional scope. They **do not replace** the TrialAgents platform foundation or require a fixed clinical schema.

## Boundaries — must pass before marketing an app as functional

1. **No patient-level information.** No patient records, screening logs, subject IDs, visit-level payments, human biospecimen provenance, case narratives, ICSR/SAE data, PHI or identifiable individual adverse-event material. Aggregate study/organizational facts are allowed. PI professional contact data is distinct from patient data; apply normal contact access/privacy rules.
2. **No mandatory external system.** Each useful core workflow must work with manually entered and customer-authorized TrialAgents data. Google/Microsoft, email, ATS, CTMS, eTMF, regulatory, finance, PubMed, journal, inventory supplier and other connections are optional upgrades. Never imply a supplier/authority integration exists when it does not.
3. **ChatGPT handles intelligence.** Web search, new-company/PI/paper/grant discovery, monitoring, qualitative interpretation, long-form document comparison, report drafting and LLM analysis happen in ChatGPT—not generated app JavaScript or a hidden TrialAgents LLM service. A report screen displays *saved reports* and can offer a ChatGPT workflow; it is not a local model runner.
4. **Prefer ChatGPT scheduling.** After app creation, optionally offer to configure a recurring ChatGPT Task. Use it **only** if the actual task environment can access TrialAgents MCP and perform the authorized read/propose/save operations. This has not been validated end to end; provide a clear manual-run alternative, never a pretend “active” schedule. TrialAgents functions can handle deterministic computations and supported events but not web research/LLM reasoning.
5. **Every write is governed.** Exact record previews and human confirmation by default. Explicit, limited, expiring, revocable type-specific standing authorization may allow subsequent in-scope updates. Preserve per-field histories, source labels, versions, audit trails and current human/AI access. External communication and signatures require separate authority.
6. **No regulated platform claim.** Regulatory readiness, TMF/PV oversight and experiment documentation are operational coordination aids—not validated CTMS/eTMF/EDC/ICSR/eCTD, legal signoff, compliant electronic signatures or GxP certification.
7. **Don't clone the benchmarks.** Refer to proven workflow structures and interaction conventions; original UI, icons, copy, graphics, code, datasets and branding are not reused.

## Current platform context (as inspected)

- [Dynamic app templates](../DYNAMIC_APP_TEMPLATES.md): versioned publisher-owned JSON templates in `templates/apps`, `list_app_templates` / `read_app_template` / `prepare_app_from_template`, reusable Vivid tracker or bounded `frontend-js`. New same-engine templates can be deployed server-side without changing plugin package.
- [App design quality](../APP_DESIGN_QUALITY.md): `read_app_design` exposes Inter-first app defaults, semantic palettes and desktop/mobile readability checks. Requested theme changes may override style; never modify the authoritative Vivid stylesheet as a side effect of scoping.
- [Vivid reuse contract](../../../plugin/trialy/skills/trialy-tracker-design/references/TEMPLATE_REUSE.md): headings, tabs, stat cards, editable tables, details drawer, forms, layout/access and semantic pills. Honor stable table fields and source provenance.
- [Write authorization](../../WRITE_AUTHORIZATION.md) and [Execution](../../EXECUTION.md) govern saves and schedules.
- [Application scope](../APP_PLATFORM_SCOPE.md): generic HTTPS connector exists, but workers cannot invoke it without a future explicit worker grant, and isolated functions have no network or LLM access.

## Suggested design/build order

1. **Core patterns:** Investor CRM (CRM); Cash Runway (scenario charts); CRO Selection (weighted comparison); Resource Planning (capacity timeline); Client Signals & CRM (ChatGPT research/monitoring); Experiment Notebook (nonclinical science).
2. **Shared primitives:** dashboard/stat cards, record tables/details/forms, pipeline, timeline, comparisons, report archive, research queue, approved write preview and application-scoped monitoring guidance.
3. **Remaining 17:** configure their 4–8 screens using the same primitives, refine their fields/charts and validate their business-specific workflows without installing hardcoded modules.
4. **Release gate:** develop each template as a new immutable version; test one end-to-end save/open/edit/review/reopen flow and mobile, keyboard, empty/error states before marking “ready”.

## Landing-page demonstration contract

Marketing previews should tell a true four-frame story: (1) attractive summary with 1–3 dark KPI cards and simple outline icons; (2) real domain tracker with filters; (3) meaningful form/selection/assignment action; (4) source-backed chart or ChatGPT-prepared report. **Use fictional, explicitly labeled sample data**. A static storyboard may illustrate a proposed workflow, but must not masquerade as a fully functioning deployed app or a ChatGPT task that has never run.
