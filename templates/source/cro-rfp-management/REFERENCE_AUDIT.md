# Professional SaaS reference audit — Loopio

**Reference product:** Loopio (RFP Response Management). The relevant established work patterns are central reusable approved response content, assigning RFP questions to subject matter experts, per-question completeness/approvals and structured proposal review. These are not original TrialAgents features copied verbatim; the product UI, logo, wording, screenshots and code are not reused.

The uploaded design identifies Loopio as a workflow reference. Vendor ratings and market claims are not required for this template and are not asserted by this release. No vendor code, images or logo are packaged.

**Repo benchmark/contract:** `docs/product/app-template-blueprints/CROS.md` → `CR-01 RFP Management (6 screens)`; `docs/product/app-template-blueprints/DESIGN_AND_BUILD_CONTRACT.md`. Current authoring/usage guidance in `templates/TEMPLATE_AUTHORING.md`, `templates/TEMPLATE_USAGE.md`, version 1.3.8.

**High-value Loopio patterns kept, simplified for a small CRO:**

| Reference pattern | Simplified TrialAgents implementation |
|---|---|
| Project deadline tracking | 1-page pipeline/deadline overview with bid/no-bid checkpoints |
| SME question assignments | Question matrix with section/owner/due/source and review progress |
| Library/answer reuse | Versioned approved content cards, review-due flag and copy-as-draft into authorized question |
| Section review workflow | Scientific/Operations/QA/Finance/Legal sign-offs with dated evidence and finance gate |
| Proposal drafting | Internal reviewed narrative and exact approved source IDs, with ChatGPT draft instructions |
| Completion and release | No false ready/submit; mandatory answers + reviews + approved proposal + manual send record |

**Deliberate exclusions for teams below 50 FTE:** multi-tenant bid portals, bulk RFP inbox parsing, ERP/CRM sync, complex template permissions, enterprise multi-entity approval routing, e-signatures, automated client emailing, regulated patient data. This is CRO **seller-side** bidding, not sponsor procurement or vendor ranking.
