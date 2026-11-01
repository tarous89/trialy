# Optional automation instructions - CRO Oversight v1.2.1

**Default = NO AUTOMATION.** This app opens immediately with authorized records and requires no scheduler, email setup, connector or external CRO account. The platform provides authentication, official logo watermark, access and logs.

## A. Weekly ChatGPT oversight synthesis (optional, owner approval required)

- **Authoring key:** `life.cro-oversight.sponsor-weekly-review.v1`
- **Type:** ChatGPT research/analysis on TrialAgents shared owner/workspace runner (not a separate ChatGPT Task per app)
- **Trigger:** weekly on Monday, Europe/Berlin, only after the owner explicitly accepts the schedule and runner setup is verified; no guarantee about processing at an exact time
- **Authorized input:** current app-bound CRO engagements, work packages, KPI observations, operational issues, governance actions and approved earlier reports. Bound/read scopes inherit platform access; always recheck current permissions and honor the 800-row bounded source limitation.
- **Exact instructions:** Read source rows page by page with committed record IDs, versions, evidence cutoff, author and source URLs. Analyze current engagements: accepted on-time / accepted with agreed due+accepted date; baseline changes versus approved revised due dates; per-KPI actual/target/direction/unit/period and source confidence (CRO-reported vs sponsor-verified); open issue severity, aging, overdue mitigation, and independent sponsor-verified closure; overdue governance actions; changes versus the last approved report. Identify critical blockers and actionable sponsor decisions. Never interpret absent KPI values as zero, never count unreviewed deliverables as accepted, never claim sponsor closure solely from a CRO 'done' state. Avoid patient/subject information, safety cases and regulatory claims. Produce a concise evidence-linked Draft report with specific due dates, owners, data gaps and references to saved record IDs. Use idempotent key `(appId, engagementId, cutoff, reportType=sponsor_weekly_review)` and the existing approved app-scoped report write grant only; otherwise prepare the exact human review. Verify committed report ID, version and write receipt before marking any change saved. Reconcile a lost response using the original request key. One fully covered scan with no substantive new change returns `no_update` and advances a verified check timestamp, not a report. Partial/blocked/denied/failed scans do not advance coverage and cannot trigger email. Call `finish_automation_work` with authoritative server timestamp and saved-change count only after completion. Do not send email, create accounts, open an external CTMS or modify source clinical records.
- **Output:** one reviewed Draft `reports` record with `name, projectId, period, cutoff, status=Draft, owner, summary, evidence` containing source record IDs and official source URLs. Record statuses belong to the platform Logs/Automations page.
- **Access/grants:** `inheritAppAccess:true`, current authorized read fields; ongoing write grant is separate, explicit, limited to `reports` and never implied by enabling automation. Preserve disabled status after edits, copies and archives.

## B. Dependent TrialAgents email after a verified saved report (optional)

- **Authoring key:** `life.cro-oversight.email.after-review.v1`
- **Type:** TrialAgents Email action, not ChatGPT email.
- **Trigger:** trusted after-success/manual dependency of A only. **NO independent schedule.** Trigger iff `status=completed`, report write successfully committed, `savedChanges > 0`, and saved report ID/UTC completion timestamp/allowed recipients verified.
- **Recipient:** current app owner by default and only separately approved existing TrialAgents team members with current permission. Never CRO emails or contact-field addresses.
- **Subject:** `CRO Oversight — new sponsor review ready ({cutoff})`
- **Message:** `A new sponsor oversight report has been saved for {engagement_label} and cutoff {verified_cutoff}.
Updated: {server_completed_at_utc}.
Saved changes: {committed_count}.
Summary: {verified_one_sentence_summary}.
Open in TrialAgents: {trusted_app_url}`
- **No send on:** `no_update`, zero saved changes, proposal-only, partial, failure, denied permission, expired scope, stale recipients, unapproved or missing report receipt. Email delivery retries must not rerun research or re-save records. Backend coalescing, hourly/day recipient limits and revocation checks apply.

## C. Standalone deterministic email example (alternative; optional)

- On a trusted `requirements.severity` transition to `Critical` **and** `status` not `Closed`, prepare a reviewed TrialAgents email to the owner and expressly approved team members. Require valid changed record, verified new critical state and authorized recipient at dispatch; no patient information and no blanket 'any update'. Do not duplicate this alert through both A/B and C. Do not send from app HTML.

## D. No-automation example

`Create CRO Oversight, connect my authorized work packages and issues, and show the six screens. Keep all automations disabled and do not schedule research or email.` The app is fully functional; subsequent automations are optional setup through TrialAgents Automations.

## 1.2.1 executable contract

Use `schema.example.json` for platform-valid fields and `schema_mapping.example.json` for logical mappings. Set every mapped field to `multiple:false`. `project_id` uses `kind:text` and an actual saved engagement UUID; native relationship arrays need an explicit adapter. Choices use `select`; narrative/reference fields use `text`. Bind every mapped field with its current schema version and permitted manifest mode. Original edit/archive versions are retained. Engagement archive fails when any child source or its reference/archive fields cannot be read completely. Denied, short, unknown-total and truncated reads are incomplete, never verified zero.

Inspect the current email placeholder and trigger schemas before preparation. The example substitutions/compound conditions are conceptual, not a promise of executable support. If substitutions are unsupported, use “CRO Oversight report ready” and “A sponsor report was saved. Open CRO Oversight in TrialAgents to review.” with a supported trusted app link. If the compound Critical-state condition is unsupported, leave that optional rule unconfigured; never silently broaden it. Approve reports-only ongoing writes with an explicit expiry; otherwise return a draft for review. A missing or incomplete source is partial/blocked, not no_update. Quiet no_update requires the approved policy. Disable/edit in Automations, outcomes in Logs; preserve disabled state, suspend on archive and never activate on restore/copy.
