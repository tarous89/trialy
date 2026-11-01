# 23 life-sciences templates — prepublication refinement review

**Status:** DRAFT / NOT PUBLISHED / NOT ACTIVATED. **Recorded:** 1 November 2026. **Authority:** [TEMPLATE_AUTHORING.md](../../../templates/TEMPLATE_AUTHORING.md) v1.3.6 and [APP_CONFIGURATION_AND_AUTOMATIONS.md](../APP_CONFIGURATION_AND_AUTOMATIONS.md). The preceding [23-app blueprint catalog](README.md) remains the functional scope.

## Requested outcomes and verified draft state

| Request | Refined prototype / source candidate | Not yet live / release gate |
| --- | --- | --- |
| Access Control owns selected app/tab permissions | Every screen has a stable candidate `accessId` and a review recommendation; no in-app permission editor | **BLOCKER:** arbitrary `frontend-js` sections still have app-level enforcement. Current backend supports registered `tabs[].accessId` only for **standard Vivid trackers**. Never present hiding a custom HTML tab as security. Implement server-verified per-section source/binding isolation or use standard-tracker protected screens before marketing per-tab controls. |
| Layout and style editing | Local standalone preview can rename/reorder/show/hide tabs, edit headings/descriptions, switch forest/ocean/plum themes and select primary table columns | **BLOCKER:** a `frontend-js` app's production Layout is source-defined. Current `ToolLayout` says custom source changes need a reviewed code update. Add a versioned, authenticated layout metadata model and trusted UI, with stable routes/accessId, source reconciliation, permission checks, revised preview, save/ignore, history and rollback. Local demo changes disappear on reload; they are not persistent. |
| Direct inline record editing | Cell click opens a field-native editor (text/number/date/select/etc), with Save/Cancel and existing `records.propose` exact-record-version review, no direct commit | **QA GATE:** verify actual backend fixture writes, optimistic stale-version conflicts, field restriction/revocation, mobile input focus and canonical Save/Ignore. No speculative save or bypass of field permissions. |
| One ChatGPT research/reporting definition per app | 23 app-specific objectives and cadence suggestions in the draft catalog `documentation.tasks` and review recipes | **NOT ACTIVE:** after app save, owner reviews an app-linked research definition in platform Automations. Use the **single shared ChatGPT runner / host schedule** for the workspace, not 23 consumer ChatGPT Tasks or HTML scheduler. Connection readiness and real unattended MCP rights still require verification. |
| One email notification definition per app | 23 separate proposed TrialAgents completion-email actions with stable authoringKeys and saved-app URL resolution | **NOT ACTIVE:** after app save, separately review authorized registered recipients/message. Email is a **dependent after-success action with no independent schedule**, triggered only on a verified qualifying ChatGPT research/report completion, not merely any DB save, timer tick or draft. Respect `no_update` silence policy, failures, owner authorization, rate limits, idempotency, and delivery receipts. Never email from HTML or ChatGPT. |

## Candidate apps and section access review

All screen IDs must remain stable on rename, move or layout revision. Restrictions **inherit and narrow** the app parent; database/field policy remains authoritative. The catalog proposes per-screen restrictions but **none are enforceable on custom source until a trusted backend section boundary exists**.

| Audience | Apps (one research/report definition + one completion-email action each) | Usually high-restriction screens |
| --- | --- | --- |
| Biotech (6) | Investor CRM; Partnership Tracker; Cash Runway; Hiring & Resource Management; CRO Selection; Project Oversight | investor contacts, commitments, financial actuals/scenarios, staffing candidates, proposal comparisons, project risks/decisions |
| Sponsor ClinOps (6) | RFP Management; CRO Oversight; Site Feasibility Management; Investigator CRM; Trial Regulatory Submission; Trial Monitoring & Pharmacovigilance | bids/evaluations/awards, confidential CRO performance, study-specific questionnaires, investigator interactions, regulatory submission dossiers, monitoring findings/PV agreement obligations |
| CROs (6) | RFP Management; Resource Planning; PI Network Management; Site Feasibility Management; Sponsor Updates; Client Signals & CRM | sponsor bids, staff allocations, PI engagement, sponsor-specific feasibility responses, sponsor reports, commercial contacts/signals |
| Researchers (5) | Experiment Notebook; Inventory Management; Literature Radar; Grant Pipeline; Publication Management | experiment results, purchasing approvals, restricted research questions/notes, unpublished proposals, author/reviewer drafts |

