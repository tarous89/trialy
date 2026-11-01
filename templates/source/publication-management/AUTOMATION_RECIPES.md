# Optional Publication Management automations

No background job is required or activated by this package. Save the app first. Read current setup and automation guides, inspect existing definitions, and retain stable IDs, authoring keys, current app version, access scopes, approved expiry and disabled state. Definitions are edited through TrialAgents Automations; outcomes belong in Logs. Never create one ChatGPT Task per app or send mail from generated source.

## Weekly progress review

Use `publication_progress_review_v1` with the shared owner/workspace ChatGPT runner. Suggested timing is Monday 09:00 in the owner's confirmed IANA timezone, with an approved anchor and expiry. Prefer supported Work chat, high reasoning and the latest most capable available model, while reporting actual host settings as unverified unless observed. Setup failure leaves manual tracking usable.

Read all authorized project, manuscript, author, review, outlet, milestone, submission and report records to complete coverage. Compare manuscript UUID + draft version + reporting period against the prior successful report. Check current-version acceptance, actual review decisions, source-dated outlet instructions, confirmed submission events and actual DOI/date publication evidence. Draft one internal report with exact manuscript UUID references, cutoff, limitations and unresolved work. Never manufacture approvals, submission confirmations, DOI values or journal correspondence. Save only under separately approved existing report-write scope, otherwise return a proposal for review. An automation draft is never a Reviewed report. Reconcile committed receipts before retrying.

Prompt: Review my authorized saved Publication Management project through the approved cutoff. Verify complete source coverage and current-version author and reviewer decisions. Draft an internal progress report with exact manuscript record IDs, dated official target links, confirmed submission/publication outcomes and explicit risks or missing evidence. Do not infer completion from planned dates. Propose a report in Draft for human review; do not email or submit to a journal.

Complete coverage with no material change produces a documented no-change result; silence via no_update needs an owner-approved quiet policy. Partial, denied, expired or failed reads are blocked/partial, never success or no_update. Missed windows coalesce under the current shared-runner contract, preserving the last successful cutoff. Deduplicate by app/project + manuscript/version + reporting window, and reconcile report receipts after ambiguous responses.

## Optional separate report-review email

Only if explicitly approved, use `publication_reviewed_report_email_v1` and `automation.example.json` after substituting actual saved IDs, app version, mapped status/archived fields, approved expiry, and registered owner plus explicitly selected authorized teammates. It is one TrialAgents email step triggered by reports.status entering Reviewed, rechecking archived is not true. It has no second timer and no research completion email attached to the monitor. The prompt-created Draft does not trigger it.

Subject: Publication report reviewed

Body: Open https://platform.trialagents.com to review your authorized publication report.

Use fixed text. Never infer recipients from contributor or reviewer names/address columns. The platform rechecks current data/access and coalesces bursts with its two-minute delay, hourly recipient and daily account limits. Obsolete work or revoked recipients cancel; normal limits defer. Delivery failure does not rerun successful research. Editing keeps disabled state and hidden settings. Archive suspends background work; restoring/copying does not activate it. Do not add a separate delete action or expose scheduler controls in the app.

## Manual use

Create the eight mapped tables and seven-screen app with no runner, automation or email. Staff enter drafts, sign-offs and actual events through reviewed forms and use the Reports prompt on demand. App loading, navigation and record saves make no automation calls. Saved app, ready runner, completed research and delivered email are separate outcomes.
