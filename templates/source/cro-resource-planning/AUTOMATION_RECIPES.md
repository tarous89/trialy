# Optional resource-planning automation — 1.0.2

No automation is required or enabled on installation. Read current read_app_automation_guide, read_automation_setup and list_app_automations before configuring an owner-approved definition. Use current tool schemas; never create a per-app ChatGPT Task or send email from ChatGPT. Failed setup does not affect the app.

## Weekly review

Stable authoring key: `cro-resource-weekly-review-v1`. Reuse existing IDs on retry/edit. Monday eligibility uses an owner-chosen IANA timezone and the shared runner; exact completion time is not promised.

Exact prompt: Review the coming eight weeks of authorized CRO resource records when source versions changed since the prior completed scan. Distinguish Confirmed, Tentative and Cancelled bookings; subtract only Approved unavailable time. Calculate Approved role demand on Active projects, matching confirmed coverage once per project/role/week, and confirmed overload by specialist. Cite source record IDs, versions and cutoff; propose at most five human staffing decisions. Do not change bookings, contact sponsors or approve a brief. Missing, denied, invalid, unknown-total or truncated sources yield partial/blocked, never a complete forecast. Only a complete unchanged scan may return no_update under an approved quiet policy. Return a management draft to the owner by default.

For requested persistence, review/create the optional CRO resource briefs table from `automation.schema.example.json`. Bind its actual ID/keys/schema version to the same app and automation with authorized access. Required scalar fields are name:text, authoring_key:text unique, cutoff:date, week_start:text Monday, week_end:text Monday, summary:text, evidence:text and status:select Draft/Approved. The authoring key combines app ID, planning Monday and source-version fingerprint. Use a separately approved, expiring reports-only write grant to create/update Drafts; otherwise prepare exact human review. Verify saved record ID/version and receipt before claiming a saved brief. Reconcile uncertain results instead of creating another record. Preserve previous data/coverage on failed or partial runs.

## Email after human approval

Stable authoring key: `cro-resource-brief-approved-email-v1`. One independently approved TrialAgents email action on the actual brief status field transition Draft → Approved. The research task must never approve its own output. Use no parallel schedule or after-research completion email. Require current Approved state, committed brief identity, current app access and explicitly selected authorized recipients. Owner is the default; database addresses grant no recipient permission.

Inspect supported trigger and placeholder schemas. Safe static subject: “CRO resource brief approved”. Safe static message: “A resource brief was approved. Open the linked TrialAgents app to review.” Use a supported trusted app link; do not invent record substitutions. No email on a Draft, partial/failed processing, no_update, revoked access or obsolete state. Platform coalescing and delivery limits apply; delivery failure never repeats successful research.

Disable/edit through platform Automations; outcomes in Logs. Preserve disabled state, suspend on app archive and never activate on restore/copy. Saved definition, enabled state, runner readiness and verified execution/delivery are separate facts.

## Manual use

Open and manage the five screens normally without a runner, brief table or email action. No source records or automatic writes are created by installing the template.
