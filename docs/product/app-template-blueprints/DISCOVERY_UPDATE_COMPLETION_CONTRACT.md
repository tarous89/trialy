# Discovery and data collection — run completion and email dependency (draft)

**Status:** Prepublication refinement, not activated. **Date:** 1 November 2026. Applies to the 23-app [candidate catalog](README.md) and the [prepublication review](TEMPLATE_PREPUBLICATION_REVIEW_2026-11-01.md). Conforms to [TEMPLATE_AUTHORING.md](../../../templates/TEMPLATE_AUTHORING.md) v1.3.7 and the [shared automation engine](../../scopes/APP_AUTOMATION_ENGINE_2026-10-31.md). This is a *template-level requirement* for applications whose main AI job is ongoing discovery and collection, not reporting-only apps.

## Default monitored-collection sequence

**User intent:** When they enable monitoring, ChatGPT searches for **previously unknown eligible records** and saves them to the appropriate authorized TrialAgents table. Once a run has finished with committed new findings, the TrialAgents automation engine records the exact server completion time and triggers one separately approved email **after that completion**.

1. **Due/triggered:** TrialAgents schedules an app-linked research definition, serviced by the existing **single shared ChatGPT runner** for its connected owner. Do not create one consumer ChatGPT scheduled task per app or store task configuration in a generated HTML screen.
2. **Load current scope and checkpoint:** Claim an eligible occurrence, read saved app identity, current allowed types/fields, last verified successful coverage, deduplication identities and prior source evidence. Do not confuse a partial page with all records or requery all history at every run. Use a source overlap window to catch delayed publications.
3. **Find NEW entries first:** ChatGPT performs current public search across approved primary sources, using eligibility/inclusion/exclusion criteria. Collect original URL, source date, date observed and factual evidence. Rank newly discovered candidates before summaries of existing entities. No patient data or required external app integration.
4. **Deduplicate and save:** Compare with existing records by a stable domain-specific key (DOI/PMID; funder+call ID; company official domain+event+date; investigator public identifiers; institution identity; official authority guidance URL+edition). Create new records in the **approved destination table** using schema-valid values, reviewed exact changes or an unexpired single-type standing write grant and stable idempotent request keys. Enriching existing entries is secondary. If access is blocked or only a proposal exists, never count it as a save and do not claim the update is complete.
5. **Verify completion:** Reconcile every database receipt. Only a fully completed source window can advance the durable coverage cursor. Finish once through `finish_automation_work`. The server records `automation_occurrences.finished_at` (UTC ISO timestamp), `automation_dispatch.last_success_at`, a run/occurrence ID and receipt-derived `savedChanges`. `last_success_at` records a successful check, even if no changes were found. The user-visible **“Update completed at [timestamp]” is derived from this backend completion metadata, never guessed by ChatGPT or written to a synthetic trigger flag in an app table**.
6. **Send after confirmed update:** The **separately owner-approved** TrialAgents email action has a manual trigger and an explicit `completionActionId` / `completionActionVersion` dependency on the app's research definition. **No independent email timer or broad table-update trigger.** A collecting recipe sets `completionRequiresSavedChanges:true`. The worker queues the action only for terminal `completed` with **verified `savedChanges>0`**. It sends through TrialAgents with approved registered recipients and the trusted saved-app URL; queueing happens only *after* the finished and committed run is recorded.
7. **No findings / failures:** A fully covered window with no qualified additions reports `no_update`, advances last-successful-check coverage, and does **not** send an empty “new entries” email. `partial`, `blocked`, `failed`, grant expiry, unverified saves and interrupted runs do not advance coverage or notify as completed. A completed run incorrectly reporting zero receipts is also suppressed by backend `completionRequiresSavedChanges` gate. Owner can inspect outcomes in Automations and Logs and retry safely without duplicate emails.
8. **Email limits:** TrialAgents' existing 2-minute settling/combining delay, approved-recipient access recheck, one email per normalized recipient per rolling hour, daily account recipient limit and provider delivery receipt rules remain in force. Successful update != immediate email delivery. A failed email **never reruns** finished research or repeats committed DB writes.

## Candidate scope — 11 applications