**Privacy/safety:** no patient-level data, ICSR/SAE case processing, human specimen provenance or mandatory third-party app integration. Investigator and employee details still require normal professional-contact/HR privacy restrictions. Do not auto-copy restricted context into a less protected dashboard or report.

## New-entry discovery and completed-update notifications — 1 November refinement

For the **11 discovery-dependent templates**, the authoritative [discovery/update completion contract](DISCOVERY_UPDATE_COMPLETION_CONTRACT.md) now requires ChatGPT to search for **new entries first**, deduplicate against saved records, commit eligible new records under separately approved type-specific permission, and **only then** complete the durable run. The backend's `automation_occurrences.finished_at` UTC instant supplies **Update completed at [timestamp]**; `last_success_at` and source coverage are updated after a verified completed or no-update check.

The app's separately approved TrialAgents notification uses the same occurrence's `completed` dependency and the proposed opt-in `completionRequiresSavedChanges:true` gate. **No independently scheduled email.** Only `completed` with `savedChanges>0` sends a new-records email with server completion timestamp, saved-count, summary and trusted app link. A completed no-findings scan is `no_update` (successful check timestamp, no email); partial/blocked/failed and save proposals cannot generate a finished-update email. This remains **draft and unactivated**.

The other 12 templates remain report/internal-analysis workflows. Their successful reviewed report completion may still justify an email even when no database records changed; the new gate defaults off for backward compatibility.

## Automation lifecycle (must be configured on TrialAgents, not inside app)

1. Save and reopen the **actual app ID**, with approved bindings, stable access and source; failure to configure optional automation must not block app use.
2. Owner reviews one `research` / ChatGPT-processing definition linked to app: explicit records/source criteria, timezone and cadence (daily/weekly/monthly as appropriate), inclusion/exclusion, dedupe key, write destination, expiry, no-result behavior, and report requirements. Reuse existing definition/authoringKey if present.
3. Verify shared runner setup via the current host and `read_automation_setup` / `read_app_automation_guide`; use the **shared** scheduled check, not a new consumer task per app. Never claim model/reasoning preference was configured unless host confirms it.
4. The runner claims a bounded occurrence, reads only authorized records, uses ChatGPT for web research and synthesis, stages changes, persists only with reviewed valid grants and stable request keys, saves a report if permitted, and finishes with verified receipts. `completed` and `no_update` have different email consequences.
5. Owner separately reviews one TrialAgents email action with approved recipients, verified canonical app URL, explicit completion dependency and the agreed notification policy. **No second email schedule.**
6. A qualifying successful processing completion invokes that action once, only after durable run receipts. Resend/provider acceptance does not prove final delivery. Failures/no-update are silent unless the approved policy explicitly permits a failure alert. Preserve access and duplicate-send limitations.
7. Both definitions appear in platform **Automations** (not on the HTML interface), with Enabled/Disabled and Edit; actual runs and delivery outcomes appear in **Logs**. Disable/archive must fence future execution without erasing app data.

## Demonstration / QA evidence

- Draft standalone collection: **23 HTML files / 143 screens** and a gallery. Representative fictional records, not a customer account. Local layout editor is intentionally demo-only.
- **23/23 Chromium desktop/mobile interaction checks passed**: tab navigation, local layout preview, inline edit, local review workflow; no reported page JS errors or horizontal overflow at 390px.
- **23/23 catalog JS source compilation checks passed** using the isolated JavaScript source shape.
- **23 catalog JSON candidates** adhere to current authoring field schema and source length constraints, but **not yet installed in `templates/apps`**. They must not be treated as published catalog records.
- **23 ChatGPT definition recommendations** and **23 after-completion email-action recommendations**, all proposed/inactive; no email sent.
- Remaining acceptance: actual app save/reopen and server-permission QA, platform Layout persistence, server-enforced custom section isolation, ChatGPT shared-runner unattended run + read/commit receipts, completion-linked email job + delivery evidence, mobile/zoom/accessibility and no-data/no-task cases.

## Release decision

**Do not publish, deploy or activate as production templates yet.** Choose between (A) enhancing `frontend-js` with trusted section-bound mappings + persistent layout metadata; or (B) using Vivid tracker for protected/editable record tabs while restricting custom visualization interfaces to a separately controlled app-level area. Never silently loosen access or claim a local visual editor is saved to TrialAgents.

This review note records refinement implementation and the remaining gates; **it is not itself a template installation**.
