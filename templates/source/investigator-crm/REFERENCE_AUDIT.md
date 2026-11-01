# Reference and original implementation audit

**Agreed blueprint:** `docs/product/app-template-blueprints/CLINICAL_OPERATIONS.md`, **CO-04 Investigator CRM**, read from `tarous89/trialy` on 2026-11-01. Primary users: sponsor ClinOps, medical liaison and engagement managers; scope limited to public professional PI identity/institution affiliations and authorized human relationship notes.

**SaaS benchmark:** Veeva Vault CTMS investigator/site relationship management. Product page: https://www.veeva.com/products/veeva-ctms/ (current Veeva page refers to interactions linked to CRM for a 360-degree view). Product sheet: https://www.veeva.com/wp-content/uploads/2020/08/Vault_CTMS_EU_Datasheet_v17.pdf (investigator interaction and site-communication history). No proprietary UI, graphics or text has been copied.

**TrialAgents contract:** `templates/TEMPLATE_AUTHORING.md` and `templates/TEMPLATE_USAGE.md` version 1.3.9, and `src/workspace/app-templates.ts` + `src/shared/custom-layout.ts` current inspected repository versions. The prototype's source has native layout declaration and no duplicate host-injected config/bindings. No logo in app content; the trusted platform watermark carries the official TrialAgents logo/link.

**Original design choice:** relationship/contact-book architecture, not an enterprise CTMS or generic four-KPI dashboard. Deep-plum network visualization; searchable investigator dossier; institution-linked people index; chronological engagement feed; paper-like entry form; source-linked research queue. Every screen has one h1/subline and unique primary information shape.

**Boundaries:** No patient-level data, individual clinical records, medical case reports, personal email scraping, automated PI outreach, regulatory/e-signature claims, public identities from invented preview records, or independent app auth/roles. Product reference is for workflow intent only; authoring/integration acceptance requires host verification.