| Audience | Application | Intended *new* record | Recommended dedupe key |
| --- | --- | --- | --- |
| Biotech | Investor CRM | Qualified investor fund or public investment evidence | Fund official domain + identity + source |
| Biotech | Partnership Tracker | Partner prospect or newly documented partnership signal | Partner domain + source URL + date |
| Biotech | CRO Selection | CRO vendor prospect/capability evidence | CRO official domain + country |
| Sponsor ClinOps | Site Feasibility Management | Institution candidate or capability evidence | Institution official identity + country |
| Sponsor ClinOps | Investigator CRM | Public professional investigator / trial or publication evidence | Verified professional ID + affiliation / source |
| Sponsor ClinOps | Trial Regulatory Submission | New official authority guidance / change reference | Authority + official guidance ID/URL + effective date |
| CROs | PI Network Management | Public PI profile, study/publication evidence | Verified PI identifier + source registry ID |
| CROs | Site Feasibility Management | Reusable institutional site candidate | Institution official identity + country |
| CROs | Client Signals & CRM | New biotech lead and/or funding, trial, partnership signal | Company domain + event category + original URL + date |
| Research teams | Literature Radar | New scientific publication | DOI > PMID > title+journal+date pending review |
| Research teams | Grant Pipeline | New funding call | Funder + official call ID/URL |

Other shortlisted apps primarily synthesize **existing customer-entered records** and should retain their existing reporting-based completion contract. Do not invent public discoveries or insert irrelevant rows just to produce an email.

## Candidate versioned definition (not active)

The backend already stores the owner-scoped research definition and the separate email action. Only the following new, narrowly scoped attribute is proposed in `sharedAutomation`; it defaults `false` for legacy/reporting automations.

```json
{
  "automation": {
    "runnerId": "<approved shared runner UUID>",
    "trigger": {"kind":"calendar","frequency":"weekly","time":"06:00","timeZone":"Europe/Berlin","anchor":"2026-11-02","interval":1,"weekdays":[1]},
    "completionActionId": "<separately reviewed manual email action UUID>",
    "completionActionVersion": 0,
    "completionRequiresSavedChanges": true
  }
}
```

These identifiers are illustrative placeholders, not to copy into real app configurations. Maintain original monitor/app/authoringKey identities and reconcile existing reviews. An approved account user must create this configuration through platform Automations; template installation never grants authority.

**Email template**, configured as one approved TrialAgents action step, with engine-supplied immutable completion context:

```text
Subject: TrialAgents: [App name] — research update completed

Update completed at: {{steps.research.completedAt}} (UTC)
Saved changes: {{steps.research.savedChanges}}
Run: {{steps.research.runId}}

Summary: {{steps.research.summary}}
Open app: {{steps.research.appUrl}}
```

These fields are populated by the backend from the actual durable occurrence: `completedAt` from DB `finished_at`, `savedChanges` from verified monitoring receipts, and `appUrl` from the app ID/trusted platform origin. Do not treat a model-provided count as an authoritative count of **new** records if it includes field edits. The count is correctly called **saved changes**. A distinct created-records count requires a verified creation-specific receipt metric in a later iteration.

## Release acceptance (not yet passed)

- **Receipt safety:** completed with zero receipts = no completion email (even if model misreports status); completed with verified saved receipt = at most one action/email per occurrence; `no_update`, `partial`, `blocked`, `failed` = no completion mail. Retry of the same occurrence never inserts duplicates or repeats an accepted email.
- **Timestamp accuracy:** email `steps.research.completedAt` exactly reflects the server `finished_at` UTC instant; Logs and Automations show the corresponding finished run. Do not show the scheduled due time or source publication time as completion time.
- **Email:** approved recipient and app/data access rechecked before queueing/delivery; link opens *that saved app*; throttling and provider receipts are separate from research status.
- **Dedupe:** repeat same publication/announcement/call/investigator does not create another record; source corrections either create reviewed observations or update authorized fields.
- **Failure and approvals:** missing/expired scope causes blocked/partial state, no last-success advance, no notification; proposals never masquerade as committed records.
- **Backward compatibility:** old reporting-only monitors continue to send on completed reports without DB changes; new gate is opt-in on collection recipes.
- **Host QA:** actual unattended ChatGPT MCP event/claim/read/write/finish cycle must be demonstrated under the intended connection before enabling any default email automation; no production activation in this draft.

**Implementation locations in the draft PR:** `src/automations/schema.ts`, `src/automations/worker.ts`, `tests/shared-automations.test.ts`. Draft template JSON/HTML samples are supplied separately as a review bundle and are **not installed in the production template catalog**.
